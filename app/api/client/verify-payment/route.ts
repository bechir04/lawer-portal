import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, quoteId } = body

    if (!sessionId || !quoteId) {
      return NextResponse.json({ error: 'Missing sessionId or quoteId' }, { status: 400 })
    }

    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    const updatedCasePricing = await prisma.$transaction(async (tx) => {
      await tx.paymentIntent.updateMany({
        where: {
          stripeSessionId: sessionId,
          clientId: session.user.id,
        },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      })

      const casePricing = await tx.casePricing.update({
        where: {
          id: quoteId,
        },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
        include: {
          case: {
            select: {
              title: true,
              lawyerId: true,
            },
          },
        },
      })

      return casePricing
    })

    if (!updatedCasePricing) {
      throw new Error('Failed to update payment status in database.')
    }

    await prisma.notification.create({
      data: {
        userId: updatedCasePricing.case.lawyerId,
        title: 'Payment Received',
        message: `Payment of $${updatedCasePricing.totalEstimate.toFixed(2)} received for case "${updatedCasePricing.case.title}"`,
        type: 'PAYMENT_RECEIVED',
        referenceId: updatedCasePricing.id,
      },
    })

    return NextResponse.json({
      success: true,
      caseTitle: updatedCasePricing.case.title,
      amount: updatedCasePricing.totalEstimate,
      paidAt: updatedCasePricing.paidAt,
      transactionId: checkoutSession.payment_intent,
    })

  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
