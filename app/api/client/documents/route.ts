import { writeFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get documents where the current user is either the uploader or has access through a case
    const documents = await prisma.document.findMany({
      include: {
        case: {
          select: { title: true },
        },
        uploader: {
          select: { name: true, id: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format the response to match the frontend's expected format
    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      name: doc.originalName,
      type: doc.type,
      case: doc.case?.title || 'Uncategorized',
      uploadDate: doc.createdAt.toISOString().split('T')[0],
      size: formatFileSize(doc.fileSize),
      status: 'Uploaded',
      uploadedBy: doc.uploader.id === session.user.id ? 'You' : doc.uploader.name,
    }));

    return NextResponse.json(formattedDocuments);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const caseId = formData.get('caseId') as string | null;
    const documentType = formData.get('type') as string || 'OTHER';

    if (!file) {
      return new NextResponse('No file uploaded', { status: 400 });
    }

    // Generate a unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const filePath = join(process.cwd(), 'public', 'uploads', fileName);
    
    // Convert file to buffer and save to filesystem
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save document info to database
    const document = await prisma.document.create({
      data: {
        filename: fileName,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        url: `/uploads/${fileName}`,
        type: documentType as any, // DocumentType enum
        uploaderId: session.user.id,
        caseId: caseId || null,
      },
    });

    // Create notification for lawyers/admins about new document upload
    const lawyers = await prisma.user.findMany({
      where: {
        role: { in: ['LAWYER', 'ADMIN'] }
      },
      select: { id: true }
    });

    // Create notifications for all lawyers/admins
    if (lawyers.length > 0) {
      await prisma.notification.createMany({
        data: lawyers.map(lawyer => ({
          userId: lawyer.id,
          title: "New Document Uploaded",
          message: `Client uploaded a new document: ${file.name}`,
          type: "DOCUMENT_UPLOADED",
        }))
      });
    }

    // Trigger notification refresh for lawyers/admins
    if (typeof window !== 'undefined' && (window as any).refetchNotifications) {
      (window as any).refetchNotifications();
    }

    return NextResponse.json({ 
      success: true,
      document: {
        id: document.id,
        name: document.originalName,
        type: document.type,
        uploadDate: document.createdAt.toISOString().split('T')[0],
        size: formatFileSize(document.fileSize),
        status: 'Uploaded',
        uploadedBy: 'You',
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
