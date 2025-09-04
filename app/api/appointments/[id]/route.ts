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

    const { id } = params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lawyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        case: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!appointment) {
      return new NextResponse('Appointment not found', { status: 404 });
    }

    const isClient = session.user.role === 'CLIENT';
    const isLawyer = session.user.role === 'LAWYER';

    if (
      (isClient && appointment.clientId !== session.user.id) ||
      (isLawyer && appointment.lawyerId !== session.user.id)
    ) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { status, startTime, endTime } = body;

    // Find the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        client: true,
        lawyer: true,
      },
    });

    if (!appointment) {
      return new NextResponse('Appointment not found', { status: 404 });
    }

    // Check if the user is authorized to update this appointment
    const isClient = session.user.role === 'CLIENT';
    const isLawyer = session.user.role === 'LAWYER';
    
    if (isClient && appointment.clientId !== session.user.id) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    if (isLawyer && appointment.lawyerId !== session.user.id) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // Update the appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lawyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // In a real app, you might want to send notifications here
    // e.g., email notifications to the other party about the update

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
