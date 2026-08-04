import { Search, SlidersHorizontal, X } from "lucide-react"
import { useState } from "react"
import { Link } from "wouter"
import { useGetStorefrontSummary, useListBooks } from "@workspace/api-client-react"
import { BookCard } from "@/components/book-card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

export default function Shop() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string | undefined>()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { data: books, isLoading, error } = useListBooks({ search: search || undefined, category })
  const { data: summary } = useGetStorefrontSummary()

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 sm:px-8 md:py-20">
      <div className="mb-14 max-w-2xl"><p className="rule-label">The catalogue</p><h1 className="mt-4 font-display text-5xl leading-none sm:text-6xl">A shelf worth lingering over.</h1><p className="mt-5 text-base leading-7 text-muted-foreground">Browse the collection by title, author, or mood. Everything here is DRM-free and delivered by email.</p></div>
      <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="mb-8 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted-foreground md:hidden"><SlidersHorizontal className="h-4 w-4" /> Filters</button>
      <div className="grid gap-12 md:grid-cols-[13rem_1fr]">
        <aside className={`${filtersOpen ? "block" : "hidden"} md:block`}>
          <div className="sticky top-28">
            <p className="rule-label">Find a title</p>
            <div className="relative mt-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search titles or authors" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search…" className="h-10 rounded-none border-x-0 border-t-0 bg-transparent pl-9 pr-2 shadow-none focus-visible:ring-0" /></div>
            <div className="mt-10"><p className="rule-label">Browse by category</p><div className="mt-4 grid gap-2">
              <button type="button" onClick={() => setCategory(undefined)} className={`flex items-center justify-between py-1 text-left text-sm ${!category ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}`}><span>All titles</span>{!category && <span>•</span>}</button>
              {summary?.categories.map((item) => <button key={item.name} type="button" onClick={() => setCategory(item.name)} className={`flex items-center justify-between py-1 text-left text-sm ${category === item.name ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}`}><span>{item.name}</span><span className="font-mono text-[0.62rem]">{item.count}</span></button>)}
            </div></div>
          </div>
        </aside>
        <section>
          <div className="mb-8 flex items-end justify-between border-b border-border/70 pb-5"><div><p className="rule-label">{category ?? (search ? "Search results" : "All titles")}</p><h2 className="mt-2 font-display text-2xl">{books?.length ?? 0} {books?.length === 1 ? "book" : "books"}</h2></div>{(search || category) && <button type="button" onClick={() => { setSearch(""); setCategory(undefined) }} className="flex items-center gap-1 font-mono text-[0.62rem] uppercase tracking-[0.13em] text-muted-foreground hover:text-primary">Clear <X className="h-3.5 w-3.5" /></button>}</div>
          {isLoading ? <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item}><Skeleton className="aspect-[2/3] w-full" /><Skeleton className="mt-4 h-5 w-4/5" /><Skeleton className="mt-2 h-4 w-2/5" /></div>)}</div> : error ? <div className="border border-destructive/30 p-8 text-center text-sm text-destructive">Could not load the catalogue.</div> : books?.length ? <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{books.map((book) => <BookCard key={book.id} book={book} />)}</div> : <div className="border border-dashed border-border px-6 py-20 text-center"><p className="font-display text-3xl">Nothing on this shelf yet.</p><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">The shop owner is still choosing the first titles. Clear the filters or check back soon.</p><Link href="/about" className="mt-6 inline-block font-mono text-[0.65rem] uppercase tracking-[0.15em] text-primary">About Whisper 119 →</Link></div>}
        </section>
      </div>
    </main>
  )
}