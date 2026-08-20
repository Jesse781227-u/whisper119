import { AlertTriangle, ArrowLeft, CheckCircle2, MailCheck, RefreshCcw } from "lucide-react"
import { Link, useParams } from "wouter"
import { useGetOrder, useRetryOrderPayment } from "@workspace/api-client-react"
import { formatDate, formatPrice } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export default function Order() {
  const { orderId } = useParams<{ orderId: string }>()
  const { data: order, isLoading, error } = useGetOrder(orderId!)
  const retryPayment = useRetryOrderPayment()

  if (isLoading) {
    return <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6"><Skeleton className="h-7 w-28" /><Skeleton className="mt-8 h-44 w-full rounded-2xl" /><Skeleton className="mt-7 h-64 w-full rounded-2xl" /></main>
  }

  if (error || !order) {
    return <main className="mx-auto max-w-3xl px-4 py-28 text-center sm:px-6"><p className="text-2xl font-extrabold">Order not found.</p><p className="mt-2 text-sm text-muted-foreground">This order reference may have expired.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-primary"><ArrowLeft className="h-4 w-4" /> Back to Whisper 119</Link></main>
  }

  const handleRetry = () => retryPayment.mutate({ orderId: order.id }, { onSuccess: (response) => { window.location.href = response.authorizationUrl } })
  const isPaid = order.status === "paid" || order.status === "fulfilled"
  const isFulfilled = order.status === "fulfilled"
  const isFailed = order.status === "failed"
  const statusTone = isPaid ? "bg-emerald-500/10 text-emerald-600" : isFailed ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-7 sm:px-6 sm:pt-10">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to shop</Link>

      <section className="mt-7 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className={`px-5 pb-7 pt-7 sm:px-8 sm:pt-9 ${isPaid ? "bg-emerald-500/[0.06]" : isFailed ? "bg-destructive/[0.05]" : "bg-amber-500/[0.06]"}`}>
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${statusTone}`}>
            {isPaid ? <CheckCircle2 className="h-7 w-7" /> : isFailed ? <AlertTriangle className="h-7 w-7" /> : <RefreshCcw className="h-7 w-7 animate-spin" />}
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Order status</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{isPaid ? "Payment successful" : isFailed ? "Payment failed" : "Payment pending"}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Reference <span className="font-mono font-bold text-foreground">{order.reference}</span></p>
           <p className="mt-1 text-sm leading-6 text-muted-foreground">Your receipt and ebook files will be sent to <span className="font-semibold text-foreground">{order.email}</span> after your payment is confirmed.</p>
        </div>
      </section>

      {isFailed && (
        <section className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 sm:p-6">
          <p className="text-lg font-extrabold text-destructive">We couldn’t process your payment.</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">You can safely retry payment for this order. Your order details are still saved.</p>
          <button type="button" onClick={handleRetry} disabled={retryPayment.isPending} className="mt-5 h-11 rounded-xl bg-primary px-5 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60">{retryPayment.isPending ? "Connecting…" : "Retry payment"}</button>
        </section>
      )}

      {isPaid && (
        <section className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 sm:p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MailCheck className="h-5 w-5" /></span>
           <div><h2 className="text-lg font-extrabold">{isFulfilled ? "Your book is on its way" : "Check your inbox"}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Your file(s) are delivered as actual email attachments alongside your receipt. There is no download button on this page.</p><p className="mt-3 text-xs leading-5 text-muted-foreground">If the message does not arrive, check spam and contact w2162843@ggmail.com.</p></div>
        </section>
      )}

      <section className="mt-7 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-end justify-between border-b border-border pb-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Receipt</p><h2 className="mt-1 text-xl font-extrabold">Order details</h2></div><span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span></div>
        <div className="divide-y divide-border">
          {order.items.map((item, index) => <div key={index} className="flex items-start justify-between gap-4 py-4"><div className="min-w-0"><p className="text-sm font-extrabold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.author}</p></div><span className="shrink-0 text-sm font-extrabold">{formatPrice(item.price, order.currency)}</span></div>)}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-5"><span className="text-sm text-muted-foreground">Total</span><span className="text-2xl font-extrabold">{formatPrice(order.subtotal, order.currency)}</span></div>
      </section>
    </main>
  )
}
