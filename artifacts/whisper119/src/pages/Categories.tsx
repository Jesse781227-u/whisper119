import { Search } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "wouter"
import { useGetStorefrontSummary } from "@workspace/api-client-react"

export default function Categories() {
  const { data, isLoading } = useGetStorefrontSummary()
  const [search, setSearch] = useState("")
  const categories = Array.isArray(data?.categories) ? data.categories : []
  const visible = useMemo(() => categories.filter(category => category.name.toLowerCase().includes(search.toLowerCase())), [categories, search])

  return <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
    <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">Browse the shelf</p>
    <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">All categories</h1>
    <div className="relative mt-7 max-w-xl"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input aria-label="Search categories" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a category" className="h-12 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></div>
    {isLoading ? <p className="mt-10 text-sm text-muted-foreground">Loading categories...</p> : visible.length ? <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map(category => <Link key={category.id} href={`/shop?category=${encodeURIComponent(category.name)}`} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary hover:bg-primary/5"><span className="text-sm font-extrabold">{category.name}</span><span className="text-xs font-bold text-muted-foreground">{category.count}</span></Link>)}</div> : <p className="mt-10 text-sm text-muted-foreground">No categories match that search.</p>}
  </main>
}
