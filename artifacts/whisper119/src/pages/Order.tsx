import { useParams } from "wouter"
import { useGetOrder, useRetryOrderPayment } from "@workspace/api-client-react"
import { formatPrice, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, AlertTriangle, RefreshCcw, MailCheck } from "lucide-react"

export default function Order() {
  const { orderId } = useParams<{ orderId: string }>()
  
  const { data: order, isLoading: loadingOrder, error: orderError } = useGetOrder(orderId!)
  const retryPayment = useRetryOrderPayment()

  if (loadingOrder) {
    return (
      <main className="min-h-screen py-20 px-4 container mx-auto max-w-3xl">
        <Skeleton className="h-12 w-1/2 mb-8" />
        <Skeleton className="h-40 w-full mb-8" />
        <Skeleton className="h-64 w-full" />
      </main>
    )
  }

  if (orderError || !order) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-destructive font-serif text-xl">Order not found.</p>
      </main>
    )
  }

  const handleRetry = () => {
    retryPayment.mutate({ orderId: order.id }, {
      onSuccess: (res) => {
        window.location.href = res.authorizationUrl
      }
    })
  }

  return (
    <main className="min-h-screen py-16 px-4 container mx-auto max-w-3xl">
      <div className="mb-12 border-b pb-8">
        {order.status === "paid" ? (
          <div className="flex items-center gap-4 text-green-700 dark:text-green-500 mb-4">
            <CheckCircle2 className="w-8 h-8" />
            <h1 className="text-3xl font-serif">Payment Successful</h1>
          </div>
        ) : order.status === "failed" ? (
          <div className="flex items-center gap-4 text-destructive mb-4">
            <AlertTriangle className="w-8 h-8" />
            <h1 className="text-3xl font-serif">Payment Failed</h1>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-muted-foreground mb-4">
            <RefreshCcw className="w-8 h-8 animate-spin" />
            <h1 className="text-3xl font-serif">Payment Pending</h1>
          </div>
        )}
        
        <p className="text-lg text-muted-foreground">Order reference: <span className="font-mono text-foreground">{order.reference}</span></p>
        <p className="text-muted-foreground mt-2">Your receipt and ebook files will be sent to <span className="text-foreground">{order.email}</span> after Paystack confirms payment.</p>
      </div>

      {order.status === "failed" && (
        <Card className="mb-12 border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6">
            <h3 className="font-serif text-xl mb-2 text-destructive">We couldn't process your payment.</h3>
            <p className="text-sm text-muted-foreground mb-6">You can safely retry the payment for this order.</p>
            <Button onClick={handleRetry} disabled={retryPayment.isPending} className="w-full sm:w-auto">
              {retryPayment.isPending ? "Connecting..." : "Retry Payment"}
            </Button>
          </CardContent>
        </Card>
      )}

      {order.status === "paid" && (
        <div className="mb-12">
          <div className="border bg-secondary/10 p-6 flex gap-4 items-start">
            <MailCheck className="h-6 w-6 shrink-0 text-primary mt-1" />
            <div>
              <h2 className="text-2xl font-serif mb-2">Check your inbox</h2>
              <p className="text-muted-foreground">There is no download button on this page. Your DRM-free file(s) are delivered as actual email attachments alongside your receipt.</p>
              <p className="text-xs text-muted-foreground mt-4">If the message does not arrive, check spam and contact hello@whisper119.shop.</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-serif mb-6 border-b pb-4">Order Details</h2>
        <div className="bg-secondary/10 p-6 rounded-md space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block mb-1">Date</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Total</span>
              <span>{formatPrice(order.subtotal, order.currency)}</span>
            </div>
          </div>
          
          <div className="border-t pt-6 space-y-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-start">
                <div>
                  <p className="font-medium leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.author}</p>
                </div>
                <span className="text-sm tabular-nums">{formatPrice(item.price, order.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
