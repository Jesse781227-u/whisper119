import { useDocumentTitle } from "@/hooks/use-document-title"
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"
import { useMemo, useState } from "react"
import { Link, useLocation } from "wouter"
import { useGetStorefrontSummary, useListBooks } from "@workspace/api-client-react"
import { BookCard } from "@/components/book-card"
import { BookCardSkeletons } from "@/components/shelf"
import type { Book } from "@workspace/api-client-react"
import { displayTitle } from "@/lib/books"
import { Skeleton } from "@/components/ui/skeleton"
import { useSiteLanguage } from "@/hooks/use-site-language"
import { Reveal, Stagger, fadeUpVariants } from "@/lib/motion"
import { motion, useReducedMotion } from "framer-motion"

type FormatFilter = "" | "PDF" | "EPUB"
type SortOrder = "newest" | "az" | "series" | "price"

const SORT_LABELS: Record<SortOrder, string> = { newest: "Newest", az: "A–Z", series: "Series order", price: "Price: low to high" }

function sortBooks(books: Book[], order: SortOrder): Book[] {
  const list = [...books]
  switch (order) {
    case "az": return list.sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)) || (a.seriesNumber ?? 0) - (b.seriesNumber ?? 0))
    case "series": return list.sort((a, b) => (a.seriesName ?? a.title).localeCompare(b.seriesName ?? b.title) || (a.seriesNumber ?? 0) - (b.seriesNumber ?? 0))
    case "price": return list.sort((a, b) => a.price - b.price)
    default: return list.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  }
}

function initialQuery() {
  const params = new URLSearchParams(window.location.search)
  return {
    category: params.get("category") ?? "",
    search: params.get("search") ?? "",
    format: (params.get("format") === "PDF" || params.get("format") === "EPUB" ? params.get("format") : "") as FormatFilter,
    maxPrice: params.get("maxPrice") ?? "",
    sort: (["newest", "az", "series", "price"].includes(params.get("sort") ?? "") ? params.get("sort") : "newest") as SortOrder,
  }
}

