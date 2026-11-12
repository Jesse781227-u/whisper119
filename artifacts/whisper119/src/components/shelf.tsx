import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "wouter"
import { BookCard, SeriesCard } from "@/components/book-card"
import type { ShelfItem } from "@/lib/books"

export function SectionHeading({ eyebrow, title, href, linkLabel = "See all" }: { eyebrow?: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-primary">{eyebrow}</p>}
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="flex min-h-11 shrink-0 items-center gap-0.5 text-sm font-bold text-primary hover:text-primary/80">
          {linkLabel} <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

/** Horizontal, snap-scrolling row of cards (bleeds to the screen edge on mobile). */
export function Rail({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="list" aria-label={label} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6">
      {children}
    </div>
  )
}

export function RailItem({ children }: { children: ReactNode }) {
  return <div role="listitem" className="w-[42vw] max-w-[13rem] shrink-0 snap-start sm:w-48">{children}</div>
}

export function ShelfRail({ items, label }: { items: ShelfItem[]; label: string }) {
  return (
    <Rail label={label}>
      {items.map((item) => (
        <RailItem key={item.kind === "book" ? item.book.id : item.key}>
          {item.kind === "book" ? <BookCard book={item.book} /> : <SeriesCard name={item.name} slug={item.slug} count={item.count} first={item.first} />}
        </RailItem>
      ))}
    </Rail>
  )
}

/** Grid placeholders shaped like book cards. */
export function BookCardSkeletons({ count = 8, rail = false }: { count?: number; rail?: boolean }) {
  const cards = Array.from({ length: count }, (_, index) => (
    <div key={index} className={rail ? "w-[42vw] max-w-[13rem] shrink-0 sm:w-48" : ""} aria-hidden="true">
      <div className="aspect-[2/3] animate-pulse rounded-xl bg-secondary motion-reduce:animate-none" />
      <div className="mt-2.5 h-4 w-4/5 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
      <div className="mt-1.5 h-4 w-1/3 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
    </div>
  ))
  return rail ? <div className="flex gap-4 overflow-hidden" role="status" aria-label="Loading books">{cards}</div> : <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4" role="status" aria-label="Loading books">{cards}</div>
}
