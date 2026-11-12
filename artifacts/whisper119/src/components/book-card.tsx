import { Check, Layers, ShoppingCart } from "lucide-react"
import { Link, useLocation } from "wouter"
import { useState } from "react"
import type { Book } from "@workspace/api-client-react"
import { useCart } from "@/components/cart-provider"
import { ConvertedPrice } from "@/components/converted-price"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import { coverSources, displayTitle, fullTitle, volumeLabel } from "@/lib/books"

type CoverProps = {
  url: string | null | undefined
  alt: string
  sizes?: string
  eager?: boolean
  className?: string
  fallbackTitle?: string
}

/** Cover with a shimmer placeholder; nothing is drawn on top until it loads. */
export function CoverImage({ url, alt, sizes = "(min-width: 768px) 220px, 45vw", eager = false, className = "", fallbackTitle }: CoverProps) {
  const [loaded, setLoaded] = useState(false)
  const sources = coverSources(url, eager ? 900 : 600)
  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-xl bg-secondary book-shadow ${className}`}>
      {sources ? (
        <>
          {!loaded && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,hsl(var(--secondary))_30%,hsl(var(--muted))_50%,hsl(var(--secondary))_70%)] bg-[length:200%_100%] motion-reduce:animate-none" />}
          <img
            src={sources.src}
            srcSet={sources.srcSet}
            sizes={sources.srcSet ? sizes : undefined}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={eager ? "high" : undefined}
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 motion-reduce:transition-none ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        </>
      ) : (
        <div className="flex h-full items-end bg-[linear-gradient(145deg,hsl(var(--primary)),hsl(276_45%_28%))] p-3 text-primary-foreground">
          <span className="text-base font-extrabold leading-tight">{fallbackTitle ?? alt}</span>
        </div>
      )}
    </div>
  )
}

function SeriesBadge({ label }: { label: string }) {
  return <span className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-1 text-[0.65rem] font-extrabold text-white backdrop-blur-sm">{label}</span>
}

export function AddToCartButton({ book, compact = true }: { book: Book; compact?: boolean }) {
  const { items, addItem } = useCart()
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const inCart = items.some((item) => item.id === book.id)
  const name = fullTitle(book)

  function add() {
    if (inCart) { setLocation("/cart"); return }
    addItem(book)
    toast({
      title: "Added to cart",
      description: name,
      action: <ToastAction altText="View cart" onClick={() => setLocation("/cart")}>View cart</ToastAction>,
    })
  }

  return (
    <button
      type="button"
      onClick={add}
      aria-label={inCart ? `${name} is in your cart. View cart` : `Add ${name} to cart`}
      className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${compact ? "w-11" : "px-4"} ${
        inCart ? "bg-accent/15 text-accent" : "bg-primary text-primary-foreground hover:bg-primary/90"
      }`}
    >
      {inCart ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
      {!compact && <span>{inCart ? "In cart" : "Add"}</span>}
    </button>
  )
}

export function BookCard({ book, eager = false }: { book: Book; eager?: boolean }) {
  const volume = volumeLabel(book)
  return (
    <article className="group min-w-0">
      <Link href={`/book/${book.id}`} className="relative block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CoverImage url={book.coverUrl} alt={`${fullTitle(book)} cover`} eager={eager} fallbackTitle={displayTitle(book)} />
        {volume && <SeriesBadge label={volume} />}
        {book.hasSample && <span className="absolute bottom-2 left-2 rounded-md bg-accent px-2 py-1 text-[0.6rem] font-extrabold uppercase tracking-wide text-accent-foreground">Free sample</span>}
      </Link>
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <Link href={`/book/${book.id}`} className="min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary">{displayTitle(book)}</h3>
          {volume && <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{volume}</p>}
          <p className="mt-1 text-sm"><ConvertedPrice amountUsd={book.price} /></p>
        </Link>
        <AddToCartButton book={book} />
      </div>
    </article>
  )
}

export function SeriesCard({ name, slug, count, first }: { name: string; slug: string; count: number; first: Book }) {
  return (
    <article className="group min-w-0">
      <Link href={`/series/${slug}`} className="relative block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="relative">
          <div aria-hidden="true" className="absolute inset-x-3 -top-1.5 h-4 rounded-t-xl bg-muted/70" />
          <CoverImage url={first.coverUrl} alt={`${name} cover`} fallbackTitle={name} />
        </div>
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 text-[0.65rem] font-extrabold text-white backdrop-blur-sm">
          <Layers className="h-3 w-3" aria-hidden="true" /> {count} books
        </span>
      </Link>
      <Link href={`/series/${slug}`} className="mt-2.5 block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug transition-colors group-hover:text-primary">{name}</h3>
        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">Series · {count} books</p>
        <p className="mt-1 text-sm"><span className="text-xs font-semibold text-muted-foreground">From </span><ConvertedPrice amountUsd={first.price} /></p>
      </Link>
    </article>
  )
}

/** The cover alone, for the book page hero. */
export function BookCover({ book, className = "" }: { book: Book; className?: string }) {
  return <CoverImage url={book.coverUrl} alt={`${fullTitle(book)} cover`} eager sizes="(min-width: 768px) 360px, 70vw" className={className} fallbackTitle={displayTitle(book)} />
}
