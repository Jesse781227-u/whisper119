import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  LogOut,
  Moon,
  PackageCheck,
  Plus,
  Sun,
  Upload,
  WalletCards,
} from "lucide-react"
import {
  useAdminLogin,
  useAdminLogout,
  useGetAdminDashboard,
  useGetAdminSession,
  useListAdminBooks,
  useListAdminOrders,
  useCreateBook,
  useRequestUploadUrl,
} from "@workspace/api-client-react"
import type { BookInput, BookInputFormat } from "@workspace/api-client-react"
import { useTheme } from "@/components/theme-provider"
import { formatDate, formatPrice } from "@/lib/utils"

export function AdminLogin() {
  const [, setLocation] = useLocation()
  const { theme, setTheme } = useTheme()
  const login = useAdminLogin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function submit(event: React.FormEvent) {
    event.preventDefault()
    login.mutate({ data: { email, password } }, { onSuccess: () => setLocation("/admin") })
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090f2d] px-4 py-10 text-white">
      <div className="absolute inset-0 bg-cover bg-center opacity-55" style={{ backgroundImage: "linear-gradient(180deg,rgba(7,12,35,.35),#090f2d 83%),url('/covers/cover-3.jpg')" }} />
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-start justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30"><BookOpen className="h-5 w-5" strokeWidth={2.5} /></span>
            <div><p className="text-lg font-extrabold">Whisper 119</p><p className="text-xs text-white/60">Private librarian desk</p></div>
          </Link>
          <button type="button" aria-label="Toggle theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="rounded-full bg-white/10 p-3 text-white/80 backdrop-blur hover:bg-white/20">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
        <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/70">Welcome back</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Manage your shelf.</h1>
          <p className="mt-2 text-sm leading-6 text-white/65">Sign in to add books, check orders, and keep the shop ready for readers.</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block"><span className="mb-2 block text-xs font-bold text-white/80">Email</span><input id="admin-email" name="email" autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-primary focus:ring-4 focus:ring-primary/20" /></label>
            <label className="block"><span className="mb-2 block text-xs font-bold text-white/80">Password</span><input id="admin-password" name="password" autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-primary focus:ring-4 focus:ring-primary/20" /></label>
            {login.error && <p className="rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm leading-5 text-red-100">Login was not accepted. Check the configured admin credentials.</p>}
            <button type="submit" disabled={login.isPending} className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:-translate-y-0.5 disabled:opacity-60">{login.isPending ? "Signing in…" : "Sign in to the desk"}</button>
          </form>
        </div>
        <p className="mt-6 text-center text-xs text-white/45">Storefront payments and delivery remain server-protected.</p>
      </div>
    </main>
  )
}

function AdminNav({ onLogout }: { onLogout: () => void }) {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/admin" className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpen className="h-5 w-5" /></span>
        <div><p className="text-sm font-extrabold">Whisper 119</p><p className="text-xs text-muted-foreground">Librarian desk</p></div>
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/" className="hidden rounded-full px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-primary sm:block">View storefront</Link>
        <button type="button" aria-label="Toggle theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="rounded-full p-2.5 text-muted-foreground hover:bg-secondary hover:text-primary">{theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
        <button type="button" onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:border-destructive hover:text-destructive"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
      </div>
    </div>
  )
}

function BookForm({ onCreated }: { onCreated: () => void }) {
  const createBook = useCreateBook()
  const requestUploadUrl = useRequestUploadUrl()
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [slug, setSlug] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [format, setFormat] = useState<BookInputFormat>("EPUB")
  const [ebookFile, setEbookFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function uploadFile(file: File) {
    const response = await requestUploadUrl.mutateAsync({ data: { name: file.name, size: file.size, contentType: file.type || "application/octet-stream" } })
    const upload = await fetch(response.uploadURL, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file })
    if (!upload.ok) throw new Error(`Could not upload ${file.name}.`)
    return response.objectPath
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!ebookFile) { setError("Choose the ebook file before saving this title."); return }
    const extension = ebookFile.name.split(".").pop()?.toUpperCase()
    if (extension !== format) { setError(`The selected file must be a ${format} file.`); return }
    try {
      const [fileObjectPath, coverObjectPath] = await Promise.all([uploadFile(ebookFile), coverFile ? uploadFile(coverFile) : Promise.resolve(null)])
      const payload: BookInput = {
        title, author, slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        price: Number(price), currency: "USD", category, description, format, coverObjectPath, fileObjectPath, fileName: ebookFile.name, featured: false, publishedAt: new Date().toISOString(),
      }
      await createBook.mutateAsync({ data: payload })
      setTitle(""); setAuthor(""); setSlug(""); setPrice(""); setCategory(""); setDescription(""); setEbookFile(null); setCoverFile(null); onCreated()
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Could not save this title.") }
  }

  const fieldClass = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3 border-b border-border pb-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Upload className="h-4 w-4" /></span><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">New title</p><h2 className="mt-1 text-xl font-extrabold">Add a book to the shelf</h2></div></div>
      <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="mb-2 block text-xs font-bold">Title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} /></label>
        <label className="block"><span className="mb-2 block text-xs font-bold">Author</span><input required value={author} onChange={(event) => setAuthor(event.target.value)} className={fieldClass} /></label>
        <label className="block"><span className="mb-2 block text-xs font-bold">Slug <span className="font-normal text-muted-foreground">(optional)</span></span><input value={slug} onChange={(event) => setSlug(event.target.value)} className={fieldClass} /></label>
        <label className="block"><span className="mb-2 block text-xs font-bold">Price (USD)</span><input required min="0" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} className={fieldClass} /></label>
        <label className="block"><span className="mb-2 block text-xs font-bold">Category</span><input required value={category} onChange={(event) => setCategory(event.target.value)} className={fieldClass} /></label>
        <label className="block"><span className="mb-2 block text-xs font-bold">Format</span><select value={format} onChange={(event) => setFormat(event.target.value as BookInputFormat)} className={fieldClass}><option value="EPUB">EPUB</option><option value="PDF">PDF</option></select></label>
        <label className="block"><span className="mb-2 block text-xs font-bold">Ebook file</span><input required accept={format === "PDF" ? ".pdf,application/pdf" : ".epub,application/epub+zip"} type="file" onChange={(event) => setEbookFile(event.target.files?.[0] ?? null)} className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary" /></label>
        <label className="block"><span className="mb-2 block text-xs font-bold">Cover image <span className="font-normal text-muted-foreground">(optional)</span></span><input accept="image/png,image/jpeg,image/webp" type="file" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary" /></label>
        <label className="block sm:col-span-2"><span className="mb-2 block text-xs font-bold">Description</span><textarea required value={description} onChange={(event) => setDescription(event.target.value)} className={`${fieldClass} min-h-28 py-3`} /></label>
        <div className="sm:col-span-2"><button type="submit" disabled={createBook.isPending || requestUploadUrl.isPending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/15 disabled:opacity-60"><Plus className="h-4 w-4" />{createBook.isPending || requestUploadUrl.isPending ? "Uploading…" : "Add title"}</button>{error && <p className="mt-3 rounded-xl bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}</div>
      </form>
    </section>
  )
}