export default function Shop() {
  useDocumentTitle("All books")
  const initial = useMemo(initialQuery, [])
  const [, setLocation] = useLocation()
  const [search, setSearch] = useState(initial.search)
  const [category, setCategory] = useState(initial.category)
  const [format, setFormat] = useState<FormatFilter>(initial.format)
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice)
  const [sort, setSort] = useState<SortOrder>(initial.sort)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const language = useSiteLanguage()
  const prefersReducedMotion = useReducedMotion()
  const { data: booksData, isLoading, error, refetch, isRefetching } = useListBooks(
    {
      language,
      search: search || undefined,
      category: category || undefined,
      format: format || undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    },
    {
      query: {
        queryKey: ["/api/books", {
          language,
          search: search || undefined,
          category: category || undefined,
          format: format || undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
        }],
        retry: 3,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 3000),
      },
    },
  )
  const { data: summary } = useGetStorefrontSummary({ language }, { query: { queryKey: ["/api/storefront/summary", { language }] } })
  const books = sortBooks(Array.isArray(booksData) ? booksData : [], sort)
  const categories = Array.isArray(summary?.categories) ? summary.categories : []
  const hasFilters = Boolean(search || category || format || maxPrice)

  function updateUrl(next: { search?: string; category?: string; format?: FormatFilter; maxPrice?: string; sort?: SortOrder }) {
    const params = new URLSearchParams()
    const values = {
      search,
      category,
      format,
      maxPrice,
      sort: sort === "newest" ? "" : sort,
      ...next,
    }
    if (values.sort === "newest") values.sort = ""
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const query = params.toString()
    setLocation(query ? `/shop?${query}` : "/shop")
  }

  function clearFilters() {
    setSearch("")
    setCategory("")
    setFormat("")
    setMaxPrice("")
    setLocation(sort === "newest" ? "/shop" : `/shop?sort=${sort}`)
  }

  function selectCategory(value: string) {
    setCategory(value)
    updateUrl({ category: value })
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-7 sm:px-6 sm:pt-10">
      <Reveal className="mb-7">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">My books</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Have a look around.</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">These are the books I’ve written, each available as a PDF ebook delivered to your email.</p>
      </Reveal>

      <div className="relative mb-5 md:hidden">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          aria-label="Search the catalogue"
          autoFocus={new URLSearchParams(window.location.search).get("focus") === "search"}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            updateUrl({ search: event.target.value })
          }}
          placeholder="Search titles or authors"
          className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15 md:hidden">
        <SlidersHorizontal className="h-4 w-4" /> Filters
        {hasFilters && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] text-primary-foreground">!</span>}
      </button>

      <div className="grid gap-7 md:grid-cols-[13rem_1fr] lg:grid-cols-[15rem_1fr]">
        <aside className={`${filtersOpen ? "block" : "hidden"} rounded-2xl border border-border bg-card p-5 md:block md:border-0 md:bg-transparent md:p-0`}>
          <div className="sticky top-32">
            <div className="mb-5 flex items-center justify-between md:block">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Filters</p>
              {hasFilters && <button type="button" onClick={clearFilters} className="text-xs font-bold text-primary hover:underline">Clear all</button>}
            </div>

            <label className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Search titles or authors"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  updateUrl({ search: event.target.value })
                }}
                placeholder="Search books"
                className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-2 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <div className="mt-6">
              <p className="mb-3 text-xs font-bold text-foreground">Category</p>
              <div className="grid gap-1">
                <motion.button type="button" onClick={() => selectCategory("")} animate={{ backgroundColor: !category ? "hsl(var(--primary) / 0.1)" : "transparent", color: !category ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} transition={{ duration: prefersReducedMotion ? 0 : 0.2 }} className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-secondary hover:text-foreground">
                  All books
                </motion.button>
                {categories.filter((item) => item.count > 0 || item.name === category).map((item) => (
                  <motion.button key={item.name} type="button" onClick={() => selectCategory(item.name)} animate={{ backgroundColor: category === item.name ? "hsl(var(--primary) / 0.1)" : "transparent", color: category === item.name ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} transition={{ duration: prefersReducedMotion ? 0 : 0.2 }} className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-secondary hover:text-foreground">
                    {item.name}<span className="text-[0.65rem]">{item.count}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-bold text-foreground">Format</p>
              <div className="flex flex-wrap gap-2">
                {(["", "PDF", "EPUB"] as FormatFilter[]).map((value) => (
                  <motion.button key={value || "all"} type="button" onClick={() => { setFormat(value); updateUrl({ format: value }) }} animate={{ backgroundColor: format === value ? "hsl(var(--primary))" : "hsl(var(--secondary))", color: format === value ? "hsl(var(--primary-foreground))" : "hsl(var(--secondary-foreground))" }} transition={{ duration: prefersReducedMotion ? 0 : 0.2 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }} className="rounded-full px-3 py-1.5 text-xs font-bold hover:bg-primary/10 hover:text-primary">
                    {value || "All"}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-bold text-foreground">Price</p>
              <div className="relative">
                <select value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); updateUrl({ maxPrice: event.target.value }) }} className="h-10 w-full appearance-none rounded-xl border border-border bg-card px-3 pr-8 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10">
                  <option value="">Any price</option>
                  <option value="5">Under $5</option>
                  <option value="10">Under $10</option>
                  <option value="20">Under $20</option>
                  <option value="50">Under $50</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <button type="button" onClick={() => setFiltersOpen(false)} className="mt-7 w-full rounded-full bg-primary py-3 text-xs font-bold text-primary-foreground md:hidden">Show results</button>
          </div>
        </aside>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <p className="flex min-w-0 flex-wrap items-center gap-2 text-sm" aria-live="polite">
              {category ? (
                <button type="button" onClick={() => selectCategory("")} aria-label={`Remove filter: ${category}`} className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full bg-primary/15 px-3 font-bold text-primary">
                  <span className="truncate">{category}</span><X className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
              ) : search ? (
                <span className="font-bold">Results for “{search}”</span>
              ) : (
                <span className="font-bold">All books</span>
              )}
              <span className="text-muted-foreground">· {isLoading ? "…" : `${books.length} ${books.length === 1 ? "book" : "books"}`}</span>
            </p>
            <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              Sort
              <select value={sort} onChange={(event) => { const value = event.target.value as SortOrder; setSort(value); updateUrl({ sort: value }) }} className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground">
                {(Object.keys(SORT_LABELS) as SortOrder[]).map((value) => <option key={value} value={value}>{SORT_LABELS[value]}</option>)}
              </select>
            </label>
          </div>

          {isLoading ? (
            <BookCardSkeletons count={8} />
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">
              <p>Could not load the catalogue. Please try again shortly.</p>
              <button type="button" onClick={() => void refetch()} disabled={isRefetching} className="mt-4 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-opacity disabled:opacity-60">
                {isRefetching ? "Trying again…" : "Try again"}
              </button>
            </div>
          ) : books.length ? (
            <Stagger className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{books.map((book, index) => <Reveal key={book.id} variants={fadeUpVariants}><BookCard book={book} eager={index < 4} /></Reveal>)}</Stagger>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
              <p className="text-2xl font-extrabold">Nothing on this shelf yet.</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{hasFilters ? "Try clearing your filters or search for something else." : "This shelf is empty right now."}</p>
              {hasFilters ? <button type="button" onClick={clearFilters} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground">Clear filters</button> : <Link href="/about" className="mt-5 inline-block text-xs font-bold text-primary">About Whisper 119 →</Link>}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
