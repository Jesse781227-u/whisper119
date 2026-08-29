import { AlertCircle, ArrowLeft, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import { useCreateOrder } from "@workspace/api-client-react"
import { useCart } from "@/components/cart-provider"
import { ConvertedPrice } from "@/components/converted-price"
import { formatPrice } from "@/lib/utils"
import { useUsdToNgn } from "@/hooks/use-usd-to-ngn"
import { countries } from "@/data/countries"

export default function Checkout() {
  const { items, total, clearCart } = useCart()
  const dollarTotal = items.reduce((sum, item) => sum + item.price, 0)
  const [, setLocation] = useLocation()
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState("US")
  const [currency, setCurrency] = useState<"NGN" | "USD">("USD")
  const createOrder = useCreateOrder()
  const { rate: usdToNgnRate, isLoading: isRateLoading } = useUsdToNgn()

  useEffect(() => {
    if (items.length === 0) setLocation("/cart")
  }, [items.length, setLocation])

  if (items.length === 0) return null

  const checkoutTotal = currency === "NGN" && usdToNgnRate ? dollarTotal * usdToNgnRate : dollarTotal
  const canSubmit = currency !== "NGN" || Boolean(usdToNgnRate)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    createOrder.mutate(
      { data: { email, country, currency, bookIds: items.map((item) => item.id) } },
      {
        onSuccess: (response) => {
          clearCart()
          window.location.href = response.authorizationUrl
        },
      },
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-7 sm:px-6 sm:pt-10">
      <Link href="/cart" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to cart
      </Link>
      <div className="mt-7">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">Secure checkout</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Almost yours.</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Tell us where to send your reading. Payment is handled securely by Flutterwave.</p>
      </div>

      <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_20rem]">
        <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3 border-b border-border pb-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="h-4 w-4" /></span>
              <div><p className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">Step 1</p><h2 className="mt-1 text-xl font-extrabold">Your delivery details</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Your ebook files and receipt arrive here as email attachments after payment confirms.</p></div>
            </div>
            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-foreground">Email address</span>
                <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10" />
              </label>
              <fieldset>
                <legend className="mb-2 block text-xs font-bold text-foreground">Payment currency</legend>
                <div className="grid grid-cols-2 gap-3">
                  {(["NGN", "USD"] as const).map((option) => <label key={option} className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-extrabold ${currency === option ? "border-primary bg-primary/10 text-primary" : "border-border"}`}><input type="radio" name="currency" value={option} checked={currency === option} onChange={() => setCurrency(option)} className="sr-only" />{option}</label>)}
                </div>
              </fieldset>
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-foreground">Country</span>
                <select id="country" required value={country} onChange={(event) => setCountry(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">
                  {countries.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
                </select>
              </label>
            </div>
          </section>

          {createOrder.error && (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm leading-6">We could not start payment. Flutterwave may not be configured or may not support this payment attempt. Check your details and retry.</p>
            </div>
          )}

           <button type="submit" disabled={createOrder.isPending || checkoutTotal <= 0 || !canSubmit} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
             {createOrder.isPending ? "Connecting to payment…" : `Pay ${formatPrice(checkoutTotal, currency)}`}
          </button>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-center text-[0.62rem] font-bold text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-primary" /> Secure payment</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Flutterwave protected</span>
          </div>
        </form>

        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-32">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">Your shelf</p>
          <h2 className="mt-2 text-xl font-extrabold">Order summary</h2>
          <div className="mt-5 divide-y divide-border border-y border-border">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0"><p className="line-clamp-2 text-sm font-bold leading-5">{item.title}</p><p className="mt-1 text-[0.62rem] font-bold uppercase tracking-wide text-primary">{item.format}</p></div>
                <span className="shrink-0 text-sm font-extrabold"><ConvertedPrice amountUsd={item.price} /></span>
              </div>
            ))}
          </div>
           <div className="mt-5 flex items-center justify-between"><span className="text-sm text-muted-foreground">Total</span><span className="text-2xl font-extrabold"><ConvertedPrice amountUsd={dollarTotal} /></span></div>
          <div className="mt-5 space-y-3 rounded-xl bg-secondary/70 p-4 text-xs leading-5 text-muted-foreground">
            <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> No shipping or hidden fees</p>
            <p className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Files arrive as attachments after payment.</p>
          </div>
        </aside>
      </div>
    </main>
  )
}
