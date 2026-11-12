import { HugeiconsIcon } from "@hugeicons/react"
import { CopyLinkIcon, Facebook01Icon, NewTwitterIcon, WhatsappIcon } from "@hugeicons/core-free-icons"
import { ArrowLeft, BookOpenText, Check, ChevronLeft, ChevronRight, Share2, ShoppingCart } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react"
import { Link, useLocation, useParams } from "wouter"
import { useCreateLanguageRequest, useGetBook, useListBooks, type Book } from "@workspace/api-client-react"
import { BookCover } from "@/components/book-card"
import { ConvertedPrice } from "@/components/converted-price"
import { useCart } from "@/components/cart-provider"
import { ShelfRail, SectionHeading } from "@/components/shelf"
import { Skeleton } from "@/components/ui/skeleton"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { countries } from "@/data/countries"
import { languages } from "@/hooks/use-site-language"
import { useRegion } from "@/hooks/use-region"
import { useToast } from "@/hooks/use-toast"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { collapseSeries, fullTitle } from "@/lib/books"
import { formatPrice } from "@/lib/utils"

const MAX_VISIBLE_TAGS = 6

function languageName(code: string) {
  return languages.find(([value]) => value === code)?.[1] ?? code.toUpperCase()
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <dt className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-extrabold">{children}</dd>
    </div>
  )
}

function useCartActions(book: Book | undefined) {
  const { items, addItem } = useCart()
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const inCart = Boolean(book && items.some((item) => item.id === book.id))
  return {
    inCart,
    cartCount: items.length,
    add() {
      if (!book) return
      if (inCart) { setLocation("/cart"); return }
      addItem(book)
      toast({ title: "Added to cart", description: fullTitle(book) })
    },
    buy() {
      if (!book) return
      if (!inCart) addItem(book)
      setLocation("/checkout")
    },
  }
}

function CtaPair({ book, sticky = false }: { book: Book; sticky?: boolean }) {
  const { inCart, cartCount, add, buy } = useCartActions(book)
  return (
    <div className={`grid grid-cols-2 gap-2 ${sticky ? "" : "max-w-md"}`}>
      <button type="button" onClick={add} className="inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-extrabold transition-colors hover:border-primary hover:text-primary">
        {inCart ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <span className="truncate">{inCart ? `View cart (${cartCount})` : "Add to cart"}</span>
      </button>
      <button type="button" onClick={buy} className="inline-flex h-12 min-w-0 items-center justify-center rounded-xl bg-primary px-3 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20">
        <span className="truncate">Buy now — {formatPrice(book.price, "USD", "en-US")}</span>
      </button>
    </div>
  )
}

function LanguageRequestSheet({ book, open, onOpenChange }: { book: Book; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { detected } = useRegion()
  const request = useCreateLanguageRequest()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState("")
  const [language, setLanguage] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (detected && !country) setCountry(detected) }, [detected, country])

  function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!name.trim() || !language.trim() || !country) { setError("Fill in your name, country and the language you want."); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter your email so we can tell you when it’s ready."); return }
    request.mutate(
      { data: { bookId: book.id, name: name.trim(), email: email.trim(), country, language: language.trim() } },
      { onSuccess: () => setSent(true), onError: () => setError("We couldn’t send your request. Please try again.") },
    )
  }

  const field = "box-border h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Request another language</DrawerTitle>
            <DrawerDescription>We’ll email you if {fullTitle(book)} is translated.</DrawerDescription>
          </DrawerHeader>
          {sent ? (
            <p className="pb-6 text-sm font-semibold text-primary" aria-live="polite">Thanks — we’ve recorded your request and will email you.</p>
          ) : (
            <form onSubmit={submit} noValidate className="grid min-w-0 gap-3 pb-4">
              <label className="min-w-0"><span className="mb-1 block text-xs font-bold">Your name</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={field} /></label>
              <label className="min-w-0"><span className="mb-1 block text-xs font-bold">Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={field} /></label>
              <label className="min-w-0"><span className="mb-1 block text-xs font-bold">Country</span>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className={field}>
                  <option value="">Choose your country</option>
                  {countries.map(({ code, name: label }) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
              <label className="min-w-0"><span className="mb-1 block text-xs font-bold">Language you’d like</span><input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. Spanish" className={field} /></label>
              {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
              <button disabled={request.isPending} className="h-12 w-full rounded-xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-60">{request.isPending ? "Sending…" : "Send request"}</button>
            </form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function ShareRow({ book }: { book: Book }) {
  const { toast } = useToast()
  const url = `${window.location.origin}/book/${book.id}`
  const text = `Read "${fullTitle(book)}" by ${book.author}`
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function"
  const linkClass = "flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Copied", description: "Link copied to your clipboard." })
    } catch {
      toast({ title: "Couldn’t copy", description: url })
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void copy()} aria-label="Copy link" className={linkClass}><HugeiconsIcon icon={CopyLinkIcon} size={18} /></button>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text} — ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className={linkClass}><HugeiconsIcon icon={WhatsappIcon} size={18} /></a>
      <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on X" className={linkClass}><HugeiconsIcon icon={NewTwitterIcon} size={18} /></a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" className={linkClass}><HugeiconsIcon icon={Facebook01Icon} size={18} /></a>
      {canNativeShare && (
        <button type="button" aria-label="More sharing options" onClick={() => void navigator.share({ title: fullTitle(book), text, url }).catch(() => undefined)} className={linkClass}><Share2 className="h-4 w-4" aria-hidden="true" /></button>
      )}
    </div>
  )
}

