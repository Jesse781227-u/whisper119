import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react"
import { useMemo, useState } from "react"
import { Link, useLocation } from "wouter"
import { useGetStorefrontSummary, useListBooks } from "@workspace/api-client-react"
import { BookCard } from "@/components/book-card"
import { Skeleton } from "@/components/ui/skeleton"

type FormatFilter = "" | "PDF" | "EPUB"

function initialQuery() {
  const params = new URLSearchParams(window.location.search)
  return {
    category: params.get("category") ?? "",
    search: params.get("search") ?? "",
    format: (params.get("format") === "PDF" || params.get("format") === "EPUB" ? params.get("format") : "") as FormatFilter,
    maxPrice: params.get("maxPrice") ?? "",
  }
}

export default function Shop() {
  const initial = useMemo(initialQuery, [])
  const [, setLocation] = useLocation()
  const [search, setSearch] = useState(initial.search)
  const [category, setCategory] = useState(initial.category)
  const [format, setFormat] = useState<FormatFilter>(initial.format)
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { data: books, isLoading, error, refetch, isRefetching } = useListBooks(
    {
      search: search || undefined,
      category: category || undefined,
      format: format || undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    },
    {
      query: {
        queryKey: ["/api/books", {
          search: search || undefined,
          category: category || undefined,
          format: format || undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
        }],
        retry: 3,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 3000),
        placeholderData: (previousBooks) => previousBooks,
      },
    },
  )
  const { data: summary } = useGetStorefrontSummary()
  const hasFilters = Boolean(search || category || format || maxPrice)

  function updateUrl(next: { search?: string; category?: string; format?: FormatFilter; maxPrice?: string }) {
    const params = new URLSearchParams()
    const values = {
      search,
      category,
      format,
      maxPrice,
      ...next,
    }
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
    setLocation("/shop")
  }

  function selectCategory(value: string) {
    setCategory(value)
    updateUrl({ category: value })
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-7 sm:px-6 sm:pt-10">
      <div className="mb-7">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">The catalogue</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Find your next book</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Browse carefully chosen digital titles. Every book is DRM-free and delivered by email after payment.</p>
      </div>

      <div className="relative mb-5 md:hidden">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          aria-label="Search the catalogue"
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
                <button type="button" onClick={() => selectCategory("")} className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${!category ? "bg-primary/10 font-bold text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                  All books
                  {summary?.categories.reduce((total, item) => total + item.count, 0) ? <span className="text-[0.65rem]">{summary.categories.reduce((total, item) => total + item.count, 0)}</span> : null}
                </button>
                {summary?.categories.map((item) => (
                  <button key={item.name} type="button" onClick={() => selectCategory(item.name)} className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${category === item.name ? "bg-primary/10 font-bold text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                    {item.name}<span className="text-[0.65rem]">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-bold text-foreground">Format</p>
              <div className="flex flex-wrap gap-2">
                {(["", "PDF", "EPUB"] as FormatFilter[]).map((value) => (
                  <button key={value || "all"} type="button" onClick={() => { setFormat(value); updateUrl({ format: value }) }} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${format === value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary"}`}>
                    {value || "All"}
                  </button>
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
          <div className="mb-5 flex items-end justify-between border-b border-border pb-4">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">{category || (search ? "Search results" : "All titles")}</p>
              <h2 className="mt-1 text-xl font-extrabold">{isLoading ? "Finding books…" : `${books?.length ?? 0} ${books?.length === 1 ? "book" : "books"}`}</h2>
            </div>
            {hasFilters && <button type="button" onClick={clearFilters} aria-label="Clear filters" className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary">Reset <X className="h-4 w-4" /></button>}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((item) => <div key={item}><Skeleton className="aspect-[0.69] w-full rounded-xl" /><Skeleton className="mt-3 h-4 w-4/5" /><Skeleton className="mt-2 h-3 w-2/5" /></div>)}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">
              <p>Could not load the catalogue. Please try again shortly.</p>
              <button type="button" onClick={() => void refetch()} disabled={isRefetching} className="mt-4 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-opacity disabled:opacity-60">
                {isRefetching ? "Trying again…" : "Try again"}
              </button>
            </div>
          ) : books?.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{books.map((book) => <BookCard key={book.id} book={book} />)}</div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center">
              <p className="text-2xl font-extrabold">Nothing on this shelf yet.</p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{hasFilters ? "Try clearing your filters or search for something else." : "The shop owner is still choosing the first titles. Check back soon."}</p>
              {hasFilters ? <button type="button" onClick={clearFilters} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground">Clear filters</button> : <Link href="/about" className="mt-5 inline-block text-xs font-bold text-primary">About Whisper 119 →</Link>}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}