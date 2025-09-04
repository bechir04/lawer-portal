import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { quoteId, amount } = body

    if (!quoteId || amount == null) {
      return NextResponse.json({ error: 'Missing required parameters: quoteId and amount' }, { status: 400 })
    }

    const casePricingResult = await prisma.$queryRaw`
      SELECT cp.*, c.title as caseTitle, c."lawyerId", c."clientId", 
             u1.email as clientEmail, u2.name as lawyerName
      FROM "CasePricing" cp
      JOIN "Case" c ON cp."caseId" = c.id
      JOIN "User" u1 ON c."clientId" = u1.id
      JOIN "User" u2 ON c."lawyerId" = u2.id
      WHERE cp.id = ${quoteId} AND c."clientId" = ${session.user.id} AND cp.status = 'ACCEPTED'
    ` as any[]

    const casePricing = casePricingResult[0]

    if (!casePricing) {
      return NextResponse.json({ error: 'Quote not found or not accepted' }, { status: 404 })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Legal Services - ${casePricing.caseTitle}`,
              description: casePricing.description || 'Legal consultation and services'
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/client/payments/success?session_id={CHECKOUT_SESSION_ID}&quote_id=${quoteId}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/client/payments?canceled=true`,
      metadata: {
        quoteId: quoteId,
        clientId: session.user.id,
        lawyerId: casePricing.lawyerId
      },
      customer_email: casePricing.clientEmail || undefined
    })

    // Store payment intent info using Prisma Client
    await prisma.paymentIntent.create({
      data: {
        stripeSessionId: checkoutSession.id,
        quoteId: quoteId,
        clientId: session.user.id,
        amount: amount / 100, // Convert from cents to dollars
        status: 'PENDING',
      }
    });

    return NextResponse.json({ 
      clientSecret: checkoutSession.id,
      paymentIntentId: checkoutSession.payment_intent 
    })
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
