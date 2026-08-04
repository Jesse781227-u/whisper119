import { ArrowRight, Download, Globe2, Mail, Sparkles } from "lucide-react"
import { Link } from "wouter"
import { useGetStorefrontSummary } from "@workspace/api-client-react"
import { BookCard } from "@/components/book-card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"

const previewCovers = ["/covers/cover-1.jpg", "/covers/cover-2.jpg", "/covers/cover-3.jpg", "/covers/cover-4.jpg"]

function EmptyShelf() {
  return (
    <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div className="animate-fade-rise">
        <p className="rule-label">The first shelf</p>
        <h1 className="mt-5 max-w-xl font-display text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">
          A small shop with a long reading list.
        </h1>
        <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground">
          No warehouse, no algorithm and no recommendations engine — just a shelf of titles chosen carefully and sold as clean, DRM-free EPUB and PDF files.
        </p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-mono text-[0.68rem] uppercase tracking-[0.13em] text-primary-foreground transition-transform hover:-translate-y-0.5">
            Browse the shop <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/about" className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 font-mono text-[0.68rem] uppercase tracking-[0.13em] text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            About the shop
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2"><Download className="h-4 w-4" strokeWidth={1.4} /> Email delivery</span>
          <span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4" strokeWidth={1.4} /> Every country</span>
          <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" strokeWidth={1.4} /> DRM-free</span>
        </div>
      </div>
      <div className="relative mx-auto grid w-full max-w-xl grid-cols-4 items-end gap-3 px-6 py-10 sm:gap-5">
        <div className="absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 rounded-full bg-accent/50 blur-3xl" />
        {previewCovers.map((cover, index) => (
          <div key={cover} className={`relative book-shadow overflow-hidden rounded-sm transition-transform duration-500 hover:-translate-y-3 ${index % 2 === 1 ? "mb-8" : ""}`}>
            <img src={cover} alt="" className="aspect-[2/3] w-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { data: summary, isLoading, error } = useGetStorefrontSummary()
  const hasBooks = Boolean(summary?.featured.length || summary?.newArrivals.length)
  const featured = summary?.featured ?? []
  const arrivals = summary?.newArrivals ?? []

  return (
    <main>
      <section className="border-b border-border/70 bg-secondary/25">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24">
          {isLoading ? (
            <div className="grid gap-10 lg:grid-cols-2"><div><Skeleton className="h-4 w-32" /><Skeleton className="mt-6 h-28 w-full" /><Skeleton className="mt-6 h-20 w-4/5" /></div><Skeleton className="mx-auto aspect-[4/3] w-full max-w-xl" /></div>
          ) : hasBooks ? (
            <div className="grid gap-12 lg:grid-cols-[0.9fr_0.8fr] lg:items-center">
              <div className="animate-fade-rise">
                <p className="rule-label">This month’s shelf</p>
                <h1 className="mt-5 max-w-xl font-display text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">{featured[0]?.title ?? "A small shop with a long reading list."}</h1>
                {featured[0] && <p className="mt-3 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">by {featured[0].author}</p>}
                <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground">{featured[0]?.description ?? "A shelf of titles chosen carefully and sold as clean, DRM-free files."}</p>
                <div className="mt-9 flex flex-wrap gap-4">
                  <Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-mono text-[0.68rem] uppercase tracking-[0.13em] text-primary-foreground">Browse the shop <ArrowRight className="h-4 w-4" /></Link>
                  {featured[0] && <Link href={`/book/${featured[0].id}`} className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 font-mono text-[0.68rem] uppercase tracking-[0.13em] text-muted-foreground hover:border-primary hover:text-primary">Read about it</Link>}
                </div>
              </div>
              {featured[0]?.coverUrl ? <Link href={`/book/${featured[0].id}`} className="mx-auto block w-full max-w-sm hover-lift"><img src={featured[0].coverUrl} alt={`Cover of ${featured[0].title}`} className="book-shadow aspect-[2/3] w-full rounded-sm object-cover" /></Link> : <EmptyShelf />}
            </div>
          ) : (
            <EmptyShelf />
          )}
        </div>
      </section>

      {error ? (
        <section className="mx-auto max-w-7xl px-5 py-20 text-center sm:px-8"><p className="font-display text-2xl">The shelf is taking a quiet moment.</p><p className="mt-3 text-sm text-muted-foreground">Please try again shortly.</p></section>
      ) : (
        <>
          <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
            <div className="flex items-end justify-between border-b border-border/70 pb-5">
              <div><p className="rule-label">Fresh off the press</p><h2 className="mt-2 font-display text-3xl">New arrivals</h2></div>
              <Link href="/shop" className="hidden font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary sm:block">See all →</Link>
            </div>
            {arrivals.length ? <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">{arrivals.slice(0, 4).map((book) => <BookCard key={book.id} book={book} />)}</div> : <div className="mt-10 border border-dashed border-border px-6 py-14 text-center"><p className="font-display text-2xl">The shelf is being assembled.</p><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Come back soon for the first handpicked titles. Every book will arrive as an attachment in your inbox.</p><Link href="/about" className="mt-6 inline-flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-primary">How it works <ArrowRight className="h-3.5 w-3.5" /></Link></div>}
          </section>
          <section className="border-y border-border/70 bg-secondary/25">
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-3">
              <div><Mail className="h-5 w-5 text-primary" strokeWidth={1.4} /><p className="mt-4 font-display text-xl">Delivered by email</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Your PDF or EPUB arrives as an actual attachment after payment clears.</p></div>
              <div><Globe2 className="h-5 w-5 text-primary" strokeWidth={1.4} /><p className="mt-4 font-display text-xl">Made for everywhere</p><p className="mt-2 text-sm leading-6 text-muted-foreground">A quiet little shop for readers ordering from any country.</p></div>
              <div><Sparkles className="h-5 w-5 text-primary" strokeWidth={1.4} /><p className="mt-4 font-display text-xl">No lock-in</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Clean DRM-free files you can keep, back up, and read anywhere.</p></div>
            </div>
          </section>
          {featured.length > 0 && <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><p className="rule-label">On the shelf now</p><div className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">{featured.slice(0, 4).map((book) => <BookCard key={book.id} book={book} />)}</div></section>}
        </>
      )}
    </main>
  )
}