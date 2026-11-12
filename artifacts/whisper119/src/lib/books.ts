import type { Book } from "@workspace/api-client-react"

/** Title to show on cards: the series name for series volumes. */
export function displayTitle(book: Book): string {
  return book.seriesName ?? book.title
}

/** "Book 5" for series volumes, otherwise null. */
export function volumeLabel(book: Book): string | null {
  return book.seriesName && book.seriesNumber ? `Book ${book.seriesNumber}` : null
}

/** Full name for headings and alt text, e.g. "Rebirth of the Broken Luna, Book 5". */
export function fullTitle(book: Book): string {
  const volume = volumeLabel(book)
  return volume ? `${book.seriesName}, ${volume}` : book.title
}

/**
 * Responsive sources for covers served from our /img route (resized at the
 * edge). Other URLs (legacy or external) are used as-is.
 */
export function coverSources(url: string | null | undefined, largest: 300 | 600 | 900 = 600) {
  if (!url) return null
  if (!url.includes("/img/")) return { src: url, srcSet: undefined }
  const widths = [300, 600, 900].filter((width) => width <= largest)
  return {
    src: `${url}?w=${largest}`,
    srcSet: widths.map((width) => `${url}?w=${width} ${width}w`).join(", "),
  }
}

export type ShelfItem =
  | { kind: "book"; book: Book }
  | { kind: "series"; key: string; name: string; slug: string; count: number; first: Book }

/**
 * Collapses series volumes into one entry so a shelf never shows several
 * near-identical covers. Series with a single published volume stay a book.
 */
export function collapseSeries(books: Book[]): ShelfItem[] {
  const bySeries = new Map<string, Book[]>()
  for (const book of books) {
    if (book.seriesId) bySeries.set(book.seriesId, [...(bySeries.get(book.seriesId) ?? []), book])
  }
  const seen = new Set<string>()
  const items: ShelfItem[] = []
  for (const book of books) {
    const volumes = book.seriesId ? bySeries.get(book.seriesId) ?? [] : []
    if (!book.seriesId || volumes.length < 2) {
      items.push({ kind: "book", book })
      continue
    }
    if (seen.has(book.seriesId)) continue
    seen.add(book.seriesId)
    const first = [...volumes].sort((a, b) => (a.seriesNumber ?? 99) - (b.seriesNumber ?? 99))[0]
    items.push({ kind: "series", key: book.seriesId, name: book.seriesName ?? first.title, slug: book.seriesSlug ?? "", count: volumes.length, first })
  }
  return items
}
