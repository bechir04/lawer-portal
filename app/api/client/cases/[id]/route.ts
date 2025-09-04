import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Find the case and verify the user has access to it
    const caseDetails = await prisma.case.findFirst({
      where: {
        id: caseId,
        clientId: session.user.id, // Only allow clients to see their own cases
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        nextHearing: true,
        estimatedValue: true,
        lawyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        documents: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!caseDetails) {
      return new NextResponse('Case not found', { status: 404 });
    }

    // Format the response with only existing fields from the Case model
    const formattedCase = {
      id: caseDetails.id,
      title: caseDetails.title,
      description: caseDetails.description,
      status: caseDetails.status,
      priority: caseDetails.priority,
      startDate: caseDetails.createdAt.toISOString(),
      dueDate: caseDetails.dueDate?.toISOString() || null,
      lawyer: caseDetails.lawyer,
      documents: caseDetails.documents.length,
      lastUpdate: caseDetails.updatedAt.toISOString(),
      createdAt: caseDetails.createdAt.toISOString(),
      updatedAt: caseDetails.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedCase);
  } catch (error) {
    console.error('Error fetching case details:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
