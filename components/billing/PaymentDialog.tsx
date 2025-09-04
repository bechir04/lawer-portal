"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, CreditCard } from "lucide-react"
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe.js
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

type PaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: {
    id: string
    invoiceNumber: string
    total: number
    dueDate: Date
  }
  onSuccess?: () => void
}


export function PaymentDialog({ open, onOpenChange, invoice, onSuccess }: PaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [amount, setAmount] = useState(invoice.total)
  const { toast } = useToast()

  const handleStripeCheckout = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100, // Stripe expects amount in cents
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Stripe Checkout session');
      }

      const { sessionId } = await response.json();

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe.js has not loaded yet.');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        console.error('Stripe redirect error:', error);
        toast({
          title: "Payment Error",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Stripe checkout error:", error);
      toast({
        title: "Payment Failed",
        description: "Could not initiate the payment process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <div>
          <DialogHeader>
            <DialogTitle>Pay Invoice #{invoice.invoiceNumber}</DialogTitle>
            <DialogDescription>
              You are about to pay ${invoice.total.toFixed(2)} for invoice #{invoice.invoiceNumber}.
              You will be redirected to Stripe to complete your payment securely.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-8 text-center">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-4xl font-bold">${invoice.total.toFixed(2)}</p>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleStripeCheckout} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay with Stripe
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
