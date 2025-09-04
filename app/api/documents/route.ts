import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { NotificationType } from '@prisma/client';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Utility function to upload file to Cloudinary
async function uploadToCloudinary(file: File, folder: string = 'documents') {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        public_id: `${folder}/${uuidv4()}`,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    
    uploadStream.end(buffer);
  });
}

// Utility function to delete file from Cloudinary
async function deleteFromCloudinary(publicId: string) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

// GET /api/documents - Get all documents for the lawyer's cases
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get all documents that lawyers should have access to
    // This includes documents from their assigned cases AND documents uploaded by clients
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          // Documents from cases assigned to this lawyer
          {
            case: {
              lawyerId: session.user.id,
            },
          },
          // Documents uploaded by clients (even without case assignment)
          {
            uploader: {
              role: 'CLIENT'
            }
          },
          // Documents uploaded by this lawyer
          {
            uploaderId: session.user.id
          }
        ]
      },
      include: {
        case: {
          select: {
            id: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// POST /api/documents - Upload a new document
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const clientId = formData.get('clientId') as string | null;
    const caseId = formData.get('caseId') as string | null;
    const documentType = (formData.get('documentType') as string) || 'OTHER';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    if (!clientId) {
      return NextResponse.json({ error: 'Client is required' }, { status: 400 });
    }
    
    // Verify the client exists and is assigned to the current lawyer
    const client = await prisma.clientProfile.findFirst({
      where: {
        userId: clientId,
        assignedLawyerId: session.user.id
      }
    });
    
    if (!client) {
      return NextResponse.json({ error: 'Client not found or not assigned to you' }, { status: 404 });
    }
    
    // If caseId is provided, verify it belongs to the client
    if (caseId) {
      const caseExists = await prisma.case.findFirst({
        where: {
          id: caseId,
          clientId: clientId
        }
      });
      
      if (!caseExists) {
        return NextResponse.json({ error: 'Case not found or does not belong to the client' }, { status: 404 });
      }
    }

    // If caseId is provided, verify it belongs to the lawyer
    if (caseId) {
      const caseRecord = await prisma.case.findUnique({
        where: { 
          id: caseId,
          lawyerId: session.user.id 
        },
      });

      if (!caseRecord) {
        return new NextResponse("Case not found or access denied", { status: 404 });
      }
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(file, 'legal-documents') as any;
    
    if (!uploadResult.secure_url) {
      throw new Error('Failed to upload file to Cloudinary');
    }
    
    const fileUrl = uploadResult.secure_url;

    // Map MIME type to DocumentType
    const getDocumentType = (mimeType: string): 'CONTRACT' | 'EVIDENCE' | 'CORRESPONDENCE' | 'OTHER' => {
      if (mimeType.startsWith('image/')) return 'EVIDENCE';
      if (mimeType === 'application/pdf') return 'CONTRACT';
      if (mimeType.startsWith('text/')) return 'CORRESPONDENCE';
      return 'OTHER';
    };

    // Prepare the document data
    const documentData = {
      filename: file.name,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      type: getDocumentType(file.type),
      url: fileUrl,
      uploaderId: session.user.id,
      caseId: caseId || undefined,
    };

    // Create document first
    const document = await prisma.document.create({
      data: documentData,
    });

    // If we have a caseId, create a notification
    if (caseId) {
      try {
        const caseRecord = await prisma.case.findUnique({
          where: { id: caseId },
          select: { lawyerId: true, title: true }
        });

        if (caseRecord) {
          await prisma.notification.create({
            data: {
              userId: caseRecord.lawyerId,
              title: "New Document Uploaded",
              message: `A new document "${file.name}" has been uploaded to case "${caseRecord.title}"`,
              type: "DOCUMENT_UPLOADED" as NotificationType,
              referenceId: caseId,
            },
          });
        }
      } catch (error) {
        console.error('Error creating notification:', error);
        // Don't fail the whole operation if notification fails
      }
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error uploading document:', error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const documentId = params.id

    // Find the document and verify ownership
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        case: {
          select: {
            lawyerId: true,
          },
        },
      },
    })

    if (!document) {
      return new NextResponse("Document not found", { status: 404 })
    }

    if (document?.case?.lawyerId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    // Delete from Cloudinary
    // Extract public_id from the Cloudinary URL
    // Cloudinary URLs are in format: https://res.cloudinary.com/cloudname/image/upload/v123456789/public_id.extension
    const urlParts = document.url.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload') + 1;
    const publicIdWithExtension = urlParts.slice(uploadIndex + 1).join('/');
    const publicId = publicIdWithExtension.split('.')[0]; // Remove file extension if present
    
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
      } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete from database
    await prisma.document.delete({
      where: { id: documentId },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting document:', error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
