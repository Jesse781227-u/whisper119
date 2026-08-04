import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
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
import { Moon, Sun, LogOut, Plus, CheckCircle2, Clock3, BookOpen } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { formatDate, formatPrice } from "@/lib/utils"

export function AdminLogin() {
  const [, setLocation] = useLocation()
  const { theme, setTheme } = useTheme()
  const login = useAdminLogin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function submit(event: React.FormEvent) {
    event.preventDefault()
    login.mutate({ data: { email, password } }, {
      onSuccess: () => setLocation("/admin"),
    })
  }

  return (
    <main className="min-h-[70vh] bg-background px-4 py-20">
      <div className="mx-auto max-w-md">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">Whisper 119</p>
            <h1 className="font-serif text-4xl">Librarian login</h1>
          </div>
          <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Private shelves</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input id="admin-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              {login.error && <p className="text-sm text-destructive">Login was not accepted. Check the configured admin credentials.</p>}
              <Button className="w-full" disabled={login.isPending}>{login.isPending ? "Signing in…" : "Sign in"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function AdminNav({ onLogout }: { onLogout: () => void }) {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Whisper 119</p>
        <h1 className="font-serif text-3xl">Librarian desk</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          {theme === "light" ? <Moon /> : <Sun />}
        </Button>
        <Button variant="outline" onClick={onLogout}><LogOut /> Sign out</Button>
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
    const response = await requestUploadUrl.mutateAsync({
      data: {
        name: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
      },
    })
    const upload = await fetch(response.uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    })
    if (!upload.ok) {
      throw new Error(`Could not upload ${file.name}.`)
    }
    return response.objectPath
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!ebookFile) {
      setError("Choose the ebook file before saving this title.")
      return
    }
    const extension = ebookFile.name.split(".").pop()?.toUpperCase()
    if (extension !== format) {
      setError(`The selected file must be a ${format} file.`)
      return
    }
    try {
      const [fileObjectPath, coverObjectPath] = await Promise.all([
        uploadFile(ebookFile),
        coverFile ? uploadFile(coverFile) : Promise.resolve(null),
      ])
      const payload: BookInput = {
        title, author, slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        price: Number(price), currency: "USD", category, description, format,
        coverObjectPath, fileObjectPath, fileName: ebookFile.name,
        featured: false, publishedAt: new Date().toISOString(),
      }
      await createBook.mutateAsync({ data: payload })
      setTitle(""); setAuthor(""); setSlug(""); setPrice(""); setCategory(""); setDescription("")
      setEbookFile(null)
      setCoverFile(null)
      onCreated()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not save this title.")
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Add a title</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Title</Label><Input required value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="space-y-2"><Label>Author</Label><Input required value={author} onChange={(event) => setAuthor(event.target.value)} /></div>
          <div className="space-y-2"><Label>Slug</Label><Input placeholder="auto-generated if blank" value={slug} onChange={(event) => setSlug(event.target.value)} /></div>
          <div className="space-y-2"><Label>Price (USD)</Label><Input required min="0" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} /></div>
          <div className="space-y-2"><Label>Category</Label><Input required value={category} onChange={(event) => setCategory(event.target.value)} /></div>
          <div className="space-y-2"><Label>Format</Label><select className="flex h-9 w-full border border-input bg-transparent px-3 text-sm" value={format} onChange={(event) => setFormat(event.target.value as BookInputFormat)}><option value="EPUB">EPUB</option><option value="PDF">PDF</option></select></div>
          <div className="space-y-2"><Label htmlFor="ebook-file">Ebook file</Label><Input id="ebook-file" required accept={format === "PDF" ? ".pdf,application/pdf" : ".epub,application/epub+zip"} type="file" onChange={(event) => setEbookFile(event.target.files?.[0] ?? null)} /></div>
          <div className="space-y-2"><Label htmlFor="cover-file">Cover image (optional)</Label><Input id="cover-file" accept="image/png,image/jpeg,image/webp" type="file" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Textarea required value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <div className="sm:col-span-2"><Button disabled={createBook.isPending || requestUploadUrl.isPending}>{createBook.isPending || requestUploadUrl.isPending ? "Uploading…" : "Add title"}</Button>{error && <p className="mt-2 text-sm text-destructive">{error}</p>}</div>
        </form>
      </CardContent>
    </Card>
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

  if (session.isLoading || !session.data?.authenticated) {
    return <main className="min-h-[70vh] px-4 py-20 text-center text-muted-foreground">Loading librarian desk…</main>
  }

  const stats = [
    { label: "Total orders", value: dashboard.data?.totalOrders ?? 0, icon: CheckCircle2 },
    { label: "Pending orders", value: dashboard.data?.pendingOrders ?? 0, icon: Clock3 },
    { label: "Books listed", value: dashboard.data?.totalBooks ?? 0, icon: BookOpen },
  ]

  return (
    <main className="min-h-[70vh] bg-background px-4 py-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <AdminNav onLogout={() => logout.mutate(undefined, { onSuccess: () => setLocation("/admin/login") })} />
        <div className="grid gap-4 md:grid-cols-3">{stats.map((stat) => <Card key={stat.label}><CardContent className="flex items-center justify-between p-6"><div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="mt-2 font-serif text-3xl">{stat.value}</p></div><stat.icon className="h-6 w-6 text-muted-foreground" /></CardContent></Card>)}</div>
        <div className="flex items-center justify-between"><div><h2 className="font-serif text-2xl">Catalogue</h2><p className="text-sm text-muted-foreground">Digital titles only — no stock or shipping.</p></div><Button onClick={() => setShowBookForm((value) => !value)}>{showBookForm ? "Close form" : "Add title"}</Button></div>
        {showBookForm && <BookForm onCreated={() => { setShowBookForm(false); void books.refetch() }} />}
        <Card><CardContent className="p-0"><div className="divide-y">{books.data?.map((book) => <div key={book.id} className="flex items-center justify-between gap-4 p-5"><div><p className="font-serif text-lg">{book.title}</p><p className="text-sm text-muted-foreground">{book.author} · {book.format}</p></div><div className="text-right"><p>{formatPrice(book.price, book.currency)}</p><Badge variant="outline">{book.category}</Badge></div></div>)}{!books.data?.length && <p className="p-6 text-muted-foreground">No books listed yet.</p>}</div></CardContent></Card>
        <section className="space-y-4"><div><h2 className="font-serif text-2xl">Orders</h2><p className="text-sm text-muted-foreground">Payment and attachment delivery status.</p></div><Card><CardContent className="p-0"><div className="divide-y">{orders.data?.map((order) => <Link key={order.id} href={`/order/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-secondary/30"><div><p className="font-mono text-sm">{order.reference}</p><p className="text-sm text-muted-foreground">{order.email} · {formatDate(order.createdAt)}</p></div><div className="flex items-center gap-3"><Badge variant={order.status === "paid" ? "default" : "secondary"}>{order.status}</Badge><span className="text-sm">{order.deliveryEmailSent ? "Email sent" : "Email pending"}</span><span>{formatPrice(order.subtotal, order.currency)}</span></div></Link>)}{!orders.data?.length && <p className="p-6 text-muted-foreground">No orders yet.</p>}</div></CardContent></Card></section>
      </div>
    </main>
  )
}