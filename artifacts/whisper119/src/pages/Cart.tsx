import { ArrowRight, CheckCircle2, Trash2 } from "lucide-react"
import { Link, useLocation } from "wouter"
import { BookCover } from "@/components/book-card"
import { useCart } from "@/components/cart-provider"
import { formatPrice } from "@/lib/utils"

export default function Cart() {
  const { items, removeItem, total } = useCart()
  const [, setLocation] = useLocation()
  const currency = items[0]?.currency || "USD"

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-7 sm:px-6 sm:pt-10">
      <div className="mb-7">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">Your selection</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Your cart</h1>
        <p className="mt-2 text-sm text-muted-foreground">{items.length ? `${items.length} ${items.length === 1 ? "book" : "books"} ready for checkout` : "A quiet place for books you want to keep."}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Trash2 className="h-6 w-6" /></div>
          <p className="mt-5 text-xl font-extrabold">Your cart is empty.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">The shelf is just a click away. Find a title and it will be waiting here.</p>
          <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20">Browse books <ArrowRight className="h-4 w-4" /></Link>
        </div>
      ) : (
        <div className="grid gap-7 lg:grid-cols-[1fr_20rem]">
          <section className="min-w-0">
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                  <Link href={`/book/${item.id}`} className="w-20 shrink-0 sm:w-24">
                    <div className="aspect-[0.69] overflow-hidden rounded-xl bg-secondary book-shadow">
                      {item.coverUrl ? <img src={item.coverUrl} alt={`Cover of ${item.title}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-end p-3 text-xs font-bold leading-tight">{item.title}</div>}
                    </div>
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/book/${item.id}`}><h2 className="line-clamp-2 text-sm font-extrabold leading-5 hover:text-primary sm:text-base">{item.title}</h2></Link>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{item.author}</p>
                      </div>
                      <span className="shrink-0 text-sm font-extrabold">{formatPrice(item.price, item.currency)}</span>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary">{item.format} · DRM-free</p>
                      <button type="button" onClick={() => removeItem(item.id)} className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/shop" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"><ArrowRight className="h-3.5 w-3.5 rotate-180" /> Continue browsing</Link>
          </section>

          <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-32">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">Order summary</p>
            <div className="mt-4 flex items-end justify-between border-b border-border pb-5"><span className="text-sm text-muted-foreground">Subtotal</span><span className="text-2xl font-extrabold">{formatPrice(total, currency)}</span></div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> No shipping or hidden fees</div>
            <button type="button" onClick={() => setLocation("/checkout")} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-extrabold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">Continue to checkout <ArrowRight className="h-4 w-4" /></button>
            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Your files arrive as email attachments after Paystack confirms payment.</p>
          </aside>
        </div>
      )}
    </main>
  )
}