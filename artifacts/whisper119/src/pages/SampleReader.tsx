import { ArrowLeft, Minus, Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Link, useLocation, useParams } from "wouter"
import { useGetBook, useGetBookSample } from "@workspace/api-client-react"
import { useCart } from "@/components/cart-provider"
import { useToast } from "@/hooks/use-toast"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { fullTitle } from "@/lib/books"
import { formatPrice } from "@/lib/utils"

const FONT_SIZES = [16, 18, 20, 22, 24]

function readStoredSize(): number {
  try {
    const value = Number(localStorage.getItem("whisper-reader-size"))
    return FONT_SIZES.includes(value) ? value : 18
  } catch {
    return 18
  }
}

/** Full-screen, dark reader for a book's free sample (never the paid file). */
export default function SampleReader() {
  const { bookId } = useParams<{ bookId: string }>()
  const [, setLocation] = useLocation()
  const { data: book } = useGetBook(bookId ?? "", { query: { queryKey: ["/api/books", bookId], enabled: Boolean(bookId) } })
  const { data: sample, isLoading, error } = useGetBookSample(bookId ?? "", { query: { queryKey: ["/api/books", bookId, "sample"], enabled: Boolean(bookId) } })
  const { items, addItem } = useCart()
  const { toast } = useToast()
  const [size, setSize] = useState(readStoredSize)
  const [atEnd, setAtEnd] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useDocumentTitle(book ? `Free sample: ${fullTitle(book)}` : "Free sample")

  useEffect(() => {
    try { localStorage.setItem("whisper-reader-size", String(size)) } catch { /* optional */ }
  }, [size])

  useEffect(() => {
    const node = endRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setAtEnd(true) })
    observer.observe(node)
    return () => observer.disconnect()
  }, [sample?.text])

  const inCart = Boolean(book && items.some((item) => item.id === book.id))
  function getFullBook() {
    if (!book) return
    if (!inCart) {
      addItem(book)
      toast({ title: "Added to cart", description: fullTitle(book) })
    }
    setLocation("/cart")
  }

  const paragraphs = (sample?.text ?? "").split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
  const showCta = Boolean(book) && (atEnd || Boolean(sample?.pdfUrl && !sample.text))

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0f0b17] text-[#ece4ee]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-2 sm:px-4">
        <Link href={`/book/${bookId}`} aria-label="Back to book" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Link>
        <p className="min-w-0 flex-1 truncate text-sm font-bold">{book ? fullTitle(book) : "Free sample"}</p>
        {sample?.text && (
          <div className="flex items-center gap-1" role="group" aria-label="Text size">
            <button type="button" aria-label="Smaller text" disabled={size === FONT_SIZES[0]} onClick={() => setSize(FONT_SIZES[Math.max(0, FONT_SIZES.indexOf(size) - 1)])} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40"><Minus className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" aria-label="Larger text" disabled={size === FONT_SIZES[FONT_SIZES.length - 1]} onClick={() => setSize(FONT_SIZES[Math.min(FONT_SIZES.length - 1, FONT_SIZES.indexOf(size) + 1)])} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-white/60">Opening the sample…</p>
        ) : error || !sample ? (
          <p className="p-8 text-center text-sm text-white/70">This book doesn’t have a free sample yet.</p>
        ) : sample.text ? (
          <article className="mx-auto max-w-[38rem] px-5 pb-40 pt-8 font-serif" style={{ fontSize: `${size}px`, lineHeight: 1.75 }}>
            <p className="mb-6 font-sans text-xs font-bold uppercase tracking-[0.15em] text-[#e78fb0]">Free sample</p>
            {paragraphs.map((paragraph, index) => <p key={index} className="mb-[1em] whitespace-pre-wrap">{paragraph}</p>)}
            <div ref={endRef} className="mt-10 border-t border-white/10 pt-6 text-center font-sans text-sm text-white/60">End of the free sample</div>
          </article>
        ) : sample.pdfUrl ? (
          <iframe src={sample.pdfUrl} title="Free sample PDF" className="h-full w-full bg-white" />
        ) : null}
      </div>

      {showCta && book && (
        <div className="shrink-0 border-t border-white/10 bg-[#171124] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-[38rem] items-center justify-between gap-3">
            <p className="text-sm font-bold">Enjoying it?</p>
            <button type="button" onClick={getFullBook} className="h-12 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground">
              Get the full book — {formatPrice(book.price, "USD", "en-US")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
