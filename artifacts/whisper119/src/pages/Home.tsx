import { useGetStorefrontSummary } from "@workspace/api-client-react"
import { Link } from "wouter"
import { formatPrice } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export default function Home() {
  const { data: summary, isLoading, error } = useGetStorefrontSummary()

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-secondary/30 border-b py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-5xl md:text-7xl font-serif mb-6 text-foreground">
            A small shop with a long reading list.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            No warehouse, no algorithm and no recommendations engine — just a shelf of titles chosen carefully and sold as clean, DRM-free EPUB and PDF files.
          </p>
          <Link
            href="/shop"
            className="inline-flex h-12 items-center justify-center bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse the Catalogue
          </Link>
        </div>
      </section>

      {/* Featured Books */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-serif">Featured Titles</h2>
            <Link href="/shop" className="text-sm font-medium hover:underline underline-offset-4">
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-[2/3] w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-destructive">Failed to load storefront.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {summary?.featured.map((book) => (
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
                        <span className="text-xs text-muted-foreground">{book.author}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-serif font-medium leading-tight group-hover:text-primary/80 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
                  <p className="text-sm font-medium mt-2">{formatPrice(book.price, book.currency)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-20 px-4 bg-secondary/20">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-serif mb-12">New Arrivals</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-24 aspect-[2/3]" />
                  <div className="flex-1 space-y-2 py-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {summary?.newArrivals.map((book) => (
                <Link key={book.id} href={`/book/${book.id}`} className="group flex gap-6 items-start">
                  <div className="w-24 shrink-0 aspect-[2/3] bg-muted relative overflow-hidden">
                    {book.coverUrl && (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex flex-col justify-center py-2">
                    <h3 className="font-serif leading-snug group-hover:underline underline-offset-2 decoration-foreground/30">
                      {book.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
                    <p className="text-sm mt-2">{formatPrice(book.price, book.currency)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
