import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { CaseStatus, Priority } from '@prisma/client';

// GET endpoint to fetch a single case by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const caseId = params.id;

    // Fetch the case with related client information
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        documents: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            createdAt: true,
          },
        },
        messages: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!caseData) {
      return new NextResponse('Case not found', { status: 404 });
    }

    // Format the case data for the frontend
    const formattedCase = {
      id: caseData.id,
      title: caseData.title,
      clientId: caseData.clientId,
      clientName: caseData.client?.name || 'Unknown Client',
      status: caseData.status,
      priority: caseData.priority,
      startDate: caseData.createdAt.toISOString(),
      dueDate: caseData.dueDate?.toISOString() || 'Not scheduled',
      description: caseData.description || '',
      clientDetails: {
        id: caseData.client?.id || '',
        name: caseData.client?.name || 'Unknown Client',
        email: caseData.client?.email || ''
      },
      documents: caseData.documents.map(doc => ({
        id: doc.id,
        title: doc.filename,
        url: doc.url,
        createdAt: doc.createdAt
      })),
      recentMessages: caseData.messages || [],
      lastActivity: caseData.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedCase);
  } catch (error) {
    console.error('Error fetching case:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

const updateCaseSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED', 'ON_HOLD']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const caseId = params.id;

    // Check if the case exists
    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!existingCase) {
      return new NextResponse('Case not found', { status: 404 });
    }

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = updateCaseSchema.parse(body);

    // Update the case
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        status: validatedData.status as CaseStatus | undefined,
        priority: validatedData.priority as Priority | undefined,
      },
    });

    return NextResponse.json(updatedCase);
  } catch (error) {
    console.error('Error updating case:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const caseId = params.id;

    // Check if the case exists
    const existingCase = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!existingCase) {
      return new NextResponse('Case not found', { status: 404 });
    }

    // Delete the case
    await prisma.case.delete({
      where: { id: caseId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting case:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}