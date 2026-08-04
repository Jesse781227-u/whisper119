import { AlertTriangle, CheckCircle2, MailCheck, RefreshCcw } from "lucide-react"
import { useParams } from "wouter"
import { useGetOrder, useRetryOrderPayment } from "@workspace/api-client-react"
import { formatDate, formatPrice } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export default function Order() {
  const { orderId } = useParams<{ orderId: string }>()
  const { data: order, isLoading, error } = useGetOrder(orderId!)
  const retryPayment = useRetryOrderPayment()

  if (isLoading) return <main className="mx-auto max-w-3xl px-5 py-20 sm:px-8"><Skeleton className="h-12 w-1/2" /><Skeleton className="mt-8 h-40 w-full" /><Skeleton className="mt-8 h-64 w-full" /></main>
  if (error || !order) return <main className="mx-auto max-w-3xl px-5 py-32 text-center sm:px-8"><p className="font-display text-3xl">Order not found.</p><p className="mt-3 text-sm text-muted-foreground">This order reference may have expired.</p></main>

  const handleRetry = () => retryPayment.mutate({ orderId: order.id }, { onSuccess: (response) => { window.location.href = response.authorizationUrl } })
  const isPaid = order.status === "paid"

  return (
    <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 md:py-20">
      <div className="border-b border-border/70 pb-10">
        <div className={`flex items-center gap-4 ${isPaid ? "text-primary" : order.status === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
          {isPaid ? <CheckCircle2 className="h-7 w-7" strokeWidth={1.5} /> : order.status === "failed" ? <AlertTriangle className="h-7 w-7" strokeWidth={1.5} /> : <RefreshCcw className="h-7 w-7 animate-spin" strokeWidth={1.5} />}
          <h1 className="font-display text-4xl">{isPaid ? "Payment successful" : order.status === "failed" ? "Payment failed" : "Payment pending"}</h1>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Order reference: <span className="font-mono text-foreground">{order.reference}</span></p>
        <p className="mt-2 leading-6 text-muted-foreground">Your receipt and ebook files will be sent to <span className="text-foreground">{order.email}</span> after Paystack confirms payment.</p>
      </div>

      {order.status === "failed" && <div className="mt-10 border border-destructive/30 bg-destructive/5 p-6"><p className="font-display text-2xl text-destructive">We couldn’t process your payment.</p><p className="mt-2 text-sm leading-6 text-muted-foreground">You can safely retry the payment for this order.</p><button type="button" onClick={handleRetry} disabled={retryPayment.isPending} className="mt-6 h-11 rounded-full bg-primary px-6 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-60">{retryPayment.isPending ? "Connecting…" : "Retry payment"}</button></div>}

      {isPaid && <div className="mt-10 flex items-start gap-4 border border-primary/25 bg-accent/30 p-6"><MailCheck className="mt-1 h-6 w-6 shrink-0 text-primary" strokeWidth={1.4} /><div><h2 className="font-display text-2xl">Check your inbox</h2><p className="mt-2 leading-6 text-muted-foreground">Your DRM-free file(s) are delivered as actual email attachments alongside your receipt. There is no download button on this page.</p><p className="mt-4 text-xs leading-5 text-muted-foreground">If the message does not arrive, check spam and contact hello@whisper119.shop.</p></div></div>}

      <section className="mt-12">
        <div className="flex items-end justify-between border-b border-border/70 pb-5"><div><p className="rule-label">Receipt</p><h2 className="mt-2 font-display text-2xl">Order details</h2></div><span className="font-mono text-xs">{formatDate(order.createdAt)}</span></div>
        <div className="divide-y divide-border/70 border-b border-border/70">
          {order.items.map((item, index) => <div key={index} className="flex items-start justify-between gap-4 py-5"><div><p className="font-display text-lg">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.author}</p></div><span className="font-mono text-xs">{formatPrice(item.price, order.currency)}</span></div>)}
        </div>
        <div className="flex justify-between py-6"><span className="text-sm text-muted-foreground">Total</span><span className="font-display text-2xl">{formatPrice(order.subtotal, order.currency)}</span></div>
      </section>
    </main>
  )
}