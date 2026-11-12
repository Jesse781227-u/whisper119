import { useDocumentTitle } from "@/hooks/use-document-title"
import { ArrowRight, BookOpen, Infinity as InfinityIcon, Mail } from "lucide-react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link } from "wouter"
import { useGetStorefrontSummary, useListBooks, useListSeries, type Book } from "@workspace/api-client-react"
import { useSiteLanguage } from "@/hooks/use-site-language"
import { BookCardSkeletons, Rail, RailItem, SectionHeading, ShelfRail } from "@/components/shelf"
import { SeriesCard } from "@/components/book-card"
import { collapseSeries, coverSources } from "@/lib/books"
import { Reveal } from "@/lib/motion"

type Slide = { key: string; eyebrow: string; title: string; body: ReactNode; cta: { label: string; href: string }; covers: Book[] }

function CoverFan({ covers }: { covers: Book[] }) {
  const shown = covers.filter((book) => book.coverUrl).slice(0, 3)
  if (!shown.length) return null
  const transforms = ["-rotate-6 -translate-x-10", "rotate-0 z-10", "rotate-6 translate-x-10"]
  const ordered = shown.length === 1 ? [shown[0]] : shown
  return (
    <div aria-hidden="true" className="relative hidden h-52 w-56 shrink-0 items-center justify-center sm:flex">
      {ordered.map((book, index) => {
        const sources = coverSources(book.coverUrl, 300)
        return (
          <img
            key={book.id}
            src={sources?.src}
            alt=""
            loading="eager"
            decoding="async"
            className={`absolute h-48 w-32 rounded-lg object-cover shadow-2xl ring-1 ring-white/10 ${ordered.length === 1 ? "z-10" : transforms[index]}`}
          />
        )
      })}
    </div>
  )
}

