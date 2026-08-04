import { ArrowRight, Trash2 } from "lucide-react"
import { Link, useLocation } from "wouter"
import { BookCover } from "@/components/book-card"
import { useCart } from "@/components/cart-provider"
import { formatPrice } from "@/lib/utils"

export default function Cart() {
  const { items, removeItem, total } = useCart()
  const [, setLocation] = useLocation()

  return (
    <main className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-20">
      <p className="rule-label">Your selection</p>
      <h1 className="mt-4 font-display text-5xl">Your cart</h1>
      {items.length === 0 ? (
        <div className="mt-12 border border-dashed border-border px-6 py-24 text-center"><p className="font-display text-3xl">A quiet cart.</p><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Nothing here yet. Take your time browsing the shelves.</p><Link href="/shop" className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-mono text-[0.68rem] uppercase tracking-[0.13em] text-primary-foreground">Browse titles <ArrowRight className="h-4 w-4" /></Link></div>
      ) : (
        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_20rem]">
          <ul className="divide-y divide-border border-y border-border">
            {items.map((item) => (
              <li key={item.id} className="flex gap-5 py-6">
                <Link href={`/book/${item.id}`} className="w-20 shrink-0"><div className="book-shadow aspect-[2/3] overflow-hidden rounded-sm bg-secondary">{item.coverUrl ? <img src={item.coverUrl} alt={`Cover of ${item.title}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-end p-3 font-display text-sm leading-tight">{item.title}</div>}</div></Link>
                <div className="flex flex-1 flex-col"><Link href={`/book/${item.id}`}><h2 className="font-display text-xl hover:text-primary">{item.title}</h2></Link><p className="mt-1 text-sm text-muted-foreground">{item.author}</p><p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">{item.format} · DRM-free</p><button type="button" onClick={() => removeItem(item.id)} className="mt-auto inline-flex w-fit items-center gap-1 pt-5 font-mono text-[0.6rem] uppercase tracking-[0.13em] text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /> Remove</button></div>
                <span className="font-mono text-xs">{formatPrice(item.price, item.currency)}</span>
              </li>
            ))}
          </ul>
          <aside className="h-fit border border-border bg-card p-6 lg:sticky lg:top-28">
            <p className="rule-label">Order summary</p><h2 className="mt-3 font-display text-2xl">Ready when you are.</h2>
            <div className="mt-7 flex justify-between border-t border-border pt-5 text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{formatPrice(total, items[0]?.currency || "USD")}</span></div>
            <button type="button" onClick={() => setLocation("/checkout")} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-mono text-[0.68rem] uppercase tracking-[0.13em] text-primary-foreground hover:bg-primary/90">Checkout securely <ArrowRight className="h-4 w-4" /></button>
            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">No shipping. Your files arrive by email after payment.</p>
          </aside>
        </div>
      )}
    </main>
  )
}