export default function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>()
  const { data: apiBook, isLoading: isBookLoading, error: bookError } = useGetBook(bookId ?? "", {
    query: { queryKey: ["/api/books", bookId], enabled: Boolean(bookId), retry: 2 },
  })
  const { data: apiBooks } = useListBooks(undefined, { query: { queryKey: ["/api/books"], retry: 2 } })
  const catalogue = useMemo(() => (Array.isArray(apiBooks) ? apiBooks : []), [apiBooks])
  const book = apiBook ?? catalogue.find((item) => item.id === bookId || item.slug === bookId)
  useDocumentTitle(book ? fullTitle(book) : undefined)

  const [expanded, setExpanded] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const ctaRef = useRef<HTMLDivElement>(null)

  // Mobile sticky bar appears only once the inline price/CTA block scrolls away.
  useEffect(() => {
    const node = ctaRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0))
    observer.observe(node)
    return () => observer.disconnect()
  }, [book?.id])

  const volumes = useMemo(() => (
    book?.seriesId ? catalogue.filter((item) => item.seriesId === book.seriesId).sort((a, b) => (a.seriesNumber ?? 0) - (b.seriesNumber ?? 0)) : []
  ), [book?.seriesId, catalogue])

  const related = useMemo(() => {
    if (!book) return []
    const candidates = catalogue.filter((item) => item.id !== book.id && item.language === book.language && (!book.seriesId || item.seriesId !== book.seriesId))
    const score = (item: Book) => (item.primaryCategory && item.primaryCategory === book.primaryCategory ? 10 : 0) + item.categories.filter((category) => book.categories.includes(category)).length
    return collapseSeries(candidates.filter((item) => score(item) > 0).sort((a, b) => score(b) - score(a))).slice(0, 8)
  }, [book, catalogue])

  if (!book && isBookLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[minmax(0,20rem)_1fr]">
          <Skeleton className="mx-auto aspect-[2/3] w-56 rounded-xl md:w-full" />
          <div><Skeleton className="h-8 w-4/5" /><Skeleton className="mt-3 h-5 w-2/5" /><Skeleton className="mt-6 h-10 w-32" /><Skeleton className="mt-6 h-12 w-full max-w-md" /></div>
        </div>
      </main>
    )
  }

  if (bookError && !book || !book) {
    return <main className="mx-auto max-w-3xl px-4 py-32 text-center"><p className="text-2xl font-extrabold">This title has left the shelf.</p><Link href="/shop" className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-primary">Back to all books →</Link></main>
  }

  const editions = catalogue.filter((item) => item.titleGroupId === book.titleGroupId)
  const tags = [...new Set([book.primaryCategory, ...book.categories].filter((tag): tag is string => Boolean(tag)))].slice(0, MAX_VISIBLE_TAGS)
  const position = volumes.findIndex((item) => item.id === book.id)
  const previous = position > 0 ? volumes[position - 1] : null
  const next = position >= 0 && position < volumes.length - 1 ? volumes[position + 1] : null
  const description = book.description || "I hope this book gives you something good to carry with you."

  return (
    <main className="pb-28 md:pb-12">
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-6">
        <Link href="/shop" onClick={(event) => { if (window.history.length > 1) { event.preventDefault(); window.history.back() } }} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground md:hidden">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Back
        </Link>
        <nav aria-label="Breadcrumb" className="hidden text-sm text-muted-foreground md:block">
          <ol className="flex min-w-0 items-center gap-1.5">
            <li><Link href="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href="/shop" className="hover:text-foreground">Books</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="truncate font-semibold text-foreground">{fullTitle(book)}</li>
          </ol>
        </nav>

        <div className="mt-4 grid gap-8 md:mt-6 md:grid-cols-[minmax(0,20rem)_1fr] md:items-start">
          <div className="mx-auto w-56 sm:w-64 md:sticky md:top-28 md:w-full">
            <BookCover book={book} className="border border-white/10 shadow-2xl shadow-black/40" />
          </div>

          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{fullTitle(book)}</h1>
            {book.seriesSlug && book.seriesNumber && (
              <p className="mt-2 text-sm text-muted-foreground">
                Book {book.seriesNumber} of the <Link href={`/series/${book.seriesSlug}`} className="font-semibold italic text-primary hover:underline">{book.seriesName}</Link> series
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">by <span className="font-semibold text-foreground">{book.author}</span></p>

            <div ref={ctaRef} className="mt-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-3xl tracking-tight"><ConvertedPrice amountUsd={book.price} showLocal /></p>
                <Link href="/refund" className="text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:text-primary">Refund policy</Link>
              </div>
              {book.hasSample && (
                <Link href={`/book/${book.id}/sample`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10">
                  <BookOpenText className="h-4 w-4" aria-hidden="true" /> Read free sample
                </Link>
              )}
              <dl className="mt-5 grid grid-cols-2 gap-y-4 divide-border rounded-2xl border border-border bg-card py-4 sm:grid-cols-4 sm:divide-x">
                <Stat label="Format">{book.formats.join(" + ")}</Stat>
                <Stat label="Language">{languageName(book.language)}</Stat>
                <Stat label="Delivery">Email</Stat>
                <Stat label="Length">{book.pageCount ? `~${book.pageCount} pages` : "Full book"}</Stat>
              </dl>
              <div className="mt-5"><CtaPair book={book} /></div>
            </div>

            {editions.length > 1 && (
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Also available in</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {editions.map((edition) => (
                    <Link key={edition.id} href={`/book/${edition.id}`} aria-current={edition.id === book.id ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold ${edition.id === book.id ? "bg-primary text-primary-foreground" : "bg-secondary hover:text-primary"}`}>
                      {languageName(edition.language)}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {volumes.length > 1 && (
              <nav aria-label="Books in this series" className="mt-6 rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-extrabold">Books in this series</p>
                <ol className="mt-2 flex flex-wrap items-center gap-1">
                  {volumes.map((volume) => (
                    <li key={volume.id}>
                      <Link href={`/book/${volume.id}`} aria-current={volume.id === book.id ? "page" : undefined} aria-label={`Book ${volume.seriesNumber}`} className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${volume.id === book.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                        {volume.seriesNumber}
                      </Link>
                    </li>
                  ))}
                </ol>
                <div className="mt-2 flex justify-between gap-2 text-sm font-bold">
                  {previous ? <Link href={`/book/${previous.id}`} className="inline-flex min-h-11 items-center gap-1 text-primary"><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Book {previous.seriesNumber}</Link> : <span />}
                  {next ? <Link href={`/book/${next.id}`} className="inline-flex min-h-11 items-center gap-1 text-primary">Book {next.seriesNumber} <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link> : <span />}
                </div>
              </nav>
            )}

            <details className="group mt-4 rounded-2xl border border-border bg-card">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-extrabold">
                How delivery works
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
              </summary>
              <ol className="grid gap-2 px-4 pb-4 text-sm text-muted-foreground">
                <li><span className="font-bold text-foreground">1. Pay</span> securely by card or bank transfer.</li>
                <li><span className="font-bold text-foreground">2. We confirm</span> your payment automatically.</li>
                <li><span className="font-bold text-foreground">3. Your ebook arrives</span> in your inbox as an attachment, usually within minutes.</li>
              </ol>
            </details>

            <section className="mt-8" aria-labelledby="synopsis">
              <h2 id="synopsis" className="text-xl font-extrabold">Synopsis</h2>
              <p id="synopsis-text" className={`mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground ${expanded ? "" : "line-clamp-5"}`}>{description}</p>
              {description.length > 320 && (
                <button type="button" aria-expanded={expanded} aria-controls="synopsis-text" onClick={() => setExpanded((value) => !value)} className="mt-1 min-h-11 text-sm font-bold text-primary">
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
              {tags.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
                  {tags.map((tag) => (
                    <li key={tag}><Link href={`/shop?category=${encodeURIComponent(tag)}`} className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary">{tag}</Link></li>
                  ))}
                </ul>
              )}
              {editions.length <= 1 && (
                <button type="button" onClick={() => setRequestOpen(true)} className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-primary">Request another language →</button>
              )}
            </section>

            <section className="mt-8 border-t border-border pt-6" aria-label="Share this book">
              <p className="mb-3 text-sm font-extrabold">Share this book</p>
              <ShareRow book={book} />
            </section>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-12" aria-labelledby="related">
            <SectionHeading eyebrow="You might also like" title="Related books" href={book.primaryCategory ? `/shop?category=${encodeURIComponent(book.primaryCategory)}` : "/shop"} />
            <span id="related" className="sr-only">Related books</span>
            <ShelfRail items={related} label="Related books" />
          </section>
        )}
      </div>

      <div aria-hidden={!showSticky} className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl transition-transform duration-200 motion-reduce:transition-none md:hidden ${showSticky ? "translate-y-0" : "pointer-events-none translate-y-full"}`}>
        <CtaPair book={book} sticky />
      </div>

      <LanguageRequestSheet book={book} open={requestOpen} onOpenChange={setRequestOpen} />
    </main>
  )
}
