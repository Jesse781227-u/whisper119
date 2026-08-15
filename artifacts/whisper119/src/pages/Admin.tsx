import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import { useQueryClient } from "@tanstack/react-query"
import { BookOpen, CheckCircle2, Clock3, FileText, LogOut, Pencil, Plus, RefreshCw, Upload, Users, Eye, WalletCards } from "lucide-react"
import {
  getGetAdminDashboardQueryKey, getListAdminBooksQueryKey, useAdminLogin, useAdminLogout,
  useGetAdminDashboard, useGetAdminSession, useListAdminBooks, useListAdminOrders,
  useCreateBook, useUpdateBook, useRequestUploadUrl,
} from "@workspace/api-client-react"
import type { Book, BookInput, BookInputFormat, BookUpdate } from "@workspace/api-client-react"
import { formatDate, formatPrice } from "@/lib/utils"
import { GENRE_CATEGORIES } from "@/data/catalog"

const fieldClass = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"

export function AdminLogin() {
  const [, setLocation] = useLocation()
  const login = useAdminLogin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  function submit(event: React.FormEvent) {
    event.preventDefault()
    login.mutate({ data: { email, password } }, { onSuccess: () => setLocation("/admin") })
  }
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090f2d] px-4 py-10 text-white">
    <div className="absolute inset-0 bg-cover bg-center opacity-55" style={{ backgroundImage: "linear-gradient(180deg,rgba(7,12,35,.35),#090f2d 83%),url('/covers/cover-3.jpg')" }} />
    <div className="relative w-full max-w-md">
      <Link href="/" className="mb-8 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary"><BookOpen className="h-5 w-5" /></span><div><p className="text-lg font-extrabold">Whisper 119</p><p className="text-xs text-white/60">Private librarian desk</p></div></Link>
      <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/70">Welcome back</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Manage your shelf.</h1><p className="mt-2 text-sm leading-6 text-white/65">Sign in to add books, check orders, and understand your readership.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block"><span className="mb-2 block text-xs font-bold text-white/80">Email</span><input data-testid="input-admin-email" required type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-sm text-white outline-none focus:border-primary" /></label>
          <label className="block"><span className="mb-2 block text-xs font-bold text-white/80">Password</span><input data-testid="input-admin-password" required type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-sm text-white outline-none focus:border-primary" /></label>
          {login.error && <p className="rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">Login was not accepted. Check the configured admin credentials.</p>}
          <button data-testid="button-admin-login" type="submit" disabled={login.isPending} className="h-12 w-full rounded-xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-60">{login.isPending ? "Signing in…" : "Sign in to the desk"}</button>
        </form>
      </div>
    </div>
  </main>
}

