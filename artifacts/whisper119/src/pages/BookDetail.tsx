import { ArrowLeft, Check, ChevronDown, ChevronUp, Copy, ExternalLink, Mail, ShoppingCart } from "lucide-react"
import { useMemo, useState } from "react"
import { Link, useLocation, useParams } from "wouter"
import { useGetBook, useListBooks } from "@workspace/api-client-react"
import { BookCard, BookCover } from "@/components/book-card"
import { ConvertedPrice } from "@/components/converted-price"
import { useCart } from "@/components/cart-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"

function ShareButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
      {children}
    </button>
  )
}

export default function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>()
  const [, setLocation] = useLocation()
  const { data: apiBook, isLoading: isBookLoading, error: bookError } = useGetBook(bookId ?? "", {
    query: {
      queryKey: ["/api/books", bookId],
      enabled: Boolean(bookId),
      retry: 2,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2000),
    },
  })
  const { data: apiBooks, isLoading: isCatalogueLoading } = useListBooks(undefined, {
    query: {
      queryKey: ["/api/books"],
      retry: 2,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2000),
    },
  })
  const { items, addItem } = useCart()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const catalogue = Array.isArray(apiBooks) ? apiBooks : []
  const book = apiBook ?? catalogue.find((item) => item.id === bookId || item.slug === bookId)
  const related = useMemo(() => (
    catalogue
      .filter((item) => item.id !== book?.id && item.category === book?.category)
      .slice(0, 6)
  ), [catalogue, book?.category, book?.id])
  const suggestions = useMemo(() => (
    catalogue
      .filter((item) => item.id !== book?.id && !related.some((relatedBook) => relatedBook.id === item.id))
      .slice(0, 6)
  ), [catalogue, book?.id, related])
  const isLoading = !book && (isBookLoading || isCatalogueLoading)
  const error = !book && bookError

  if (isLoading) {
    return (
      <main className="pb-24">
        <Skeleton className="h-[27rem] w-full rounded-none sm:h-[34rem]" />
        <div className="mx-auto max-w-3xl px-4 pt-7 sm:px-6"><Skeleton className="h-8 w-4/5" /><Skeleton className="mt-4 h-5 w-2/5" /><Skeleton className="mt-8 h-28 w-full" /></div>
      </main>
    )
  }

  if (error || !book) {
    return <main className="mx-auto max-w-3xl px-4 py-32 text-center"><p className="text-2xl font-extrabold">This title has left the shelf.</p><Link href="/shop" className="mt-6 inline-block text-xs font-bold text-primary">Back to the catalogue →</Link></main>
  }

  const inCart = items.some((item) => item.id === book.id)
  const heroStyle = book.coverUrl ? { backgroundImage: `linear-gradient(180deg, hsl(229 45% 10% / .2), hsl(229 45% 8% / .94)), url("${book.coverUrl}")` } : undefined
  const descriptors = [book.category, book.format, "", "Email delivery"]

  function addAndNavigate(path: string) {
    if (!inCart && book) addItem(book)
    setLocation(path)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="pb-28">
      <section className="relative isolate overflow-hidden bg-[#0c112b] text-white">
        <div className="absolute inset-0 -z-10 bg-cover bg-center opacity-60 blur-2xl scale-110" style={heroStyle} />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,12,34,.38),#0c112b_88%)]" />
        <div className="mx-auto max-w-5xl px-4 pb-8 pt-5 sm:px-6 sm:pb-12 sm:pt-7">
          <div className="flex items-center justify-between">
            <Link href="/shop" className="inline-flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white"><ArrowLeft className="h-5 w-5" /> Back</Link>
            <span className="max-w-[60%] truncate text-[0.68rem] font-medium text-white/60">Home / {book.category} / {book.title}</span>
          </div>
          <div className="mx-auto mt-8 max-w-xs sm:mt-10">
            <BookCover book={book} className="aspect-[0.69] border border-white/15 shadow-2xl shadow-black/40" />
          </div>
          <div className="mx-auto mt-7 max-w-2xl text-center">
            <div className="flex justify-center gap-2">
              <span className="rounded-md bg-primary px-2.5 py-1 text-[0.65rem] font-extrabold">{book.category}</span>
              <span className="rounded-md bg-white/15 px-2.5 py-1 text-[0.65rem] font-bold text-white/85">{book.format}</span>
            </div>
            <div className="mt-4 text-center">
              <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl"><ConvertedPrice amountNgn={book.priceNgn} /></p>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">{book.title}</h1>
            <p className="mt-2 text-sm text-white/70">by <span className="font-semibold text-white/90">{book.author}</span></p>
            <p className="mt-3 text-xs text-white/60">Published {formatDate(book.publishedAt)} · Digital edition</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <section className="-mt-1 rounded-b-2xl border border-t-0 border-border bg-card shadow-sm">
          <div className="grid grid-cols-3 divide-x divide-border px-2 py-5 text-center">
            <div><p className="text-lg font-extrabold text-primary"><ConvertedPrice amountNgn={book.priceNgn} /></p><p className="mt-1 text-[0.62rem] font-bold uppercase tracking-wide text-muted-foreground">Price</p></div>
            <div><p className="text-lg font-extrabold">{book.format}</p><p className="mt-1 text-[0.62rem] font-bold uppercase tracking-wide text-muted-foreground">Format</p></div>
            <div><p className="text-lg font-extrabold">Email</p><p className="mt-1 text-[0.62rem] font-bold uppercase tracking-wide text-muted-foreground">Delivery</p></div>
          </div>
        </section>

        <section className="mt-8">
          <button type="button" onClick={() => setExpanded((value) => !value)} className="flex w-full items-center justify-between text-left">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-primary">About this book</p><h2 className="mt-1 text-xl font-extrabold">Synopsis</h2></div>
            {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>
           <p className={`mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground ${expanded ? "" : "line-clamp-4"}`}>{book.description || "I hope this book gives you something good to carry with you."}</p>
           {!expanded && (book.description?.length ?? 0) > 260 && <button type="button" onClick={() => setExpanded(true)} className="mt-2 text-xs font-bold text-primary">Read more</button>}
          <div className="mt-5 flex flex-wrap gap-2">
            {descriptors.map((descriptor) => <span key={descriptor} className="rounded-full bg-primary/10 px-3 py-1.5 text-[0.68rem] font-bold text-primary">{descriptor}</span>)}
          </div>
        </section>

        <section className="mt-8 border-y border-border py-6">
          <p className="text-sm font-extrabold">Share this book</p>
          <div className="mt-3 flex items-center gap-2">
            <ShareButton label="Share by email"><Mail className="h-4 w-4" /></ShareButton>
            <ShareButton label="Share on X"><span className="text-sm font-extrabold">𝕏</span></ShareButton>
            <ShareButton label="Copy link" onClick={copyLink}>{copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}</ShareButton>
            {copied && <span className="ml-2 text-xs font-bold text-primary">Link copied</span>}
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-primary">Same world</p><h2 className="mt-1 text-xl font-extrabold">Related books</h2></div><Link href={`/shop?category=${encodeURIComponent(book.category)}`} className="text-xs font-bold text-primary">More →</Link></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">{related.map((item) => <BookCard key={item.id} book={item} />)}</div>
          </section>
        )}

        {suggestions.length > 0 && (
          <section className="mt-9">
            <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-primary">A few more from me</p><h2 className="mt-1 text-xl font-extrabold">You might also like</h2></div><Link href="/shop" className="text-xs font-bold text-primary">Browse all →</Link></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">{suggestions.map((item) => <BookCard key={item.id} book={item} />)}</div>
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-primary/20 bg-secondary/70 p-5">
           <div className="flex items-start gap-3"><ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-extrabold">Choose how you’d like to pay</p><p className="mt-1 text-xs leading-5 text-muted-foreground">You’ll pay on the provider’s website, then return here to confirm your payment with your transaction reference.</p></div></div>
           <div className="mt-4 grid gap-3 sm:grid-cols-2">
             <div className="space-y-2">
               {book.paystackLink ? <a href={book.paystackLink} target="_blank" rel="noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground transition-transform hover:-translate-y-0.5">Pay with Paystack <ExternalLink className="h-3.5 w-3.5" /></a> : <span className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border px-4 text-xs font-bold text-muted-foreground">Paystack link coming soon</span>}
               {book.paystackLink && <Link href={`/confirm-payment?bookId=${encodeURIComponent(book.id)}&method=paystack`} className="block text-center text-[0.68rem] font-bold text-primary hover:text-foreground">I paid with Paystack — confirm it</Link>}
             </div>
             <div className="space-y-2">
               {book.payoneerLink ? <a href={book.payoneerLink} target="_blank" rel="noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-background px-4 text-xs font-extrabold text-foreground transition-colors hover:border-primary hover:text-primary">Pay with Payoneer <ExternalLink className="h-3.5 w-3.5" /></a> : <span className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-border px-4 text-xs font-bold text-muted-foreground">Payoneer link coming soon</span>}
               {book.payoneerLink && <Link href={`/confirm-payment?bookId=${encodeURIComponent(book.id)}&method=payoneer`} className="block text-center text-[0.68rem] font-bold text-primary hover:text-foreground">I paid with Payoneer — confirm it</Link>}
             </div>
           </div>
        </section>

        <section className="mt-8 rounded-2xl bg-secondary/70 p-5">
           <div className="flex items-start gap-3"><Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="text-sm font-extrabold">I’ll send it to your inbox</p><p className="mt-1 text-xs leading-5 text-muted-foreground">After Paystack confirms payment, I’ll email your {book.format} file and receipt as real attachments. There are no public download links on this page.</p></div></div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 shadow-[0_-8px_24px_hsl(224_30%_22%_/_0.12)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-3xl gap-2 sm:grid-cols-[1fr_1.15fr_1.15fr]">
          <button type="button" onClick={() => addAndNavigate("/cart")} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card text-[0.68rem] font-extrabold uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary">
            {inCart ? <Check className="h-4 w-4 text-primary" /> : <ShoppingCart className="h-4 w-4" />} {inCart ? "In cart" : "Add to cart"}
          </button>
          {book.paystackLink ? (
            <a href={book.paystackLink} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-center text-[0.62rem] font-extrabold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 sm:text-[0.68rem]">
              Pay with Paystack <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          ) : (
            <span className="flex h-12 items-center justify-center rounded-xl border border-border px-3 text-center text-[0.62rem] font-bold text-muted-foreground sm:text-[0.68rem]">Paystack link coming soon</span>
          )}
          {book.payoneerLink ? (
            <a href={book.payoneerLink} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-card px-3 text-center text-[0.62rem] font-extrabold uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary sm:text-[0.68rem]">
              Pay with Payoneer <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          ) : (
            <span className="flex h-12 items-center justify-center rounded-xl border border-border px-3 text-center text-[0.62rem] font-bold text-muted-foreground sm:text-[0.68rem]">Payoneer link coming soon</span>
          )}
        </div>
      </div>
    </main>
  )
}