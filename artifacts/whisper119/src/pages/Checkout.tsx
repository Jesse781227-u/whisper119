import { AlertCircle, ArrowLeft, LockKeyhole, Mail, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import { useCreateOrder } from "@workspace/api-client-react"
import { useCart } from "@/components/cart-provider"
import { formatPrice } from "@/lib/utils"

export default function Checkout() {
  const { items, total, clearCart } = useCart()
  const [, setLocation] = useLocation()
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState("US")
  const createOrder = useCreateOrder()

  useEffect(() => {
    if (items.length === 0) setLocation("/cart")
  }, [items.length, setLocation])

  if (items.length === 0) return null

  const currency = items[0]?.currency || "USD"
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    createOrder.mutate(
      { data: { email, country, currency, bookIds: items.map((item) => item.id) } },
      { onSuccess: (response) => { clearCart(); window.location.href = response.authorizationUrl } },
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
      <Link href="/cart" className="inline-flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> Back to cart</Link>
      <div className="mt-10 max-w-2xl"><p className="rule-label">Almost yours</p><h1 className="mt-4 font-display text-5xl">Checkout</h1><p className="mt-4 text-base leading-7 text-muted-foreground">Tell us where to send your reading. Payment is handled securely by Paystack.</p></div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="border border-border bg-card p-6 sm:p-8">
            <div className="flex items-start gap-4 border-b border-border/70 pb-6"><Mail className="mt-1 h-5 w-5 shrink-0 text-primary" strokeWidth={1.4} /><div><p className="rule-label">01 · Delivery</p><h2 className="mt-2 font-display text-2xl">Your inbox</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Your ebook files and receipt will arrive here as email attachments after payment confirms.</p></div></div>
            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              <label className="block sm:col-span-2"><span className="rule-label">Email address</span><input id="email" type="email" required placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-3 h-12 w-full border-x-0 border-t-0 border-input bg-transparent px-0 text-base outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-0" /></label>
              <label className="block sm:col-span-2"><span className="rule-label">Country</span><select id="country" required value={country} onChange={(event) => setCountry(event.target.value)} className="mt-3 h-12 w-full border-x-0 border-t-0 border-input bg-transparent px-0 text-base outline-none focus:border-primary focus:ring-0"><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="AU">Australia</option><option value="DE">Germany</option><option value="FR">France</option><option value="JP">Japan</option><option value="NG">Nigeria</option><option value="ZA">South Africa</option></select></label>
            </div>
          </section>

          {createOrder.error && <div className="flex items-start gap-3 border border-destructive/30 bg-destructive/5 p-5 text-destructive"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p className="text-sm leading-6">We could not start payment. Paystack may not be configured or may not support this payment attempt. Please check your details and retry.</p></div>}

          <button type="submit" disabled={createOrder.isPending} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary font-mono text-[0.7rem] uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">{createOrder.isPending ? "Connecting to payment…" : `Pay ${formatPrice(total, currency)}`}</button>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-center font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5" /> Secure payment</span><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Paystack protected</span></div>
        </form>

        <aside className="h-fit border border-border bg-secondary/25 p-6 lg:sticky lg:top-28">
          <p className="rule-label">Your shelf</p><h2 className="mt-3 font-display text-2xl">Order summary</h2>
          <div className="mt-7 divide-y divide-border/70 border-y border-border/70">
            {items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 py-4"><div><p className="text-sm leading-5">{item.title}</p><p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.13em] text-muted-foreground">{item.format}</p></div><span className="shrink-0 font-mono text-xs">{formatPrice(item.price, item.currency)}</span></div>)}
          </div>
          <div className="mt-5 flex items-center justify-between"><span className="text-sm text-muted-foreground">Total</span><span className="font-display text-2xl">{formatPrice(total, currency)}</span></div>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">Digital goods only. No shipping, no waiting—just an attachment in your inbox once payment clears.</p>
        </aside>
      </div>
    </main>
  )
}