export default function Admin() {
  const [, setLocation] = useLocation()
  const session = useGetAdminSession()
  const dashboard = useGetAdminDashboard({ query: { queryKey: ["/api/admin/dashboard"], enabled: Boolean(session.data?.authenticated) } })
  const books = useListAdminBooks({ query: { queryKey: ["/api/admin/books"], enabled: Boolean(session.data?.authenticated) } })
  const orders = useListAdminOrders(undefined, { query: { queryKey: ["/api/admin/orders"], enabled: Boolean(session.data?.authenticated) } })
  const logout = useAdminLogout()
  const [showBookForm, setShowBookForm] = useState(false)

  useEffect(() => {
    if (session.isError || (session.data && !session.data.authenticated)) setLocation("/admin/login")
  }, [session.data, session.isError, setLocation])

  if (session.isLoading || !session.data?.authenticated) return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading librarian desk…</main>

  const stats = [
    { label: "Total orders", value: dashboard.data?.totalOrders ?? 0, icon: CheckCircle2, tint: "text-emerald-500 bg-emerald-500/10" },
    { label: "Pending orders", value: dashboard.data?.pendingOrders ?? 0, icon: Clock3, tint: "text-amber-500 bg-amber-500/10" },
    { label: "Books listed", value: dashboard.data?.totalBooks ?? 0, icon: BookOpen, tint: "text-primary bg-primary/10" },
  ]

  return (
    <main className="min-h-screen bg-secondary/35 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <AdminNav onLogout={() => logout.mutate(undefined, { onSuccess: () => setLocation("/admin/login") })} />
        <div className="grid gap-3 sm:grid-cols-3">{stats.map((stat) => <div key={stat.label} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm"><div><p className="text-xs font-bold text-muted-foreground">{stat.label}</p><p className="mt-1 text-2xl font-extrabold">{stat.value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tint}`}><stat.icon className="h-5 w-5" /></span></div>)}</div>

        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Catalogue</p><h2 className="mt-1 text-2xl font-extrabold">Your shelf</h2><p className="mt-1 text-sm text-muted-foreground">Digital titles only — no stock or shipping.</p></div><button type="button" onClick={() => setShowBookForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/15"><Plus className="h-4 w-4" /> {showBookForm ? "Close form" : "Add title"}</button></div>
        {showBookForm && <BookForm onCreated={() => { setShowBookForm(false); void books.refetch() }} />}
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="divide-y divide-border">
            {books.data?.map((book) => <div key={book.id} className="flex items-center gap-3 p-4 sm:p-5"><div className="flex h-11 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">{book.coverUrl ? <img src={book.coverUrl} alt="" className="h-full w-full object-cover" /> : <FileText className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{book.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{book.author} · {book.format}</p></div><div className="text-right"><p className="text-sm font-extrabold">{formatPrice(book.price, book.currency)}</p><span className="text-[0.62rem] font-bold text-primary">{book.category}</span></div></div>)}
            {!books.data?.length && <div className="p-10 text-center"><BookOpen className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-bold">No books listed yet.</p><p className="mt-1 text-xs text-muted-foreground">Add the first real ebook to start the shelf.</p></div>}
          </div>
        </section>

        <section>
          <div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Operations</p><h2 className="mt-1 text-2xl font-extrabold">Orders</h2><p className="mt-1 text-sm text-muted-foreground">Payment and attachment delivery status.</p></div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="divide-y divide-border">
              {orders.data?.map((order) => <Link key={order.id} href={`/order/${order.id}`} className="flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-secondary/50 sm:p-5"><div className="min-w-0 flex-1"><p className="font-mono text-xs font-bold">{order.reference}</p><p className="mt-1 truncate text-xs text-muted-foreground">{order.email} · {formatDate(order.createdAt)}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold ${order.status === "paid" ? "bg-emerald-500/10 text-emerald-600" : order.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"}`}>{order.status}</span><span className="hidden text-xs text-muted-foreground sm:block">{order.deliveryEmailSent ? "Email sent" : "Email pending"}</span><span className="text-sm font-extrabold">{formatPrice(order.subtotal, order.currency)}</span></div></Link>)}
              {!orders.data?.length && <div className="p-10 text-center"><WalletCards className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-bold">No orders yet.</p><p className="mt-1 text-xs text-muted-foreground">Completed purchases will appear here.</p></div>}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}