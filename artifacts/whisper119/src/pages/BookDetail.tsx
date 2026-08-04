import { ArrowLeft, Check, Mail, ShoppingBag } from "lucide-react"
import { Link, useLocation, useParams } from "wouter"
import { useGetBook } from "@workspace/api-client-react"
import { BookCover } from "@/components/book-card"
import { useCart } from "@/components/cart-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatPrice } from "@/lib/utils"

export default function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>()
  const [, setLocation] = useLocation()
  const { data: book, isLoading, error } = useGetBook(bookId!)
  const { items, addItem } = useCart()

  if (isLoading) return <main className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="grid gap-12 lg:grid-cols-[0.45fr_0.8fr]"><Skeleton className="mx-auto aspect-[2/3] w-full max-w-md" /><div><Skeleton className="h-5 w-24" /><Skeleton className="mt-6 h-20 w-4/5" /><Skeleton className="mt-6 h-28 w-full" /></div></div></main>
  if (error || !book) return <main className="mx-auto max-w-7xl px-5 py-32 text-center sm:px-8"><p className="font-display text-3xl">This title has left the shelf.</p><Link href="/shop" className="mt-6 inline-block font-mono text-xs uppercase tracking-[0.15em] text-primary">Back to the shop →</Link></main>

  const inCart = items.some((item) => item.id === book.id)

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 md:py-20">
      <Link href="/shop" className="mb-12 inline-flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> Back to the shelf</Link>
      <div className="grid gap-14 lg:grid-cols-[0.58fr_1fr] lg:items-start lg:gap-24">
        <div className="mx-auto w-full max-w-md lg:sticky lg:top-28"><BookCover book={book} className="aspect-[2/3]" /><p className="mt-4 text-center font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">{book.format} · DRM-free digital edition</p></div>
        <div>
          <p className="rule-label">{book.category}</p>
          <h1 className="mt-5 max-w-2xl font-display text-5xl leading-[0.96] sm:text-6xl">{book.title}</h1>
          <p className="mt-4 font-display text-xl italic text-muted-foreground">by {book.author}</p>
          <div className="mt-9 max-w-2xl whitespace-pre-wrap text-base leading-8 text-muted-foreground">{book.description || "A carefully chosen title from the Whisper 119 shelf."}</div>
          <div className="mt-12 border-y border-border/70 py-7">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div><p className="font-display text-3xl">{formatPrice(book.price, book.currency)}</p><p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">One copy · instant email delivery</p></div>
              <button type="button" disabled={inCart} onClick={() => { if (!inCart) addItem(book); setLocation("/cart") }} className={`inline-flex h-12 items-center gap-2 rounded-full px-7 font-mono text-[0.68rem] uppercase tracking-[0.13em] transition-colors ${inCart ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
                {inCart ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />} {inCart ? "In cart" : "Add to cart"}
              </button>
            </div>
          </div>
          <div className="mt-8 grid gap-5 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.4} /><span>After payment, the file and receipt arrive as email attachments.</span></div>
            <div><span className="font-mono text-[0.6rem] uppercase tracking-[0.15em]">Published</span><p className="mt-1 text-foreground">{formatDate(book.publishedAt)}</p></div>
          </div>
        </div>
      </div>
    </main>
  )
}