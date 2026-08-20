import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import { useQueryClient } from "@tanstack/react-query"
import { BookOpen, CheckCircle2, Clock3, FileText, LogOut, Pencil, Plus, RefreshCw, Trash2, Upload, Users, Eye, WalletCards } from "lucide-react"
import {
  getGetAdminDashboardQueryKey, getGetStorefrontSummaryQueryKey, getListAdminBooksQueryKey, getListBooksQueryKey,
  useGetAdminDashboard, useListAdminBooks, useListAdminOrders,
  useCreateBook, useDeleteBook, useUpdateBook, useConfirmAdminOrder,
  requestUploadUrl as requestUploadUrlApi,
} from "@workspace/api-client-react"
import { useAuth } from "@/components/auth-provider"
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore"
import { firebaseDb } from "@/lib/firebase"
import type { Book, BookInput, BookInputFormat, BookUpdate, Order } from "@workspace/api-client-react"
import { formatDate, formatPrice } from "@/lib/utils"
import { GENRE_CATEGORIES } from "@/data/catalog"
import { useToast } from "@/hooks/use-toast"

const fieldClass = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"

export function AdminLogin() {
  const [location, setLocation] = useLocation()
  const { user, loading, isAdmin, signInWithGoogle } = useAuth()

  useEffect(() => {
    if (!loading && user && isAdmin) {
      setLocation("/admin")
    }
  }, [loading, user, isAdmin, setLocation])

  if (loading) {
    return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090f2d] px-4 py-10 text-white"><p>Loading admin accessâ€¦</p></main>
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090f2d] px-4 py-10 text-white">
    <div className="absolute inset-0 bg-cover bg-center opacity-55" style={{ backgroundImage: "linear-gradient(180deg,rgba(7,12,35,.35),#090f2d 83%),url('/covers/cover-3.jpg')" }} />
    <div className="relative w-full max-w-md">
      <Link href="/" className="mb-8 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary"><BookOpen className="h-5 w-5" /></span><div><p className="text-lg font-extrabold">Whisper 119</p><p className="text-xs text-white/60">Private Administrative controls</p></div></Link>
      <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/70">Admin access</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Access your Administrative controls</h1>
        <p className="mt-2 text-sm leading-6 text-white/65">Sign in with a registered admin email to manage books, orders, and the storefront.</p>
        <div className="mt-7 space-y-4">
          {user ? (
            <div className="rounded-2xl border border-border bg-black/20 p-5 text-sm text-white">
              <p className="font-semibold">Signed in as <span className="text-primary">{user.email}</span>.</p>
              <p className="mt-2 text-white/70">If this email is configured in Firestore under the <code>admins</code> collection, you will be redirected automatically.</p>
              {!isAdmin && <p className="mt-3 text-sm text-destructive">This account is not authorized yet. Ask a current admin to add your email.</p>}
            </div>
          ) : (
            <p className="rounded-2xl border border-border bg-black/20 p-5 text-sm text-white">Use Google sign-in to authenticate your admin account.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => void signInWithGoogle()} className="inline-flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">Sign in with Google</button>
            <button type="button" onClick={() => setLocation("/")} className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 text-sm font-extrabold text-white">Return to storefront</button>
          </div>
        </div>
      </div>
    </div>
  </main>
}
function AdminNav({ onLogout }: { onLogout: () => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-4"><Link href="/admin" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpen className="h-5 w-5" /></span><div><p className="text-sm font-extrabold">Whisper 119</p><p className="text-xs text-muted-foreground">Administrative controls</p></div></Link><div className="flex items-center gap-2"><Link href="/" className="hidden rounded-full px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary sm:block">Back</Link><button data-testid="button-admin-logout" onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:border-destructive hover:text-destructive"><LogOut className="h-3.5 w-3.5" /> Sign out</button></div></div>
}

type BookFormProps = { book?: Book; onDone: () => void }
type BookFormPhase = "idle" | "validating" | "uploading" | "saving"
type UploadProgressHandler = (bytesTransferred: number, totalBytes: number) => void

const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error !== null && "error" in error) {
    const message = (error as { error?: unknown }).error
    if (typeof message === "string" && message.trim()) return message
  }
  return fallback
}

