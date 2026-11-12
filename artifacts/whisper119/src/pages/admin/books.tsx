import { useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { BookOpen, FileText, MoreVertical, Pencil, Plus, Search, Star, Trash2 } from "lucide-react"
import {
  getGetAdminDashboardQueryKey, getGetStorefrontSummaryQueryKey, getListAdminBooksQueryKey, getListBooksQueryKey,
  useDeleteBook,
} from "@workspace/api-client-react"
import type { Book } from "@workspace/api-client-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { formatPrice } from "@/lib/utils"
import { BookFormModal } from "./book-form"
import { ConfirmDialog, EmptyState, FilterChips, MAX_TAGS, RowSkeletons, cardClass, errorMessage, fieldClass, iconButton, neutralChip, primaryButton } from "./shared"

export type BookFilter = "all" | "featured" | "nocover" | "series" | "tags"

function BookRow({ book, onEdit, onDelete }: { book: Book; onEdit: () => void; onDelete: () => void }) {
  const shownTags = book.categories.slice(0, 2)
  const extra = book.categories.length - shownTags.length
  const overTagged = book.categories.length > MAX_TAGS
  const displayTitle = book.seriesName && book.seriesNumber ? `${book.seriesName}, Book ${book.seriesNumber}` : book.title
  return (
    <li className="flex min-w-0 items-start gap-3 p-3 sm:p-4">
      <button type="button" onClick={onEdit} aria-label={`Edit ${displayTitle}`} className="flex h-16 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-muted-foreground">
        {book.coverUrl ? <img src={book.coverUrl.includes("/img/") ? `${book.coverUrl}?w=300` : book.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-extrabold leading-snug">
          {book.featured && <Star className="mr-1 inline h-3.5 w-3.5 -translate-y-px fill-primary/30 text-primary" aria-label="Featured" />}
          {displayTitle}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{book.author} · {book.language.toUpperCase()} · {formatPrice(book.price, "USD")}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {overTagged ? (
            <button type="button" onClick={onEdit} className="inline-flex min-h-10 items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 text-xs font-bold text-amber-300">Too many tags — edit</button>
          ) : (
            <>
              {shownTags.map((tag) => <span key={tag} className={`${neutralChip} max-w-[10rem] truncate`}>{tag}</span>)}
              {extra > 0 && <span className={neutralChip}>+{extra}</span>}
            </>
          )}
          {!book.coverUrl && <span className="inline-flex items-center rounded-full border border-amber-500/40 px-2.5 py-1 text-xs font-bold text-amber-300">No cover</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onEdit} aria-label={`Edit ${displayTitle}`} className={iconButton}><Pencil className="h-4 w-4" /></button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`More actions for ${displayTitle}`} className={iconButton}><MoreVertical className="h-4 w-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onDelete} className="min-h-10 text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete book</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

export function BooksTab({ books, isLoading, initialFilter = "all" }: { books: Book[]; isLoading: boolean; initialFilter?: BookFilter }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const deleteBook = useDeleteBook()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<BookFilter>(initialFilter)
  const [editing, setEditing] = useState<Book | "new" | null>(null)
  const [toDelete, setToDelete] = useState<Book | null>(null)

  const overTaggedCount = books.filter((book) => book.categories.length > MAX_TAGS).length
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return books.filter((book) => {
      if (q && !`${book.title} ${book.seriesName ?? ""} ${book.author}`.toLowerCase().includes(q)) return false
      if (filter === "featured") return book.featured
      if (filter === "nocover") return !book.coverUrl
      if (filter === "series") return Boolean(book.seriesId)
      if (filter === "tags") return book.categories.length > MAX_TAGS
      return true
    })
  }, [books, filter, query])

  function confirmDelete() {
    if (!toDelete) return
    const book = toDelete
    deleteBook.mutate({ bookId: book.id }, {
      onSuccess: () => {
        setToDelete(null)
        void queryClient.invalidateQueries({ queryKey: getListAdminBooksQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getGetStorefrontSummaryQueryKey() })
        toast({ title: "Book deleted", description: `"${book.title}" was removed from the catalogue.` })
      },
      onError: (error) => toast({ variant: "destructive", title: "Book not deleted", description: errorMessage(error, "The book could not be deleted.") }),
    })
  }

  const filters: Array<{ value: BookFilter; label: string; count?: number }> = [
    { value: "all", label: "All", count: books.length },
    { value: "featured", label: "Featured" },
    { value: "nocover", label: "No cover" },
    { value: "series", label: "Series" },
    ...(overTaggedCount ? [{ value: "tags" as const, label: "Too many tags", count: overTaggedCount }] : []),
  ]

  return (
    <section className="min-w-0 space-y-4" aria-labelledby="books-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="books-heading" className="text-2xl font-extrabold">Books</h2>
        <button type="button" onClick={() => setEditing("new")} className={primaryButton}><Plus className="h-4 w-4" /> Add book</button>
      </div>
      <label className="relative block">
        <span className="sr-only">Search books</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or author" className={`${fieldClass} pl-9`} />
      </label>
      <FilterChips<BookFilter> label="Filter books" options={filters} value={filter} onChange={setFilter} />

      <div className={`${cardClass} p-0 sm:p-0`}>
        {isLoading ? <RowSkeletons count={6} /> : visible.length ? (
          <ul className="divide-y divide-border">
            {visible.map((book) => <BookRow key={book.id} book={book} onEdit={() => setEditing(book)} onDelete={() => setToDelete(book)} />)}
          </ul>
        ) : (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title={books.length ? "No books match" : "No books yet"} body={books.length ? "Try another search or filter." : "Add your first book to start selling."} />
        )}
      </div>

      <button type="button" onClick={() => setEditing("new")} aria-label="Add book" className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 sm:hidden">
        <Plus className="h-6 w-6" />
      </button>

      {editing && <BookFormModal book={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {toDelete && (
        <ConfirmDialog
          title="Delete this book?"
          busy={deleteBook.isPending}
          body={<>"<strong className="text-foreground">{toDelete.title}</strong>" will be removed from the catalogue. This can’t be undone.</>}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </section>
  )
}
