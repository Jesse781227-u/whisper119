import { Check, Plus } from "lucide-react"
import { Link } from "wouter"
import type { Book } from "@workspace/api-client-react"
import { useCart } from "@/components/cart-provider"
import { formatPrice } from "@/lib/utils"

function Cover({ book, small = false }: { book: Book; small?: boolean }) {
  return (
    <div className={`book-shadow overflow-hidden rounded-sm bg-secondary ${small ? "aspect-[2/3]" : "aspect-[2/3]"}`}>
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={`Cover of ${book.title}`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
      ) : (
        <div className="flex h-full flex-col justify-between bg-[linear-gradient(145deg,hsl(var(--primary)/.92),hsl(var(--accent)/.75))] p-4 text-primary-foreground">
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em]">{book.format} · Whisper 119</span>
          <span className="font-display text-xl leading-tight">{book.title}</span>
        </div>
      )}
    </div>
  )
}

export function BookCard({ book }: { book: Book }) {
  const { items, addItem } = useCart()
  const inCart = items.some((item) => item.id === book.id)

  return (
    <article className="group">
      <Link href={`/book/${book.id}`} className="block hover-lift">
        <Cover book={book} />
      </Link>
      <div className="mt-4">
        <Link href={`/book/${book.id}`}>
          <h3 className="font-display text-[1.1rem] leading-tight transition-colors group-hover:text-primary">{book.title}</h3>
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-xs">{formatPrice(book.price, book.currency)}</span>
          <button
            type="button"
            disabled={inCart}
            onClick={() => addItem(book)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] transition-colors ${
              inCart ? "border-transparent bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            {inCart ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {inCart ? "In cart" : "Add"}
          </button>
        </div>
        <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground">{book.format} · DRM-free</p>
      </div>
    </article>
  )
}

export function BookCover({ book, className = "" }: { book: Book; className?: string }) {
  return (
    <div className={`book-shadow overflow-hidden rounded-sm bg-secondary ${className}`}>
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={`Cover of ${book.title}`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col justify-between bg-[linear-gradient(145deg,hsl(var(--primary)/.92),hsl(var(--accent)/.75))] p-6 text-primary-foreground">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em]">{book.format} · Whisper 119</span>
          <span className="font-display text-2xl leading-tight">{book.title}</span>
        </div>
      )}
    </div>
  )
}