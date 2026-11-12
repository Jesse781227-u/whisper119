import { ArrowRight, Layers } from "lucide-react"
import { Link, useParams } from "wouter"
import { useGetSeries } from "@workspace/api-client-react"
import { BookCard } from "@/components/book-card"
import { BookCardSkeletons } from "@/components/shelf"
import { useDocumentTitle } from "@/hooks/use-document-title"

export default function Series() {
  const { seriesSlug } = useParams<{ seriesSlug: string }>()
  const { data, isLoading, error } = useGetSeries(seriesSlug ?? "", { query: { queryKey: ["/api/series", seriesSlug], enabled: Boolean(seriesSlug) } })
  useDocumentTitle(data?.series.name)

  if (isLoading) {
    return <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6"><div className="h-10 w-2/3 animate-pulse rounded bg-secondary" /><div className="mt-8"><BookCardSkeletons count={4} /></div></main>
  }
  if (error || !data) {
    return <main className="mx-auto max-w-3xl px-4 py-32 text-center"><p className="text-2xl font-extrabold">This series isn’t on the shelf.</p><Link href="/shop" className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-primary">Browse all books →</Link></main>
  }

  const { series, books } = data
  const first = books[0]
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <nav aria-label="Breadcrumb" className="hidden text-sm text-muted-foreground md:block">
        <Link href="/" className="hover:text-foreground">Home</Link> / <Link href="/shop" className="hover:text-foreground">Books</Link> / <span className="font-semibold text-foreground">{series.name}</span>
      </nav>
      <header className="mt-2 max-w-3xl md:mt-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-primary"><Layers className="h-4 w-4" aria-hidden="true" /> Series · {series.bookCount} books</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">{series.name}</h1>
        {series.description && <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{series.description}</p>}
        {first && (
          <Link href={`/book/${first.id}`} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20">
            Start with Book {first.seriesNumber ?? 1} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </header>
      <section className="mt-10" aria-label="Books in reading order">
        <h2 className="mb-4 text-xl font-extrabold">In reading order</h2>
        <ol className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((book) => <li key={book.id}><BookCard book={book} /></li>)}
        </ol>
      </section>
    </main>
  )
}