function BookForm({ book, onDone }: BookFormProps) {
  const createBook = useCreateBook()
  const updateBook = useUpdateBook()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [title, setTitle] = useState(book?.title ?? "")
  const [author, setAuthor] = useState(book?.author ?? "")
  const [price, setPrice] = useState(String(book?.price ?? ""))
  const [categories, setCategories] = useState<(typeof GENRE_CATEGORIES)[number][]>(book?.categories?.length ? [...book.categories] : ["Romance"])
  const [slug, setSlug] = useState(book?.slug ?? "")
  const [description, setDescription] = useState(book?.description ?? "")
  const [payoneerLink, setPayoneerLink] = useState(book?.payoneerLink ?? "")
  const [format, setFormat] = useState<BookInputFormat>(book?.format ?? "EPUB")
  const [featured, setFeatured] = useState(book?.featured ?? false)
  const [publishedAt, setPublishedAt] = useState(book?.publishedAt ? book.publishedAt.slice(0, 16) : new Date().toISOString().slice(0, 16))
  const [ebookFile, setEbookFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<BookFormPhase>("idle")
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  async function uploadFile(file: File, onProgress: UploadProgressHandler) {
    const uploadResponse = await requestUploadUrlApi(
      { name: file.name, size: file.size, contentType: file.type || "application/octet-stream" },
      { responseType: "json" },
    )
    if (!uploadResponse || typeof uploadResponse !== "object" || !("uploadURL" in uploadResponse) || !("objectPath" in uploadResponse)) {
      throw new Error("The server returned an empty upload response. Check the API deployment and server logs.")
    }
    const { uploadURL, objectPath } = uploadResponse
    return new Promise<string>((resolve, reject) => {
      let settled = false
      let timeoutId: ReturnType<typeof setTimeout> | undefined

      const clearUpload = () => {
        if (timeoutId) clearTimeout(timeoutId)
      }

      const fail = (uploadError: unknown) => {
        if (settled) return
        settled = true
        clearUpload()
        const reason = uploadError instanceof Error && uploadError.message ? ` ${uploadError.message}` : ""
        reject(new Error(`Could not upload ${file.name}.${reason}`))
      }

      try {
        timeoutId = setTimeout(() => {
          xhr.abort()
          fail(new Error("The upload timed out after 10 minutes. Check your connection and try again."))
        }, UPLOAD_TIMEOUT_MS)
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", uploadURL)
        xhr.timeout = UPLOAD_TIMEOUT_MS
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
        xhr.upload.addEventListener("progress", event => {
          if (event.lengthComputable) onProgress(event.loaded, event.total)
        })
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            settled = true
            clearUpload()
            onProgress(file.size, file.size)
            resolve(objectPath)
          } else fail(new Error(`Storage returned HTTP ${xhr.status}.`))
        })
        xhr.addEventListener("error", () => fail(new Error("The browser could not reach the storage endpoint.")))
        xhr.addEventListener("timeout", () => fail(new Error("The upload timed out.")))
        xhr.send(file)
      } catch (uploadError) {
        fail(uploadError)
      }
    })
  }

  async function uploadFiles(files: File[], onProgress: (progress: number | null) => void) {
    const totalBytes = files.reduce((total, file) => total + file.size, 0)
    const transferredBytes = files.map(() => 0)
    onProgress(null)

    return Promise.all(files.map((file, index) => uploadFile(file, (bytesTransferred, fileTotalBytes) => {
      transferredBytes[index] = bytesTransferred
      if (bytesTransferred <= 0 && fileTotalBytes <= 0) {
        onProgress(100)
        return
      }
      const progress = totalBytes > 0
        ? Math.round((transferredBytes.reduce((total, bytes) => total + bytes, 0) / totalBytes) * 100)
        : fileTotalBytes > 0
          ? Math.round((bytesTransferred / fileTotalBytes) * 100)
          : 100
      onProgress(Math.min(100, progress))
    })))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setUploadProgress(null)
    setPhase("validating")

    try {
      const titleValue = title.trim()
      const authorValue = author.trim()
      const descriptionValue = description.trim()
      const priceValue = Number(price)

      if (!titleValue) throw new Error("Enter a book title.")
      if (!book && !authorValue) throw new Error("Enter the author name.")
      if (!price.trim()) throw new Error("Enter the USD price.")
      if (!Number.isFinite(priceValue) || priceValue < 0) throw new Error("Enter a valid non-negative USD price.")
      if (!descriptionValue) throw new Error("Enter a book description.")
      if (!categories.length) throw new Error("Choose at least one category.")
      if (!book && !ebookFile) throw new Error("Choose the ebook file before saving this book.")

      if (payoneerLink.trim()) {
        try {
          const url = new URL(payoneerLink.trim())
          if (!["http:", "https:"].includes(url.protocol)) throw new Error()
        } catch {
          throw new Error("Payoneer link must be a valid HTTP or HTTPS URL.")
        }
      }

      if (coverFile && !coverFile.type.startsWith("image/")) {
        throw new Error("The cover image must be a PNG, JPEG, or WebP image.")
      }

      if (ebookFile) {
        const extension = ebookFile.name.split(".").pop()?.toUpperCase()
        if (extension !== format) throw new Error(`The selected file must be a ${format} file.`)
      }

      if (book) {
        const data: BookUpdate = {
          title: titleValue,
          slug: slug.trim(),
          author: authorValue,
          description: descriptionValue,
          price: priceValue,
          categories,
          format,
          featured,
          publishedAt: new Date(publishedAt).toISOString(),
          payoneerLink: payoneerLink.trim() || null,
        }
        if (ebookFile || coverFile) {
          setPhase("uploading")
          const files = [ebookFile, coverFile].filter((file): file is File => Boolean(file))
          const paths = await uploadFiles(files, setUploadProgress)
          if (ebookFile) {
            const ebookIndex = files.indexOf(ebookFile)
            data.fileObjectPath = paths[ebookIndex]
            data.fileName = ebookFile.name
          }
          if (coverFile) {
            const coverIndex = files.indexOf(coverFile)
            data.coverObjectPath = paths[coverIndex]
          }
        }
        setPhase("saving")
        await updateBook.mutateAsync({ bookId: book.id, data })
      } else {
        const ebook = ebookFile
        if (!ebook) throw new Error("Choose the ebook file before saving this book.")
        setPhase("uploading")
        const uploadedFiles = await uploadFiles(coverFile ? [ebook, coverFile] : [ebook], setUploadProgress)
        const fileObjectPath = uploadedFiles[0]
        const coverObjectPath = coverFile ? uploadedFiles[1] : null
        setPhase("saving")
        const payload: BookInput = {
          title: titleValue,
          author: authorValue,
          slug: titleValue.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          price: priceValue,
          priceNgn: 0,
          currency: "USD",
          categories,
          description: descriptionValue,
          format,
          paystackLink: null,
          payoneerLink: payoneerLink.trim() || null,
          coverObjectPath,
          fileObjectPath,
          fileName: ebook.name,
          featured,
          publishedAt: new Date(publishedAt).toISOString(),
        }
        await createBook.mutateAsync({ data: payload })
      }
      await queryClient.invalidateQueries({ queryKey: getListAdminBooksQueryKey() })
      await queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() })
      await queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() })
      await queryClient.invalidateQueries({ queryKey: getGetStorefrontSummaryQueryKey() })
      toast({
        title: book ? "Book updated" : "Book added",
        description: `"${titleValue}" is now in the catalogue.`,
      })
      onDone()
    } catch (submitError) {
      const message = errorMessage(submitError, "Could not save this book. Please try again.")
      setError(message)
      toast({
        variant: "destructive",
        title: "Book not saved",
        description: message,
      })
    } finally {
      setPhase("idle")
    }
  }

  const pending = createBook.isPending || updateBook.isPending || phase !== "idle"
  const submitLabel = phase === "validating"
    ? "Checking detailsâ€¦"
    : phase === "uploading"
      ? "Uploading filesâ€¦"
      : phase === "saving"
        ? "Savingâ€¦"
        : book
          ? "Save changes"
          : "Add book"

  return <section id="book-form" className="rounded-2xl border border-primary/25 bg-card p-5 shadow-lg shadow-primary/5 sm:p-7"><div className="flex items-start gap-3 border-b border-border pb-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{book ? <Pencil className="h-4 w-4" /> : <Upload className="h-4 w-4" />}</span><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">{book ? "Edit book" : "New book"}</p><h2 className="mt-1 text-xl font-extrabold">{book ? "Refine this listing" : "Add a book to the shelf"}</h2></div></div>
     {phase === "uploading" && <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4" role="status" aria-live="polite"><div className="flex items-center justify-between gap-3 text-sm"><p className="font-extrabold">Uploading files</p><p className="font-mono text-xs font-bold text-primary">{uploadProgress === null ? "Workingâ€¦" : `${uploadProgress}%`}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10" role="progressbar" aria-label="Book file upload progress" aria-valuemin={0} aria-valuemax={100} {...(uploadProgress === null ? { "aria-valuetext": "Upload in progress" } : { "aria-valuenow": uploadProgress })}><div className={uploadProgress === null ? "h-full w-1/3 rounded-full bg-primary animate-pulse" : "h-full rounded-full bg-primary transition-[width] duration-200 ease-out"} style={uploadProgress === null ? undefined : { width: `${uploadProgress}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{uploadProgress === null ? "Upload started. Waiting for transfer progressâ€¦" : uploadProgress === 100 ? "Upload complete. Preparing your bookâ€¦" : "Keep this window open while the files upload."}</p></div>}
     <form onSubmit={submit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
      <label><span className="mb-2 block text-xs font-bold">Title</span><input data-testid="input-book-title" required value={title} onChange={e => setTitle(e.target.value)} className={fieldClass} /></label>
      <label><span className="mb-2 block text-xs font-bold">Author</span><input data-testid="input-book-author" required value={author} onChange={e => setAuthor(e.target.value)} className={fieldClass} /></label>
      <label><span className="mb-2 block text-xs font-bold">Slug</span><input required value={slug} onChange={e => setSlug(e.target.value)} className={fieldClass} /><span className="mt-1 block text-xs text-muted-foreground">Used in catalogue links; keep it lowercase with hyphens.</span></label>
      <label><span className="mb-2 block text-xs font-bold">Price (USD)</span><input data-testid="input-book-price" required min="0" step="0.01" type="number" value={price} onChange={e => setPrice(e.target.value)} className={fieldClass} /><span className="mt-1 block text-xs text-muted-foreground">USD is the source price. Nigerian pricing is calculated automatically at checkout.</span></label>
      <fieldset className="sm:col-span-2"><legend className="mb-2 block text-xs font-bold">Categories</legend><div className="grid gap-2 sm:grid-cols-2">{GENRE_CATEGORIES.map((genre) => <label key={genre} className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm"><input type="checkbox" checked={categories.includes(genre)} onChange={(event) => setCategories((current) => event.target.checked ? [...new Set([...current, genre])] : current.filter((item) => item !== genre))} />{genre}</label>)}</div><span className="mt-1 block text-xs text-muted-foreground">Choose every category that applies to this book.</span></fieldset>
      <label><span className="mb-2 block text-xs font-bold">Format</span><select value={format} onChange={e => setFormat(e.target.value as BookInputFormat)} className={fieldClass}><option>EPUB</option><option>PDF</option></select></label>
      <label><span className="mb-2 block text-xs font-bold">Ebook file {book && <span className="font-normal text-muted-foreground">(optional replacement)</span>}</span><input data-testid="input-book-file" required={!book} accept={format === "PDF" ? ".pdf,application/pdf" : ".epub,application/epub+zip"} type="file" onChange={e => setEbookFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary" /></label>
      <label><span className="mb-2 block text-xs font-bold">Cover image <span className="font-normal text-muted-foreground">({book ? "optional replacement" : "optional"})</span></span><input accept="image/png,image/jpeg,image/webp" type="file" onChange={e => setCoverFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary" /></label>
      <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} />Show this book in Featured</label>
      <label><span className="mb-2 block text-xs font-bold">Publish date</span><input type="datetime-local" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} className={fieldClass} /></label>
      <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold">Description</span><textarea data-testid="input-book-description" required value={description} onChange={e => setDescription(e.target.value)} className={`${fieldClass} min-h-28 py-3`} /></label>
       <label><span className="mb-2 block text-xs font-bold">Payoneer link (International) <span className="font-normal text-muted-foreground">(informational only)</span></span><input data-testid="input-book-payoneer-link" type="url" value={payoneerLink} onChange={e => setPayoneerLink(e.target.value)} placeholder="https://â€¦" className={fieldClass} /><span className="mt-1 block text-xs text-muted-foreground">For international buyers. This link never confirms payment by itself.</span></label>
       <div className="flex gap-2 sm:col-span-2"><button data-testid="button-save-book" type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-extrabold text-primary-foreground disabled:opacity-60">{submitLabel}</button><button data-testid="button-cancel-book" type="button" onClick={onDone} className="h-11 rounded-xl border border-border px-5 text-xs font-bold">Cancel</button></div>
       {error && <p role="alert" className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive sm:col-span-2">{error}</p>}
    </form>
  </section>
}

export default function Admin() {
  const { user, loading: authLoading, isAdmin, signOutUser } = useAuth()
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const enabled = Boolean(isAdmin)
  const dashboard = useGetAdminDashboard({ query: { queryKey: getGetAdminDashboardQueryKey(), enabled } })
  const books = useListAdminBooks({ query: { queryKey: getListAdminBooksQueryKey(), enabled } })
  const deleteBook = useDeleteBook()
  const orders = useListAdminOrders(undefined, { query: { queryKey: ["/api/admin/orders"], enabled } })
  const confirmOrder = useConfirmAdminOrder()
  const [form, setForm] = useState<"new" | Book | null>(null)
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null)
  const [orderActionError, setOrderActionError] = useState<string | null>(null)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminEmails, setAdminEmails] = useState<string[]>([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminSaving, setAdminSaving] = useState(false)

  useEffect(() => {
    if (!firebaseDb) {
      setAdminLoading(false)
      setAdminError("Firestore is not configured for admin management.")
      return
    }
    if (authLoading) {
      return
    }
    if (!isAdmin) {
      setAdminLoading(false)
      setAdminError(null)
      return
    }

    setAdminLoading(true)
    setAdminError(null)

    let unsubscribe: (() => void) | undefined
    try {
      const adminCollection = collection(firebaseDb, "admins")
      unsubscribe = onSnapshot(adminCollection, (snapshot) => {
        setAdminEmails(snapshot.docs.map((doc) => doc.id))
        setAdminLoading(false)
        setAdminError(null)
      }, (error) => {
        console.error("Could not load admin list", error)
        setAdminLoading(false)
        setAdminError("Could not load admin list.")
      })
    } catch (err) {
      console.error("Failed to subscribe to admin collection", err)
      setAdminLoading(false)
      setAdminError("Could not load admin list.")
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [authLoading, firebaseDb, isAdmin])

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      setLocation("/admin/login")
    }
  }, [isAdmin, authLoading, setLocation])

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading Administrative controlsâ€¦</main>
  }

  if (!isAdmin) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">You must be an admin to access this page.</main>
  }
  const stats = [{ label: "Page views", value: dashboard.data?.totalPageViews ?? 0, icon: Eye, tint: "text-primary bg-primary/10" }, { label: "Unique visitors", value: dashboard.data?.uniqueVisitors ?? 0, icon: Users, tint: "text-indigo-400 bg-indigo-400/10" }, { label: "Paid orders", value: dashboard.data?.paidOrders ?? 0, icon: CheckCircle2, tint: "text-emerald-500 bg-emerald-500/10" }, { label: "Revenue", value: formatPrice(dashboard.data?.totalRevenue ?? 0, "USD"), icon: WalletCards, tint: "text-amber-500 bg-amber-500/10" }]
  const bookList: Book[] = Array.isArray(books.data) ? books.data : []
  const orderList: Order[] = Array.isArray(orders.data) ? orders.data : []
  const handleConfirmOrder = (order: Order) => {
    if (!window.confirm(`Confirm that payment for ${order.reference} has landed in your ${order.paymentMethod === "paystack" ? "Paystack" : "Payoneer"} account?`)) return
    setConfirmingOrderId(order.id)
    setOrderActionError(null)
    confirmOrder.mutate({ orderId: order.id }, {
      onSuccess: () => {
        setConfirmingOrderId(null)
        void queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() })
        void orders.refetch()
      },
      onError: (error) => {
        setConfirmingOrderId(null)
        setOrderActionError(error instanceof Error ? error.message : "The order could not be confirmed. Please try again.")
      },
    })
  }

  const handleDeleteBook = (book: Book) => {
    if (!window.confirm(`Delete â€œ${book.title}â€ from the catalogue? This cannot be undone.`)) return
    deleteBook.mutate({ bookId: book.id }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getListAdminBooksQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() })
        void queryClient.invalidateQueries({ queryKey: getGetStorefrontSummaryQueryKey() })
        toast({ title: "Book deleted", description: `â€œ${book.title}â€ was removed from the catalogue.` })
      },
      onError: (error) => toast({ variant: "destructive", title: "Book not deleted", description: errorMessage(error, "The book could not be deleted.") }),
    })
  }

  return <main className="min-h-screen bg-secondary/35 px-4 pb-16 pt-6 sm:px-6 sm:pt-8"><div className="mx-auto max-w-6xl space-y-7"><AdminNav onLogout={async () => { await signOutUser(); setLocation("/admin/login") }} />
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Panel</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Manage your website effectively</h1><p className="mt-1 text-sm text-muted-foreground"></p></div><button data-testid="button-refresh-dashboard" onClick={() => { void dashboard.refetch(); void books.refetch(); void orders.refetch() }} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button></div>
    <section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary"></p><h2 className="mt-1 text-2xl font-extrabold">Overview</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats.map(s => <div key={s.label} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm"><div><p className="text-xs font-bold text-muted-foreground">{s.label}</p><p data-testid={`text-analytics-${s.label.toLowerCase().replace(" ", "-")}`} className="mt-1 text-2xl font-extrabold">{s.value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.tint}`}><s.icon className="h-5 w-5" /></span></div>)}</div></section>
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Admin team</p>
          <h2 className="mt-1 text-2xl font-extrabold">Manage admin access</h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="sm:col-span-2">
          <span className="mb-2 block text-xs font-bold">Admin email</span>
          <input
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="admin@example.com"
            className={fieldClass}
          />
        </label>
        <button
          type="button"
          onClick={async () => {
            if (!firebaseDb) return
            const normalized = adminEmail.trim().toLowerCase()
            if (!normalized) {
              setAdminError("Enter a valid email before adding an admin.")
              return
            }
            setAdminSaving(true)
            setAdminError(null)
            try {
              await setDoc(doc(firebaseDb, "admins", normalized), { email: normalized })
              setAdminEmail("")
            } catch (error) {
              console.error("Could not save admin email", error)
              setAdminError("Could not add admin email.")
            } finally {
              setAdminSaving(false)
            }
          }}
          disabled={adminSaving}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-xs font-extrabold text-primary-foreground disabled:opacity-60"
        >
          {adminSaving ? "Savingâ€¦" : "Add admin"}
        </button>
      </div>
      {adminError && <p className="mt-4 text-sm text-destructive">{adminError}</p>}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-background/60">
        <div className="grid gap-0 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground sm:grid-cols-[1fr_auto]">
          <div className="px-4 py-3">Admin email</div>
          <div className="px-4 py-3">Actions</div>
        </div>
        <div className="divide-y divide-border">
          {adminLoading ? (
            <div className="p-5 text-sm text-muted-foreground">Loading admin listâ€¦</div>
          ) : adminEmails.length ? (
            adminEmails.map((email) => (
              <div key={email} className="grid gap-0 text-sm sm:grid-cols-[1fr_auto]">
                <div className="px-4 py-4 text-sm text-foreground">{email}</div>
                <div className="px-4 py-4">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!firebaseDb) return
                      setAdminError(null)
                      try {
                        await deleteDoc(doc(firebaseDb, "admins", email))
                      } catch (error) {
                        console.error("Could not remove admin email", error)
                        setAdminError("Could not remove admin email.")
                      }
                    }}
                    className="rounded-full border border-border px-3 py-2 text-[0.72rem] font-bold text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-5 text-sm text-muted-foreground">No admin emails configured yet.</div>
          )}
        </div>
      </div>
    </section>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Catalogue</p><h2 className="mt-1 text-2xl font-extrabold">Your shelf</h2></div><button type="button" data-testid="button-add-title" onClick={() => setForm(form === "new" ? null : "new")} aria-expanded={form === "new"} aria-controls="book-form" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground"><Plus className="h-4 w-4" /> {form === "new" ? "Close form" : "Add book"}</button></div>
     {form === "new" && <BookForm onDone={() => setForm(null)} />}{form && form !== "new" && <BookForm book={form} onDone={() => setForm(null)} />}
     <div>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="divide-y divide-border">
          {bookList.map((book) => (
            <div key={book.id} className="flex items-center gap-3 p-4 sm:p-5">
              <div className="flex h-11 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary">
                {book.coverUrl ? <img src={book.coverUrl} alt="" className="h-full w-full object-cover" /> : <FileText className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold">{book.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{book.author} · {book.format}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-extrabold">{formatPrice(book.price, "USD")}</p>
                  <span className="text-[0.62rem] font-bold text-primary">{book.categories.join(" · ")}</span>
                </div>
                <button data-testid={"button-edit-book-" + book.id} onClick={() => setForm(book)} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-primary" aria-label={"Edit " + book.title}><Pencil className="h-4 w-4" /></button>
                <button data-testid={"button-delete-book-" + book.id} onClick={() => handleDeleteBook(book)} disabled={deleteBook.isPending} className="rounded-lg border border-border p-2 text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-50" aria-label={"Delete " + book.title}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
          {!books.isLoading && !bookList.length && <div className="p-10 text-center"><BookOpen className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-bold">No books listed yet.</p></div>}
        </div>
      </section>
    </div>
     <section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Operations</p><h2 className="mt-1 text-2xl font-extrabold">Orders</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Check your Paystack or Payoneer dashboard before confirming a customer payment. Confirming here sends the ebook and receipt.</p></div>{orderActionError && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{orderActionError}</p>}<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm divide-y divide-border">{orderList.map(order => { const needsConfirmation = order.status === "pending" && Boolean(order.paymentReference); const statusLabel = order.status === "fulfilled" ? "Fulfilled" : needsConfirmation ? "Pending confirmation" : order.status; return <div key={order.id} className="flex flex-wrap items-center gap-3 p-4 hover:bg-secondary/50 sm:p-5"><Link href={`/order/${order.id}`} className="min-w-0 flex-1"><p className="font-mono text-xs font-bold">{order.reference}</p><p className="mt-1 truncate text-xs text-muted-foreground">{order.email} Â· {formatDate(order.createdAt)}</p></Link><div className="flex flex-wrap items-center justify-end gap-2"><span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold ${needsConfirmation ? "bg-amber-500/15 text-amber-700" : order.status === "fulfilled" ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-muted-foreground"}`}>{statusLabel}</span><span className="text-sm font-extrabold">{formatPrice(order.subtotal, order.currency)}</span>{needsConfirmation && <button type="button" data-testid={`button-confirm-payment-${order.id}`} onClick={() => handleConfirmOrder(order)} disabled={confirmingOrderId === order.id} className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-[0.68rem] font-extrabold text-primary-foreground disabled:cursor-wait disabled:opacity-60">{confirmingOrderId === order.id ? "Confirmingâ€¦" : "Confirm Payment"}</button>}</div></div> })}{!orders.isLoading && !orderList.length && <div className="p-10 text-center"><Clock3 className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-bold">No orders yet.</p></div>}</div></section>
  </div></main>
}
