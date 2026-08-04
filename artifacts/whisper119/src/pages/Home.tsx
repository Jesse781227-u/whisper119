import { ArrowRight, BookOpen, ChevronRight, Mail, Sparkles } from "lucide-react"
import { Link } from "wouter"
import { useGetStorefrontSummary } from "@workspace/api-client-react"
import { BookCard } from "@/components/book-card"
import { Skeleton } from "@/components/ui/skeleton"

const previewCovers = ["/covers/cover-1.jpg", "/covers/cover-2.jpg", "/covers/cover-3.jpg"]

function SectionHeading({ eyebrow, title, href = "/shop" }: { eyebrow?: string; title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">{eyebrow}</p>}
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      <Link href={href} className="flex shrink-0 items-center gap-0.5 text-xs font-bold text-primary hover:text-primary/80">
        More <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function PromoBanner() {
  return (
    <div className="relative isolate min-h-[168px] overflow-hidden rounded-2xl bg-[linear-gradient(118deg,#2739a5_0%,#7444d8_52%,#d34dbe_100%)] px-5 py-6 text-white shadow-lg shadow-primary/15 sm:min-h-[190px] sm:px-8">
      <div className="absolute -right-10 -top-14 -z-10 h-52 w-52 rounded-full bg-fuchsia-300/35 blur-2xl" />
      <div className="absolute -bottom-24 left-1/3 -z-10 h-48 w-48 rounded-full bg-cyan-300/25 blur-3xl" />
      <div className="absolute right-4 top-3 h-20 w-14 rotate-12 overflow-hidden rounded-lg opacity-45 shadow-xl sm:right-16 sm:h-28 sm:w-20">
        <img src="/covers/cover-2.jpg" alt="" className="h-full w-full object-cover" />
      </div>
      <div className="relative max-w-[15rem] sm:max-w-sm">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/75">Welcome to Whisper 119</p>
        <h1 className="mt-2 text-2xl font-extrabold leading-[1.06] tracking-tight sm:text-4xl">Find a book worth keeping.</h1>
        <p className="mt-2 text-xs leading-5 text-white/80 sm:text-sm">DRM-free EPUBs and PDFs, delivered straight to your inbox.</p>
        <Link href="/shop" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[0.68rem] font-extrabold text-primary shadow-md transition-transform hover:-translate-y-0.5">
          Explore the shelf <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        <span className="h-1.5 w-4 rounded-full bg-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/45" />
      </div>
    </div>
  )
}

function EmptyShelf() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-card p-5 shadow-sm sm:p-8">
      <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex items-center gap-5 sm:gap-8">
        <div className="flex shrink-0 -space-x-5">
          {previewCovers.map((cover, index) => (
            <img key={cover} src={cover} alt="" className={`h-28 w-[4.6rem] rounded-lg border-2 border-card object-cover shadow-lg sm:h-36 sm:w-24 ${index === 1 ? "z-10 -translate-y-3" : ""}`} />
          ))}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-extrabold leading-tight sm:text-xl">The first shelf is being curated.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground sm:text-sm">The shop owner is choosing the first titles now. Come back soon for books you can keep forever.</p>
          <Link href="/about" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">How it works <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
    </div>
  )
}

function ServiceStrip() {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-primary px-4 py-4 text-primary-foreground shadow-lg shadow-primary/15 sm:grid-cols-3">
      <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /><span className="text-[0.68rem] font-bold leading-4">Delivered by email</span></div>
      <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 shrink-0" /><span className="text-[0.68rem] font-bold leading-4">PDF + EPUB</span></div>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1"><Sparkles className="h-4 w-4 shrink-0" /><span className="text-[0.68rem] font-bold leading-4">DRM-free forever</span></div>
    </div>
  )
}

export default function Home() {
  const { data: summary, isLoading, error, refetch, isRefetching } = useGetStorefrontSummary({
    query: {
      queryKey: ["/api/storefront/summary"],
      retry: 3,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 3000),
    },
  })
  const featured = summary?.featured ?? []
  const arrivals = summary?.newArrivals ?? []
  const hasBooks = featured.length > 0 || arrivals.length > 0
  const sections = summary?.categories ?? []

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <PromoBanner />

      {isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item}><Skeleton className="aspect-[0.69] w-full rounded-xl" /><Skeleton className="mt-3 h-4 w-4/5" /><Skeleton className="mt-2 h-3 w-2/5" /></div>)}
        </div>
      ) : error ? (
        <div className="mt-8 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">
          <p>The shelf could not load. Please try again shortly.</p>
          <button type="button" onClick={() => void refetch()} disabled={isRefetching} className="mt-4 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-opacity disabled:opacity-60">
            {isRefetching ? "Trying again…" : "Try again"}
          </button>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <SectionHeading eyebrow="Handpicked for you" title="Popular" />
            {featured.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4">{featured.slice(0, 8).map((book) => <BookCard key={book.id} book={book} />)}</div>
            ) : (
              <EmptyShelf />
            )}
          </section>

          <section className="mt-8">
            <ServiceStrip />
          </section>

          {arrivals.length > 0 ? (
            <section className="mt-9">
              <SectionHeading eyebrow="Just added" title="New arrivals" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4">{arrivals.slice(0, 8).map((book) => <BookCard key={book.id} book={book} />)}</div>
            </section>
          ) : null}

          {sections.slice(0, 3).map((category) => (
            <section key={category.name} className="mt-9">
              <SectionHeading title={category.name} href={`/shop?category=${encodeURIComponent(category.name)}`} />
              <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-7 text-center text-sm text-muted-foreground">
                Browse the {category.name.toLowerCase()} shelf in the catalogue.
                <Link href={`/shop?category=${encodeURIComponent(category.name)}`} className="ml-1 font-bold text-primary">See titles →</Link>
              </div>
            </section>
          ))}

          {!hasBooks && (
            <div className="mt-9 rounded-2xl bg-secondary/70 p-5 text-center sm:p-8">
              <p className="text-sm font-bold">A quieter kind of bookstore</p>
              <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-muted-foreground">No algorithm, no lock-in, no waiting for a parcel. Just carefully selected digital books delivered as real attachments after payment.</p>
            </div>
          )}
        </>
      )}
    </main>
  )
}