function Hero({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0)
  const paused = useRef(false)
  const count = slides.length

  useEffect(() => {
    if (count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = window.setInterval(() => {
      if (!paused.current) setIndex((value) => (value + 1) % count)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [count])

  const slide = slides[Math.min(index, count - 1)]
  if (!slide) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      onTouchStart={() => { paused.current = true }}
      onMouseEnter={() => { paused.current = true }}
      onMouseLeave={() => { paused.current = false }}
      onFocus={() => { paused.current = true }}
      className="relative overflow-hidden rounded-2xl bg-[linear-gradient(118deg,#1b1029_0%,#4c1f3e_58%,#8f3c65_100%)] text-white shadow-lg shadow-primary/20"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[url('/dark-romance-background.jpg')] bg-cover bg-center opacity-15 mix-blend-luminosity" />
      <div className="relative flex min-h-[15rem] items-center gap-6 px-5 pb-14 pt-7 sm:px-10 sm:pb-14 sm:pt-10">
        <div className="min-w-0 max-w-xl" aria-live="polite">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-rose-100/85">{slide.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">{slide.title}</h1>
          <div className="mt-3 text-sm leading-6 text-white/85">{slide.body}</div>
          <Link href={slide.cta.href} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-extrabold text-[#4c1f3e] shadow-md transition-transform hover:-translate-y-0.5">
            {slide.cta.label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <CoverFan covers={slide.covers} />
      </div>
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-1 flex justify-center">
          {slides.map((item, dot) => (
            <button
              key={item.key}
              type="button"
              aria-label={`Show slide ${dot + 1} of ${count}`}
              aria-current={dot === index}
              onClick={() => { setIndex(dot); paused.current = true }}
              className="flex h-11 w-11 items-center justify-center"
            >
              <span className={`block h-2 rounded-full transition-all motion-reduce:transition-none ${dot === index ? "w-6 bg-white" : "w-2 bg-white/50"}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function TrustStrip() {
  const items = [
    { icon: Mail, label: "Delivered to your email" },
    { icon: BookOpen, label: "PDF ebook" },
    { icon: InfinityIcon, label: "Yours forever" },
  ]
  return (
    <ul className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card px-2 py-4">
      {items.map(({ icon: Icon, label }) => (
        <li key={label} className="flex flex-col items-center gap-2 px-2 text-center">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="text-xs font-bold leading-4 text-foreground sm:text-sm">{label}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Home() {
  useDocumentTitle()
  const language = useSiteLanguage()
  const { data: summary } = useGetStorefrontSummary({ language }, { query: { queryKey: ["/api/storefront/summary", { language }], retry: 3 } })
  const { data: booksData, isLoading, error, refetch, isRefetching } = useListBooks({ language }, {
    query: { queryKey: ["/api/books", { language }], retry: 3, retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 8000) },
  })
  const { data: seriesData } = useListSeries({ language }, { query: { queryKey: ["/api/series", { language }] } })

  const books = useMemo(() => (Array.isArray(booksData) ? booksData : []), [booksData])
  const newest = useMemo(() => [...books].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [books])
  const arrivals = useMemo(() => collapseSeries(newest).slice(0, 8), [newest])
  const multiSeries = useMemo(() => (Array.isArray(seriesData) ? seriesData : []).filter((series) => series.bookCount >= 2), [seriesData])
  const categories = (Array.isArray(summary?.categories) ? summary.categories : []).filter((category) => category.count > 0)

  const slides = useMemo<Slide[]>(() => {
    const welcome: Slide = {
      key: "welcome",
      eyebrow: "A note from me",
      title: "Welcome to my official website.",
      body: <p>By Whisper 119 — author of <em>Mated to My Mate&apos;s Worst Enemy</em> and <em>Rebirth of the Broken Luna</em>. Loved by 225,000+ readers across platforms.</p>,
      cta: { label: "See my books", href: "/shop" },
      covers: newest.slice(0, 3),
    }
    const seriesSlides: Slide[] = multiSeries.slice(0, 2).map((series) => ({
      key: `series-${series.id}`,
      eyebrow: `Series · ${series.bookCount} books`,
      title: series.name,
      body: <p className="line-clamp-2">{series.description}</p>,
      cta: { label: "Start with Book 1", href: `/series/${series.slug}` },
      covers: books.filter((book) => book.seriesId === series.id).sort((a, b) => (a.seriesNumber ?? 0) - (b.seriesNumber ?? 0)),
    }))
    return [welcome, ...seriesSlides]
  }, [books, multiSeries, newest])

  return (
    <main className="mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-6 sm:pt-8">
      <Reveal><Hero slides={slides} /></Reveal>

      <div className="mt-6"><TrustStrip /></div>

      <section className="mt-10" aria-labelledby="new-arrivals">
        <SectionHeading eyebrow="Just added" title="New arrivals" href="/shop" />
        <span id="new-arrivals" className="sr-only">New arrivals</span>
        {isLoading ? (
          <BookCardSkeletons count={4} rail />
        ) : error && !books.length ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm">
            <p>The shelf could not load.</p>
            <button type="button" onClick={() => void refetch()} disabled={isRefetching} className="mt-3 min-h-11 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60">{isRefetching ? "Trying again…" : "Try again"}</button>
          </div>
        ) : (
          <ShelfRail items={arrivals} label="New arrivals" />
        )}
      </section>

      {categories.length > 0 && (
        <section className="mt-10" aria-labelledby="browse-categories">
          <SectionHeading eyebrow="Explore" title="Browse by category" href="/categories" linkLabel="All categories" />
          <span id="browse-categories" className="sr-only">Browse by category</span>
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
            {categories.slice(0, 12).map((category) => (
              <li key={category.id} className="shrink-0">
                <Link href={`/shop?category=${encodeURIComponent(category.name)}`} className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary">
                  {category.name}<span className="ml-2 text-muted-foreground">{category.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {multiSeries.length > 0 && (
        <section className="mt-10" aria-labelledby="start-a-series">
          <SectionHeading eyebrow="Binge-ready" title="Start a series" />
          <span id="start-a-series" className="sr-only">Start a series</span>
          <Rail label="Series">
            {multiSeries.map((series) => {
              const first = books.find((book) => book.id === series.firstBookId)
              return first ? <RailItem key={series.id}><SeriesCard name={series.name} slug={series.slug} count={series.bookCount} first={first} /></RailItem> : null
            })}
          </Rail>
        </section>
      )}

    </main>
  )
}
