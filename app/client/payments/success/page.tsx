"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, ArrowLeft, AlertCircle, Mail } from "lucide-react"
import Link from "next/link"

export default function PaymentSuccessPage() {
  const [loading, setLoading] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  
  const sessionId = searchParams.get('session_id')
  const quoteId = searchParams.get('quote_id')

  useEffect(() => {
    if (sessionId && quoteId) {
      verifyPayment()
    }
  }, [sessionId, quoteId])

  const verifyPayment = async () => {
    if (!sessionId || !quoteId) {
      setError('Missing payment session information. Please try again.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/client/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          quoteId 
        }),
        credentials: 'include' // Important for session cookies
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to verify payment')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error('Payment verification failed')
      }
      
      setPaymentDetails(data)
    } catch (error) {
      console.error('Error verifying payment:', error)
      setError(error instanceof Error ? error.message : 'Failed to verify payment status')
      
      // Log the error to your error tracking service
      if (process.env.NODE_ENV === 'production') {
        // Replace with your error tracking service
        console.error('Payment verification error:', {
          sessionId,
          quoteId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p>Verifying your payment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Payment Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground">
              {error || 'There was an issue verifying your payment. Please try again or contact support if the problem persists.'}
            </p>
            
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/client/payments">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Payments
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <a href="mailto:support@lawyerportal.com">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </a>
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md text-left">
                <p className="text-sm font-mono text-gray-600">
                  <span className="font-semibold">Debug Info:</span> {sessionId ? `Session: ${sessionId.substring(0, 8)}...` : 'No session ID'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Your payment has been processed successfully.
            </p>
          </div>

          {paymentDetails && (
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Case:</span>
                <span className="font-medium">{paymentDetails.caseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium">${paymentDetails.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Date:</span>
                <span className="font-medium">
                  {new Date(paymentDetails.paidAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID:</span>
                <span className="font-mono text-sm">{paymentDetails.transactionId}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              A confirmation email has been sent to your registered email address.
              Your lawyer will be notified of the payment.
            </p>
            
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/client/payments">
                  View All Payments
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/client/dashboard">
                  Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
