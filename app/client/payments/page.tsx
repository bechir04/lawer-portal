"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { CreditCard, DollarSign, Clock, CheckCircle, Loader2, Eye } from "lucide-react"
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CaseQuote {
  id: string
  caseId: string
  caseTitle: string
  lawyerName: string
  basePrice: number
  hourlyRate: number
  estimatedHours: number
  totalEstimate: number
  description: string
  status: 'SENT' | 'ACCEPTED' | 'PAID'
  sentAt: string
  acceptedAt?: string
  paidAt?: string
}

export default function ClientPaymentsPage() {
  const [quotes, setQuotes] = useState<CaseQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<CaseQuote | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchQuotes()
  }, [])

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/client/case-quotes')
      if (!response.ok) throw new Error('Failed to fetch quotes')
      const data = await response.json()
      setQuotes(data)
    } catch (error) {
      console.error('Error fetching quotes:', error)
      toast({
        title: "Error",
        description: "Failed to load case quotes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/client/case-quotes/${quoteId}/accept`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to accept quote')
      
      toast({
        title: "Success",
        description: "Quote accepted successfully. You can now proceed with payment."
      })
      fetchQuotes()
    } catch (error) {
      console.error('Error accepting quote:', error)
      toast({
        title: "Error",
        description: "Failed to accept quote",
        variant: "destructive"
      })
    }
  }

  const handlePayment = async (quote: CaseQuote) => {
    try {
      setIsProcessingPayment(true)
      
      // Create payment intent
      const response = await fetch('/api/client/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.id,
          amount: Math.round(quote.totalEstimate * 100) // Convert to cents
        })
      })

      if (!response.ok) throw new Error('Failed to create payment intent')
      
      const { clientSecret } = await response.json()
    
    const stripe = await stripePromise
    if (!stripe) throw new Error('Stripe failed to load')

    // Redirect to Stripe Checkout using the session ID
    const { error } = await stripe.redirectToCheckout({
      sessionId: clientSecret
    })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const viewQuoteDetails = (quote: CaseQuote) => {
    setSelectedQuote(quote)
    setIsDetailDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT': return 'bg-blue-100 text-blue-800'
      case 'ACCEPTED': return 'bg-green-100 text-green-800'
      case 'PAID': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT': return <Clock className="h-4 w-4" />
      case 'ACCEPTED': return <CheckCircle className="h-4 w-4" />
      case 'PAID': return <CreditCard className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading quotes...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Case Payments</h1>
          <p className="text-muted-foreground text-lg">View and pay for your legal case quotes.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{quotes.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{quotes.filter(q => q.status === 'SENT').length}</div>
            <p className="text-xs text-muted-foreground">Awaiting your response</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Pay</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{quotes.filter(q => q.status === 'ACCEPTED').length}</div>
            <p className="text-xs text-muted-foreground">Accepted quotes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${quotes.filter(q => q.status === 'PAID').reduce((sum, q) => sum + q.totalEstimate, 0).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">Completed payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Case Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case</TableHead>
                <TableHead>Lawyer</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Est. Hours</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No quotes found. Your lawyer will send you quotes for your cases.
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.caseTitle}</TableCell>
                    <TableCell>{quote.lawyerName}</TableCell>
                    <TableCell>${quote.basePrice.toFixed(2)}</TableCell>
                    <TableCell>${quote.hourlyRate.toFixed(2)}</TableCell>
                    <TableCell>{quote.estimatedHours}h</TableCell>
                    <TableCell className="font-semibold">${quote.totalEstimate.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(quote.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(quote.status)}
                          {quote.status}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewQuoteDetails(quote)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {quote.status === 'SENT' && (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptQuote(quote.id)}
                          >
                            Accept
                          </Button>
                        )}
                        {quote.status === 'ACCEPTED' && (
                          <Button
                            size="sm"
                            onClick={() => handlePayment(quote)}
                            disabled={isProcessingPayment}
                          >
                            {isProcessingPayment ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <CreditCard className="h-4 w-4 mr-1" />
                            )}
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quote Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
            <DialogDescription>
              Detailed breakdown for {selectedQuote?.caseTitle}
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Case</label>
                  <p className="font-medium">{selectedQuote.caseTitle}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Lawyer</label>
                  <p className="font-medium">{selectedQuote.lawyerName}</p>
                </div>
              </div>
              
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-semibold">Pricing Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Base Price:</span>
                    <span>${selectedQuote.basePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hourly Rate:</span>
                    <span>${selectedQuote.hourlyRate.toFixed(2)}/hour</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Hours:</span>
                    <span>{selectedQuote.estimatedHours} hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time-based Cost:</span>
                    <span>${(selectedQuote.hourlyRate * selectedQuote.estimatedHours).toFixed(2)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total Estimate:</span>
                    <span>${selectedQuote.totalEstimate.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedQuote.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1 text-sm">{selectedQuote.description}</p>
                </div>
              )}

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Quote sent: {new Date(selectedQuote.sentAt).toLocaleDateString()}</span>
                <Badge className={getStatusColor(selectedQuote.status)}>
                  {selectedQuote.status}
                </Badge>
              </div>

              {selectedQuote.status === 'SENT' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleAcceptQuote(selectedQuote.id)
                      setIsDetailDialogOpen(false)
                    }}
                  >
                    Accept Quote
                  </Button>
                </div>
              )}

              {selectedQuote.status === 'ACCEPTED' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handlePayment(selectedQuote)
                      setIsDetailDialogOpen(false)
                    }}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay ${selectedQuote.totalEstimate.toFixed(2)}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