function AdminNav({ onLogout }: { onLogout: () => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-4"><Link href="/admin" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpen className="h-5 w-5" /></span><div><p className="text-sm font-extrabold">Whisper 119</p><p className="text-xs text-muted-foreground">Librarian desk</p></div></Link><div className="flex items-center gap-2"><Link href="/" className="hidden rounded-full px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary sm:block">View storefront</Link><button data-testid="button-admin-logout" onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:border-destructive hover:text-destructive"><LogOut className="h-3.5 w-3.5" /> Sign out</button></div></div>
}

type BookFormProps = { book?: Book; onDone: () => void }
function BookForm({ book, onDone }: BookFormProps) {
  const createBook = useCreateBook()
  const updateBook = useUpdateBook()
  const requestUploadUrl = useRequestUploadUrl()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(book?.title ?? "")
  const [author, setAuthor] = useState(book?.author ?? "")
  const [slug, setSlug] = useState(book?.slug ?? "")
  const [price, setPrice] = useState(String(book?.price ?? ""))
  const [priceNgn, setPriceNgn] = useState(String(book?.priceNgn ?? ""))
  const [category, setCategory] = useState<(typeof GENRE_CATEGORIES)[number]>((book?.category as (typeof GENRE_CATEGORIES)[number]) ?? "Romance")
  const [description, setDescription] = useState(book?.description ?? "")
  const [paymentLink, setPaymentLink] = useState(book?.paymentLink ?? "")
  const [format, setFormat] = useState<BookInputFormat>(book?.format ?? "EPUB")
  const [ebookFile, setEbookFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function uploadFile(file: File) {
    const response = await requestUploadUrl.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type || "application/octet-stream" } })
    if (!response?.uploadURL || !response.objectPath) {
      throw new Error("The upload service returned an empty response. Please try again.")
    }
    const upload = await fetch(response.uploadURL, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file })
    if (!upload.ok) throw new Error(`Could not upload ${file.name}.`)
    return response.objectPath
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null)
    try {
      if (book) {
        const data: BookUpdate = { title, description, price: Number(price), priceNgn: Number(priceNgn), paymentLink: paymentLink || null }
        if (ebookFile) {
          const extension = ebookFile.name.split(".").pop()?.toUpperCase()
          if (extension !== format) throw new Error(`The selected file must be a ${format} file.`)
          data.fileObjectPath = await uploadFile(ebookFile)
          data.fileName = ebookFile.name
          data.format = format
        }
        await updateBook.mutateAsync({ bookId: book.id, data })
      } else {
        if (!ebookFile) throw new Error("Choose the ebook file before saving this title.")
        const extension = ebookFile.name.split(".").pop()?.toUpperCase()
        if (extension !== format) throw new Error(`The selected file must be a ${format} file.`)
        const [fileObjectPath, coverObjectPath] = await Promise.all([uploadFile(ebookFile), coverFile ? uploadFile(coverFile) : Promise.resolve(null)])
        const payload: BookInput = { title, author, slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), price: Number(price), priceNgn: Number(priceNgn), currency: "USD", category, description, format, paymentLink: paymentLink || null, coverObjectPath, fileObjectPath, fileName: ebookFile.name, featured: false, publishedAt: new Date().toISOString() }
        await createBook.mutateAsync({ data: payload })
      }
      await queryClient.invalidateQueries({ queryKey: getListAdminBooksQueryKey() })
      await queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() })
      onDone()
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Could not save this title.") }
  }
  const pending = createBook.isPending || updateBook.isPending || requestUploadUrl.isPending
  return <section className="rounded-2xl border border-primary/25 bg-card p-5 shadow-lg shadow-primary/5 sm:p-7"><div className="flex items-start gap-3 border-b border-border pb-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{book ? <Pencil className="h-4 w-4" /> : <Upload className="h-4 w-4" />}</span><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">{book ? "Edit title" : "New title"}</p><h2 className="mt-1 text-xl font-extrabold">{book ? "Refine this listing" : "Add a book to the shelf"}</h2></div></div>
    <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
      <label><span className="mb-2 block text-xs font-bold">Title</span><input data-testid="input-book-title" required value={title} onChange={e => setTitle(e.target.value)} className={fieldClass} /></label>
      {!book && <label><span className="mb-2 block text-xs font-bold">Author</span><input data-testid="input-book-author" required value={author} onChange={e => setAuthor(e.target.value)} className={fieldClass} /></label>}
      {!book && <label><span className="mb-2 block text-xs font-bold">Slug <span className="font-normal text-muted-foreground">(optional)</span></span><input value={slug} onChange={e => setSlug(e.target.value)} className={fieldClass} /></label>}
      <label><span className="mb-2 block text-xs font-bold">Price (USD)</span><input data-testid="input-book-price" required min="0" step="0.01" type="number" value={price} onChange={e => setPrice(e.target.value)} className={fieldClass} /></label>
      {!book && <label><span className="mb-2 block text-xs font-bold">Price (NGN)</span><input required min="0" step="0.01" type="number" value={priceNgn} onChange={e => setPriceNgn(e.target.value)} className={fieldClass} /></label>}
      {!book && <label><span className="mb-2 block text-xs font-bold">Genre</span><select value={category} onChange={e => setCategory(e.target.value as (typeof GENRE_CATEGORIES)[number])} className={fieldClass}>{GENRE_CATEGORIES.map(g => <option key={g}>{g}</option>)}</select></label>}
      <label><span className="mb-2 block text-xs font-bold">Format</span><select value={format} onChange={e => setFormat(e.target.value as BookInputFormat)} className={fieldClass}><option>EPUB</option><option>PDF</option></select></label>
      <label><span className="mb-2 block text-xs font-bold">Ebook file {book && <span className="font-normal text-muted-foreground">(optional replacement)</span>}</span><input data-testid="input-book-file" required={!book} accept={format === "PDF" ? ".pdf,application/pdf" : ".epub,application/epub+zip"} type="file" onChange={e => setEbookFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary" /></label>
      {!book && <label><span className="mb-2 block text-xs font-bold">Cover image <span className="font-normal text-muted-foreground">(optional)</span></span><input accept="image/png,image/jpeg,image/webp" type="file" onChange={e => setCoverFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary" /></label>}
      <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold">Description</span><textarea data-testid="input-book-description" required value={description} onChange={e => setDescription(e.target.value)} className={`${fieldClass} min-h-28 py-3`} /></label>
      <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold">External checkout / info link <span className="font-normal text-muted-foreground">(informational only)</span></span><input data-testid="input-book-payment-link" type="url" value={paymentLink} onChange={e => setPaymentLink(e.target.value)} placeholder="https://…" className={fieldClass} /><span className="mt-1 block text-xs text-muted-foreground">This link is shared as information and does not confirm payment.</span></label>
      <div className="flex gap-2 sm:col-span-2"><button data-testid="button-save-book" type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-extrabold text-primary-foreground disabled:opacity-60">{pending ? "Saving…" : book ? "Save changes" : "Add title"}</button><button data-testid="button-cancel-book" type="button" onClick={onDone} className="h-11 rounded-xl border border-border px-5 text-xs font-bold">Cancel</button></div>
      {error && <p className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive sm:col-span-2">{error}</p>}
    </form>
  </section>
}

export default function Admin() {
  const [, setLocation] = useLocation(); const session = useGetAdminSession(); const enabled = Boolean(session.data?.authenticated)
  const dashboard = useGetAdminDashboard({ query: { queryKey: getGetAdminDashboardQueryKey(), enabled } })
  const books = useListAdminBooks({ query: { queryKey: getListAdminBooksQueryKey(), enabled } }); const orders = useListAdminOrders(undefined, { query: { queryKey: ["/api/admin/orders"], enabled } }); const logout = useAdminLogout()
  const [form, setForm] = useState<"new" | Book | null>(null)
  useEffect(() => { if (session.isError || (session.data && !session.data.authenticated)) setLocation("/admin/login") }, [session.data, session.isError, setLocation])
  if (session.isLoading || !session.data?.authenticated) return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading librarian desk…</main>
  const stats = [{ label: "Page views", value: dashboard.data?.totalPageViews ?? 0, icon: Eye, tint: "text-primary bg-primary/10" }, { label: "Unique visitors", value: dashboard.data?.uniqueVisitors ?? 0, icon: Users, tint: "text-indigo-400 bg-indigo-400/10" }, { label: "Paid orders", value: dashboard.data?.paidOrders ?? 0, icon: CheckCircle2, tint: "text-emerald-500 bg-emerald-500/10" }, { label: "Revenue", value: formatPrice(dashboard.data?.totalRevenue ?? 0, "USD"), icon: WalletCards, tint: "text-amber-500 bg-amber-500/10" }]
  return <main className="min-h-screen bg-secondary/35 px-4 pb-16 pt-6 sm:px-6 sm:pt-8"><div className="mx-auto max-w-6xl space-y-7"><AdminNav onLogout={() => logout.mutate(undefined, { onSuccess: () => setLocation("/admin/login") })} />
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Private desk</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">A clear view of the shelf.</h1><p className="mt-1 text-sm text-muted-foreground">Catalogue, readership, and real orders in one place.</p></div><button data-testid="button-refresh-dashboard" onClick={() => { void dashboard.refetch(); void books.refetch(); void orders.refetch() }} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button></div>
    <section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Analytics</p><h2 className="mt-1 text-2xl font-extrabold">Storefront pulse</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats.map(s => <div key={s.label} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm"><div><p className="text-xs font-bold text-muted-foreground">{s.label}</p><p data-testid={`text-analytics-${s.label.toLowerCase().replace(" ", "-")}`} className="mt-1 text-2xl font-extrabold">{s.value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.tint}`}><s.icon className="h-5 w-5" /></span></div>)}</div></section>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Catalogue</p><h2 className="mt-1 text-2xl font-extrabold">Your shelf</h2></div><button data-testid="button-add-title" onClick={() => setForm(form === "new" ? null : "new")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground"><Plus className="h-4 w-4" /> {form === "new" ? "Close form" : "Add title"}</button></div>
    {form === "new" && <BookForm onDone={() => setForm(null)} />}{form && form !== "new" && <BookForm book={form} onDone={() => setForm(null)} />}
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="divide-y divide-border">{books.data?.map(book => <div key={book.id} className="flex items-center gap-3 p-4 sm:p-5"><div className="flex h-11 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">{book.coverUrl ? <img src={book.coverUrl} alt="" className="h-full w-full object-cover" /> : <FileText className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{book.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{book.author} · {book.format}</p></div><div className="flex items-center gap-3"><div className="text-right"><p className="text-sm font-extrabold">{formatPrice(book.price, book.currency)}</p><span className="text-[0.62rem] font-bold text-primary">{book.category}</span></div><button data-testid={`button-edit-book-${book.id}`} onClick={() => setForm(book)} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary" aria-label={`Edit ${book.title}`}><Pencil className="h-4 w-4" /></button></div></div>)}{!books.data?.length && <div className="p-10 text-center"><BookOpen className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-bold">No books listed yet.</p></div>}</div></section>
    <section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Operations</p><h2 className="mt-1 text-2xl font-extrabold">Orders</h2></div><div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm divide-y divide-border">{orders.data?.map(order => <Link key={order.id} href={`/order/${order.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-secondary/50 sm:p-5"><div className="min-w-0 flex-1"><p className="font-mono text-xs font-bold">{order.reference}</p><p className="mt-1 truncate text-xs text-muted-foreground">{order.email} · {formatDate(order.createdAt)}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.62rem] font-bold text-emerald-600">{order.status}</span><span className="text-sm font-extrabold">{formatPrice(order.subtotal, order.currency)}</span></div></Link>)}{!orders.data?.length && <div className="p-10 text-center"><Clock3 className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-bold">No orders yet.</p></div>}</div></section>
  </div></main>
}