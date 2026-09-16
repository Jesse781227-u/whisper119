import { Check, Plus } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Link } from "wouter"
import { useState } from "react"
import type { Book } from "@workspace/api-client-react"
import { useCart } from "@/components/cart-provider"
import { ConvertedPrice } from "@/components/converted-price"
import { useToast } from "@/hooks/use-toast"

function CoverArtwork({ book }: { book: Book }) {
  const [loaded, setLoaded] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  return (
    <div className="relative aspect-[0.69] overflow-hidden rounded-xl bg-secondary book-shadow">
      {book.coverUrl ? (
        <>
          {!loaded && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-muted" />}
          <motion.img
          src={book.coverUrl}
          alt={`Cover of ${book.title}`}
            onLoad={() => setLoaded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: loaded ? 1 : 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: "easeOut" }}
            className="h-full w-full object-cover"
          />
        </>
      ) : (
        <div className="flex h-full flex-col justify-between bg-[linear-gradient(145deg,hsl(var(--primary)),hsl(224_70%_32%))] p-3 text-primary-foreground">
          <span className="text-[0.55rem] font-bold uppercase tracking-[0.14em]">{book.format} · Whisper 119</span>
          <span className="text-lg font-extrabold leading-[1.05]">{book.title}</span>
        </div>
      )}
      <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-[0.6rem] font-bold text-white backdrop-blur-sm">
        {book.format} · {book.language.toUpperCase()}
      </span>
      <span className="absolute bottom-2 right-2 rounded-md bg-white/95 px-2 py-1 text-[0.6rem] font-extrabold text-slate-900 shadow-sm dark:bg-slate-950/90 dark:text-white">
        <ConvertedPrice amountUsd={book.price} />
      </span>
    </div>
  )
}

export function BookCard({ book }: { book: Book }) {
  const { items, addItem } = useCart()
  const { toast } = useToast()
  const prefersReducedMotion = useReducedMotion()
  const inCart = items.some((item) => item.id === book.id)

  return (
    <motion.article className="group min-w-0" whileHover={prefersReducedMotion ? undefined : { y: -4, scale: 1.01 }} transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: "easeOut" }}>
      <Link href={`/book/${book.id}`} className="block hover-lift">
        <CoverArtwork book={book} />
      </Link>
      <div className="mt-2.5 min-w-0">
        <div className="flex items-start justify-between gap-1.5">
          <Link href={`/book/${book.id}`} className="min-w-0">
            <h3 className="line-clamp-2 text-[0.78rem] font-bold leading-[1.25] text-foreground transition-colors group-hover:text-primary sm:text-sm">
              {book.title}
            </h3>
          </Link>
          <motion.button
            type="button"
            aria-label={inCart ? `${book.title} is in cart` : `Add ${book.title} to cart`}
            disabled={inCart}
            onClick={() => { addItem(book); toast({ title: "Added to cart", description: book.title }) }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
            className={`mt-[-0.1rem] flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
              inCart
                ? "bg-accent text-accent-foreground"
                : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            {inCart ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />}
          </motion.button>
        </div>
        <p className="mt-1 truncate text-[0.68rem] text-muted-foreground sm:text-xs">{book.author}</p>
        <p className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-primary/80"> · email delivery</p>
      </div>
    </motion.article>
  )
}

export function BookCover({ book, className = "" }: { book: Book; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-secondary book-shadow ${className}`}>
      {book.coverUrl ? (
        <img src={book.coverUrl} alt={`Cover of ${book.title}`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col justify-between bg-[linear-gradient(145deg,hsl(var(--primary)),hsl(224_70%_32%))] p-6 text-primary-foreground">
          <span className="text-[0.62rem] font-bold uppercase tracking-[0.15em]">{book.format} · Whisper 119</span>
          <span className="text-2xl font-extrabold leading-tight">{book.title}</span>
        </div>
      )}
    </div>
  )
}
