import { ArrowRight, BookOpen, ChevronRight, Mail } from "lucide-react"
import { Link } from "wouter"
import { useGetStorefrontSummary, useListBooks } from "@workspace/api-client-react"
import { BookCard } from "@/components/book-card"
import { Skeleton } from "@/components/ui/skeleton"
import { EMPTY_CATEGORIES } from "@/data/catalog"

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

function PromoBanner({ coverUrl }: { coverUrl?: string | null }) {
  return (
    <div className="relative isolate min-h-[168px] overflow-hidden rounded-2xl bg-[linear-gradient(118deg,#160e24_0%,#4c1f3e_54%,#8f3c65_100%)] px-5 py-6 text-white shadow-lg shadow-primary/20 sm:min-h-[190px] sm:px-8">
      <div className="absolute -right-10 -top-14 -z-10 h-52 w-52 rounded-full bg-rose-200/20 blur-2xl" />
      <div className="absolute -bottom-24 left-1/3 -z-10 h-48 w-48 rounded-full bg-violet-300/15 blur-3xl" />
      <div aria-hidden="true" className="absolute right-12 top-5 h-16 w-16 rounded-full bg-amber-100/20 shadow-[0_0_46px_12px_rgba(242,216,181,0.14)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-14 bg-[linear-gradient(160deg,transparent_0_20%,rgba(11,6,19,0.76)_21%_30%,transparent_31%_37%,rgba(11,6,19,0.82)_38%_48%,transparent_49%_55%,rgba(11,6,19,0.9)_56%)] opacity-80" />
      <div aria-hidden="true" className="absolute bottom-0 left-0 h-20 w-1/2 bg-[linear-gradient(120deg,transparent_0_35%,rgba(11,6,19,0.72)_36%_42%,transparent_43%_48%,rgba(11,6,19,0.88)_49%)] opacity-80" />
      <div className="absolute right-4 top-3 h-20 w-14 rotate-12 overflow-hidden rounded-lg opacity-45 shadow-xl sm:right-16 sm:h-28 sm:w-20">
        <img src={coverUrl || "/covers/cover-2.jpg"} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="relative max-w-[15rem] sm:max-w-sm">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-rose-100/80">A note from me</p>
        <h1 className="mt-2 text-2xl font-extrabold leading-[1.06] tracking-tight sm:text-4xl">Welcome to my official website.</h1>
        <p className="mt-2 text-xs leading-5 text-white/80 sm:text-sm">By Whisper 119. Author of <em>Mated to My Mate&apos;s Worst Enemy &amp; Rebirth Of The Broken Luna; A Second Chance At Luna&apos;s Heart</em>, with 225,000+ readers across platforms.</p>
        <Link href="/shop" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[0.68rem] font-extrabold text-primary shadow-md transition-transform hover:-translate-y-0.5">
          See my books <ArrowRight className="h-3.5 w-3.5" />
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

function ServiceStrip() {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-primary px-4 py-4 text-primary-foreground shadow-lg shadow-primary/15 sm:grid-cols-3">
      <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /><span className="text-[0.68rem] font-bold leading-4">Delivered by email</span></div>
      <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 shrink-0" /><span className="text-[0.68rem] font-bold leading-4">PDF + EPUB</span></div>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1"><span className="text-[0.68rem] font-bold leading-4">Keep your copy forever</span></div>
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
  const { data: catalogueData, isLoading: isCatalogueLoading, error: catalogueError, refetch: refetchCatalogue } = useListBooks(undefined, {
    query: {
      queryKey: ["/api/books"],
      retry: 3,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 3000),
    },
  })
  const catalogue = Array.isArray(catalogueData) ? catalogueData : []
  const featured = Array.isArray(summary?.featured) && summary.featured.length > 0 ? summary.featured : catalogue.slice(0, 8)
  const arrivals = Array.isArray(summary?.newArrivals) && summary.newArrivals.length > 0 ? summary.newArrivals : catalogue.slice(8, 16)
  const hasBooks = featured.length > 0 || arrivals.length > 0
  const sections = Array.isArray(summary?.categories) && summary.categories.length > 0 ? summary.categories : EMPTY_CATEGORIES
  const isLoadingShelf = isLoading || isCatalogueLoading
  const shelfError = Boolean(error || catalogueError)

  function retryShelf() {
    void Promise.all([refetch(), refetchCatalogue()])
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <PromoBanner coverUrl={featured[0]?.coverUrl} />

      {isLoadingShelf ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item}><Skeleton className="aspect-[0.69] w-full rounded-xl" /><Skeleton className="mt-3 h-4 w-4/5" /><Skeleton className="mt-2 h-3 w-2/5" /></div>)}
        </div>
       ) : shelfError && !hasBooks ? (
        <div className="mt-8 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">
          <p>The shelf could not load. Please try again shortly.</p>
          <button type="button" onClick={retryShelf} disabled={isRefetching} className="mt-4 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-opacity disabled:opacity-60">
            {isRefetching ? "Trying again…" : "Try again"}
          </button>
        </div>
        ) : hasBooks ? (
         <>
           {featured.length > 0 && (
             <section className="mt-8">
               <SectionHeading eyebrow="A few from me" title="My books" />
               <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4">{featured.slice(0, 8).map((book) => <BookCard key={book.id} book={book} />)}</div>
             </section>
           )}

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
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4">
                {catalogue.filter((book) => book.categories.some((bookCategory) => bookCategory === category.name)).slice(0, 4).map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </section>
          ))}

        </>
        ) : null}
    </main>
  )
}
