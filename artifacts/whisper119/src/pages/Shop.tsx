import { useState } from "react"
import { useListBooks, useGetStorefrontSummary } from "@workspace/api-client-react"
import { Link } from "wouter"
import { formatPrice } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export default function Shop() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<string | undefined>()

  const { data: books, isLoading, error } = useListBooks({
    search: search || undefined,
    category,
  })

  const { data: summary } = useGetStorefrontSummary()

  return (
    <main className="min-h-screen py-12 px-4 container mx-auto">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-8">
          <div>
            <h3 className="font-serif text-lg mb-4">Search</h3>
            <Input
              type="search"
              placeholder="Titles, authors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent"
            />
          </div>

          <div>
            <h3 className="font-serif text-lg mb-4">Categories</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setCategory(undefined)}
                className={`text-left text-sm py-1 transition-colors ${
                  !category ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Titles
              </button>
              {summary?.categories.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setCategory(c.name)}
                  className={`flex items-center justify-between text-left text-sm py-1 transition-colors ${
                    category === c.name ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{c.count}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          <div className="mb-8 flex items-center justify-between border-b pb-4">
            <h1 className="text-3xl font-serif">
              {category ? category : search ? "Search Results" : "All Books"}
            </h1>
            <span className="text-sm text-muted-foreground tabular-nums">
              {books?.length || 0} results
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-[2/3] w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive">Failed to load books.</p>
          ) : books?.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-muted-foreground text-lg font-serif">No titles found.</p>
              <button
                onClick={() => { setSearch(""); setCategory(undefined); }}
                className="mt-4 text-sm text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {books?.map((book) => (
                <Link key={book.id} href={`/book/${book.id}`} className="group block">
                  <div className="aspect-[2/3] relative mb-4 overflow-hidden bg-muted">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center border-2 border-transparent group-hover:border-foreground/10 transition-colors">
                        <span className="font-serif text-lg leading-tight mb-2">{book.title}</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                      <Badge variant="secondary" className="bg-background/90 backdrop-blur font-mono text-[10px] uppercase">
                        {book.format}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-medium leading-tight group-hover:text-primary/80 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    <p className="text-sm font-medium pt-1">{formatPrice(book.price, book.currency)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
