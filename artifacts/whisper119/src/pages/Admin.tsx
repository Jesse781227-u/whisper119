import { useEffect, useState } from "react"
import { Link, useLocation } from "wouter"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BookOpen, CheckCircle2, Clock3, FileText, LogOut, Pencil, Plus, RefreshCw, Trash2, Upload, Users, Eye, WalletCards, Mail, CalendarClock, Send, Search, AlertTriangle } from "lucide-react"
import {
  getGetAdminDashboardQueryKey, getGetStorefrontSummaryQueryKey, getListAdminBooksQueryKey, getListBooksQueryKey, getListCategoriesQueryKey,
  useGetAdminDashboard, useListAdminBooks, useListAdminOrders,
  useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateBook, useDeleteBook, useUpdateBook,
  requestUploadUrl as requestUploadUrlApi,
  getListNewsletterMessagesQueryKey, useListNewsletterMessages, useCreateNewsletterMessage, useUpdateNewsletterMessage, useSendNewsletterMessage,
} from "@workspace/api-client-react"
import { useAuth } from "@/components/auth-provider"
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore"
import { firebaseDb } from "@/lib/firebase"
import type { Book, BookInput, BookInputFormat, BookUpdate, Order, Category, NewsletterMessage } from "@workspace/api-client-react"
import { formatDate, formatPrice } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { languages } from "@/hooks/use-site-language"

const fieldClass = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"

function previewMarkdown(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>').replace(/\n/g, "<br />")
}

function NewsletterPanel() {
  type NewsletterOverview = {
    subscribers: Array<{ id: string; email: string; name: string | null; source: "signup_form" | "purchase" | "both"; subscribed: boolean; createdAt: string }>
    summary: { totalSubscribers: number; activeSubscribers: number; totalMessagesSent: number; engagement: Record<"sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained", number>; rates: Record<"delivered" | "opened" | "clicked" | "bounced", number> }
    bySource: Record<"signup_form" | "purchase" | "both", number>
    byStatus: Record<"active" | "unsubscribed", number>
  }
  type NewsletterTemplate = { id: string; name: string; subject: string; bodyMarkdown: string; createdAt: string; updatedAt: string }
  const overview = useQuery({ queryKey: ["/api/admin/newsletter/overview"], queryFn: async () => {
    const response = await fetch("/api/admin/newsletter/overview")
    if (!response.ok) throw new Error("Could not load newsletter overview")
    return response.json() as Promise<NewsletterOverview>
  }})
  const messages = useListNewsletterMessages({ query: { queryKey: getListNewsletterMessagesQueryKey() } })
  const templates = useQuery({ queryKey: ["/api/admin/newsletter/templates"], queryFn: async () => {
    const response = await fetch("/api/admin/newsletter/templates")
    if (!response.ok) throw new Error("Could not load newsletter templates")
    return response.json() as Promise<NewsletterTemplate[]>
  }})
  const saveTemplate = useMutation({ mutationFn: async (data: { name: string; subject: string; bodyMarkdown: string }) => {
    const response = await fetch("/api/admin/newsletter/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (!response.ok) throw new Error("Could not save newsletter template")
    return response.json() as Promise<NewsletterTemplate>
  }})
  const create = useCreateNewsletterMessage()
  const update = useUpdateNewsletterMessage()
  const send = useSendNewsletterMessage()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selected, setSelected] = useState<NewsletterMessage | null>(null)
  const [subject, setSubject] = useState("")
  const [bodyMarkdown, setBodyMarkdown] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")

  function edit(message: NewsletterMessage | null) {
    setSelected(message)
    setSubject(message?.subject ?? "")
    setBodyMarkdown(message?.bodyMarkdown ?? "")
    setScheduledAt(message?.scheduledAt ? message.scheduledAt.slice(0, 16) : "")
  }

  function useTemplate(template: NewsletterTemplate) {
    setSelected(null)
    setSubject(template.subject)
    setBodyMarkdown(template.bodyMarkdown)
    setScheduledAt("")
  }

  function saveCurrentTemplate() {
    const name = window.prompt("Template name", subject.trim())?.trim()
    if (!name || !subject.trim() || !bodyMarkdown.trim()) return
    saveTemplate.mutate({ name, subject: subject.trim(), bodyMarkdown: bodyMarkdown.trim() }, { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["/api/admin/newsletter/templates"] }); toast({ title: "Template saved" }) } })
  }

  function save(schedule = false) {
    const data = { subject: subject.trim(), bodyMarkdown: bodyMarkdown.trim(), scheduledAt: schedule && scheduledAt ? new Date(scheduledAt).toISOString() : null }
    const onSuccess = () => { void queryClient.invalidateQueries({ queryKey: getListNewsletterMessagesQueryKey() }); toast({ title: schedule ? "Newsletter scheduled" : "Draft saved" }) }
    if (selected) update.mutate({ messageId: selected.id, data }, { onSuccess })
    else create.mutate({ data }, { onSuccess: (message) => { edit(message); onSuccess() } })
  }

  function sendNow() {
    if (!selected || !window.confirm("Send this newsletter to all subscribed readers now?")) return
    send.mutate({ messageId: selected.id }, { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListNewsletterMessagesQueryKey() }); toast({ title: "Newsletter sent" }) } })
  }

  const messageList = Array.isArray(messages.data) ? messages.data : []
  const overviewData = overview.data
  return <section className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="rule-label text-primary">Newsletter</p><h2 className="mt-1 text-2xl font-extrabold">Audience and messages</h2><p className="mt-2 text-sm text-muted-foreground">Review subscribers, engagement, and compose updates for subscribed readers.</p></div><button type="button" onClick={() => edit(null)} className="admin-interactive inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-primary-foreground sm:w-auto"><Plus className="h-4 w-4" /> New message</button></div>
    {overview.isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="admin-card h-24 p-5"><div className="admin-skeleton h-3 w-24" /><div className="admin-skeleton mt-3 h-7 w-16" /></div>)}</div> : overviewData && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Total subscribers", overviewData.summary.totalSubscribers], ["Active subscribers", overviewData.summary.activeSubscribers], ["Messages sent", overviewData.summary.totalMessagesSent], ["Open rate", `${overviewData.summary.rates.opened}%`]].map(([label, value]) => <div key={String(label)} className="admin-card flex items-center justify-between p-5"><div><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}</p></div><Mail className="h-5 w-5 text-primary" /></div>)}</div><div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]"><div className="admin-card p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><p className="rule-label text-primary">Audience</p><h3 className="mt-1 text-xl font-extrabold">Subscribers</h3></div><Users className="h-5 w-5 text-primary" /></div><div className="mb-6 grid grid-cols-2 gap-3 text-sm"><p>Active <strong className="float-right">{overviewData.byStatus.active}</strong></p><p>Unsubscribed <strong className="float-right">{overviewData.byStatus.unsubscribed}</strong></p><p>Signup form <strong className="float-right">{overviewData.bySource.signup_form}</strong></p><p>Purchase <strong className="float-right">{overviewData.bySource.purchase}</strong></p></div><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="border-b border-border text-muted-foreground"><tr><th className="pb-3 pr-3 font-bold">Email</th><th className="pb-3 pr-3 font-bold">Source</th><th className="pb-3 pr-3 font-bold">Status</th><th className="pb-3 font-bold">Joined</th></tr></thead><tbody className="divide-y divide-border">{overviewData.subscribers.map((subscriber) => <tr key={subscriber.id}><td className="max-w-44 truncate py-3 pr-3 font-semibold">{subscriber.email}</td><td className="py-3 pr-3"><span className="rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] font-bold text-primary">{subscriber.source}</span></td><td className="py-3 pr-3"><span className={`rounded-full px-2 py-1 text-[0.65rem] font-bold ${subscriber.subscribed ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>{subscriber.subscribed ? "Active" : "Unsubscribed"}</span></td><td className="whitespace-nowrap py-3">{formatDate(subscriber.createdAt)}</td></tr>)}</tbody></table>{overviewData.subscribers.length === 0 && <div className="admin-empty"><Mail className="h-6 w-6 text-primary" /><p className="mt-3 text-sm font-bold">No subscribers yet</p><p className="mt-1 text-xs text-muted-foreground">New signups and purchases will appear here.</p></div>}</div></div><div className="admin-card p-5 sm:p-6"><p className="rule-label text-primary">Engagement</p><h3 className="mt-1 text-xl font-extrabold">All sent messages</h3><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{([["Sent", overviewData.summary.engagement.sent], ["Delivered", overviewData.summary.engagement.delivered], ["Opened", overviewData.summary.engagement.opened], ["Clicked", overviewData.summary.engagement.clicked], ["Bounced", overviewData.summary.engagement.bounced], ["Complained", overviewData.summary.engagement.complained]] as const).map(([label, value]) => <div key={label} className="admin-card-soft p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-extrabold">{value}</p></div>)}</div><p className="mt-5 text-xs text-muted-foreground">Delivery {overviewData.summary.rates.delivered}% · Open {overviewData.summary.rates.opened}% · Click {overviewData.summary.rates.clicked}% · Bounce {overviewData.summary.rates.bounced}%</p></div></div></>}
    <div className="grid gap-6 lg:grid-cols-2"><div><p className="rule-label mb-3 text-primary">Messages</p><div className="admin-card overflow-hidden divide-y divide-border">{messages.isLoading ? <div className="space-y-3 p-6"><div className="admin-skeleton h-5 w-3/4" /><div className="admin-skeleton h-4 w-1/2" /></div> : messageList.length ? messageList.map(message => <button type="button" key={message.id} onClick={() => edit(message)} className="admin-interactive flex w-full flex-wrap items-center gap-3 p-4 text-left sm:p-5"><Mail className="h-5 w-5 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{message.subject}</span><span className="mt-1 block text-xs text-muted-foreground">{message.status === "scheduled" && message.scheduledAt ? `Scheduled ${formatDate(message.scheduledAt)}` : message.sentAt ? `Sent ${formatDate(message.sentAt)}` : "Draft"}</span></span><span className="rounded-full bg-secondary px-2.5 py-1 text-[0.65rem] font-bold uppercase">{message.status}</span>{message.status === "sent" && <span className="text-right text-xs text-muted-foreground">{message.stats.sent} sent · {message.stats.opened} opened · {message.stats.clicked} clicked</span>}</button>) : <div className="admin-empty"><Mail className="h-7 w-7 text-primary" /><p className="mt-3 text-sm font-bold">No messages yet</p><p className="mt-1 text-xs text-muted-foreground">Send updates to your subscribed readers from this desk.</p><button type="button" onClick={() => edit(null)} className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground">Compose your first message</button></div>}</div></div><div><div className="mb-3 flex items-center justify-between"><p className="rule-label text-primary">Templates</p><span className="text-xs text-muted-foreground">{templates.data?.length ?? 0} saved</span></div><div className="admin-card overflow-hidden divide-y divide-border">{templates.isLoading ? <div className="space-y-3 p-6"><div className="admin-skeleton h-5 w-2/3" /><div className="admin-skeleton h-4 w-1/2" /></div> : templates.data?.length ? templates.data.map(template => <div key={template.id} className="flex items-center gap-3 p-4"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{template.name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{template.subject}</span></span><button type="button" onClick={() => useTemplate(template)} className="admin-interactive rounded-xl border border-primary px-3 py-2 text-xs font-bold text-primary">Use</button></div>) : <div className="admin-empty"><FileText className="h-6 w-6 text-primary" /><p className="mt-3 text-sm font-bold">No saved templates</p></div>}</div></div></div>
    {(selected || subject || bodyMarkdown) && <div className="grid gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:grid-cols-2"><div><div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="h-4 w-4" /></span><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">{selected ? "Edit message" : "Compose"}</p><h3 className="text-xl font-extrabold">Newsletter draft</h3></div></div><label className="block"><span className="mb-2 block text-xs font-bold">Subject</span><input value={subject} onChange={event => setSubject(event.target.value)} disabled={selected?.status === "sent"} className={fieldClass} /></label><label className="mt-4 block"><span className="mb-2 block text-xs font-bold">Body in Markdown</span><textarea value={bodyMarkdown} onChange={event => setBodyMarkdown(event.target.value)} disabled={selected?.status === "sent"} className={`${fieldClass} min-h-64 py-3`} placeholder="# A note from me\n\nWrite your newsletter here..." /></label><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => save()} disabled={Boolean(selected?.status === "sent") || create.isPending || update.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground"><Pencil className="h-3.5 w-3.5" /> Save draft</button><button type="button" onClick={saveCurrentTemplate} disabled={saveTemplate.isPending || !subject.trim() || !bodyMarkdown.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-xs font-extrabold">Save as template</button>{selected?.status !== "sent" && <><input type="datetime-local" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs" /><button type="button" onClick={() => save(true)} disabled={!scheduledAt || update.isPending || create.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary px-4 text-xs font-extrabold text-primary"><CalendarClock className="h-3.5 w-3.5" /> Schedule</button><button type="button" onClick={sendNow} disabled={send.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-xs font-extrabold text-background"><Send className="h-3.5 w-3.5" /> {send.isPending ? "Sending..." : "Send now"}</button></>}</div></div><div className="rounded-xl border border-border bg-background p-5"><p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Live preview</p><article className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: previewMarkdown(bodyMarkdown) }} /></div>{selected && <div className="lg:col-span-2"><p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Engagement</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{([['Sent', selected.stats.sent], ['Delivered', selected.stats.delivered], ['Opened', selected.stats.opened], ['Clicked', selected.stats.clicked], ['Bounced', selected.stats.bounced], ['Complained', selected.stats.complained]] as const).map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-extrabold">{value}</p></div>)}</div></div>}</div>}
  </section>
}

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
type LanguageRequest = { id: string; bookTitle: string; name: string; country: string; language: string; createdAt: string }
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
  const [titleGroupId, setTitleGroupId] = useState(book?.titleGroupId ?? "")
  const [language, setLanguage] = useState(book?.language ?? "en")
  const [author, setAuthor] = useState(book?.author ?? "")
  const [price, setPrice] = useState(String(book?.price ?? ""))
  const { data: categoryData } = useListCategories()
  const availableCategories = Array.isArray(categoryData) ? categoryData : []
  const [categorySearch, setCategorySearch] = useState("")
  const [categories, setCategories] = useState<string[]>(book?.categories?.length ? [...book.categories] : [])
  const [slug, setSlug] = useState(book?.slug ?? "")
  const [description, setDescription] = useState(book?.description ?? "")
  const [format, setFormat] = useState<BookInputFormat>(book?.format ?? "EPUB")
  const [featured, setFeatured] = useState(book?.featured ?? false)
  const [isCompleted, setIsCompleted] = useState(book?.isCompleted ?? false)
  const [publishedAt, setPublishedAt] = useState(book?.publishedAt ? book.publishedAt.slice(0, 16) : new Date().toISOString().slice(0, 16))
  const [ebookFile, setEbookFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<BookFormPhase>("idle")
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  async function uploadFile(file: File, onProgress: UploadProgressHandler) {
    const uploadResponse = await requestUploadUrlApi(
      { name: file.name, size: file.size, contentType: file.type || "application/octet-stream", language: language.trim().toLowerCase() },
      {},
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
      const titleGroupValue = titleGroupId.trim() || titleValue.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      const authorValue = author.trim()
      const descriptionValue = description.trim()
      const priceValue = Number(price)

      if (!titleValue) throw new Error("Enter a book title.")
      if (!language.trim()) throw new Error("Choose the book language.")
      if (!book && !authorValue) throw new Error("Enter the author name.")
      if (!price.trim()) throw new Error("Enter the USD price.")
      if (!Number.isFinite(priceValue) || priceValue < 0) throw new Error("Enter a valid non-negative USD price.")
      if (!descriptionValue) throw new Error("Enter a book description.")
      if (!categories.length) throw new Error("Choose at least one category.")
      if (!book && !ebookFile) throw new Error("Choose the ebook file before saving this book.")

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
          titleGroupId: titleGroupValue,
          language: language.trim().toLowerCase(),
          slug: slug.trim(),
          author: authorValue,
          description: descriptionValue,
          price: priceValue,
          categories,
          format,
          featured,
          isCompleted,
          publishedAt: new Date(publishedAt).toISOString(),
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
          titleGroupId: titleGroupValue,
          language: language.trim().toLowerCase(),
          author: authorValue,
          slug: titleValue.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          price: priceValue,
          priceNgn: 0,
          currency: "USD",
          categories,
          description: descriptionValue,
          format,
          paystackLink: null,
          payoneerLink: null,
          coverObjectPath,
          fileObjectPath,
          fileName: ebook.name,
          featured,
          isCompleted,
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
      <label><span className="mb-2 block text-xs font-bold">Language</span><select value={language} onChange={e => setLanguage(e.target.value)} className={fieldClass}>{languages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <label><span className="mb-2 block text-xs font-bold">Title group</span><input value={titleGroupId} onChange={e => setTitleGroupId(e.target.value)} placeholder="Same ID for translated editions" className={fieldClass} /><span className="mt-1 block text-xs text-muted-foreground">Use the same group ID for every language edition of this title.</span></label>
      <label><span className="mb-2 block text-xs font-bold">Slug</span><input required value={slug} onChange={e => setSlug(e.target.value)} className={fieldClass} /><span className="mt-1 block text-xs text-muted-foreground">Used in catalogue links; keep it lowercase with hyphens.</span></label>
      <label><span className="mb-2 block text-xs font-bold">Price (USD)</span><input data-testid="input-book-price" required min="0" step="0.01" type="number" value={price} onChange={e => setPrice(e.target.value)} className={fieldClass} /><span className="mt-1 block text-xs text-muted-foreground">USD is the source price. Nigerian pricing is calculated automatically at checkout.</span></label>
      <fieldset className="sm:col-span-2"><legend className="mb-2 block text-xs font-bold">Categories</legend><input value={categorySearch} onChange={event => setCategorySearch(event.target.value)} placeholder="Search categories" className={`${fieldClass} mb-2`} /><div className="flex min-h-11 flex-wrap gap-2 rounded-xl border border-border bg-background p-2">{categories.map(category => <button type="button" key={category} onClick={() => setCategories(current => current.filter(item => item !== category))} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{category} ×</button>)}{availableCategories.filter(category => !categories.includes(category.name) && category.name.toLowerCase().includes(categorySearch.toLowerCase())).slice(0, 12).map(category => <button type="button" key={category.id} onClick={() => setCategories(current => [...current, category.name])} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary">{category.name}</button>)}</div><span className="mt-1 block text-xs text-muted-foreground">Choose every category that applies to this book.</span></fieldset>
      <label><span className="mb-2 block text-xs font-bold">Format</span><select value={format} onChange={e => setFormat(e.target.value as BookInputFormat)} className={fieldClass}><option>EPUB</option><option>PDF</option></select></label>
      <label><span className="mb-2 block text-xs font-bold">Ebook file {book && <span className="font-normal text-muted-foreground">(optional replacement)</span>}</span><input data-testid="input-book-file" required={!book} accept={format === "PDF" ? ".pdf,application/pdf" : ".epub,application/epub+zip"} type="file" onChange={e => setEbookFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary" /></label>
      <label><span className="mb-2 block text-xs font-bold">Cover image <span className="font-normal text-muted-foreground">({book ? "optional replacement" : "optional"})</span></span><input accept="image/png,image/jpeg,image/webp" type="file" onChange={e => setCoverFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary" /></label>
      <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} />Show this book in Featured</label><label className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm"><input type="checkbox" checked={isCompleted} onChange={e => setIsCompleted(e.target.checked)} />Completed series</label>
      <label><span className="mb-2 block text-xs font-bold">Publish date</span><input type="datetime-local" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} className={fieldClass} /></label>
      <label className="sm:col-span-2"><span className="mb-2 block text-xs font-bold">Description</span><textarea data-testid="input-book-description" required value={description} onChange={e => setDescription(e.target.value)} className={`${fieldClass} min-h-28 py-3`} /></label>
       <div className="flex gap-2 sm:col-span-2"><button data-testid="button-save-book" type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-extrabold text-primary-foreground disabled:opacity-60">{submitLabel}</button><button data-testid="button-cancel-book" type="button" onClick={onDone} className="h-11 rounded-xl border border-border px-5 text-xs font-bold">Cancel</button></div>
       {error && <p role="alert" className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive sm:col-span-2">{error}</p>}
    </form>
  </section>
}

function CategoryManager() {
  const queryClient = useQueryClient()
  const { data } = useListCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()
  const [name, setName] = useState("")
  const [search, setSearch] = useState("")
  const categories: Category[] = Array.isArray(data) ? data : []
  const filteredCategories = categories.filter(category => category.name.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const refresh = () => void queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() })

  return <section className="admin-card p-5 sm:p-6">
    <div className="mb-5"><p className="rule-label text-primary">Taxonomy</p><h2 className="mt-1 text-xl font-extrabold">Manage categories</h2><p className="mt-2 text-sm text-muted-foreground">Keep your shelf easy to browse and promote featured themes.</p></div>
    <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><input value={name} onChange={event => setName(event.target.value)} placeholder="New category name" className={fieldClass} /><button type="button" disabled={!name.trim() || create.isPending} onClick={() => create.mutate({ data: { name: name.trim() } }, { onSuccess: () => { setName(""); refresh() } })} className="admin-interactive h-11 rounded-xl bg-primary px-5 text-xs font-extrabold text-primary-foreground">Add category</button></div>
    <label className="relative mt-5 block"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><span className="sr-only">Filter categories</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Filter categories by name" className={`${fieldClass} pl-10`} /></label>
    <div className="mt-5 space-y-3">{filteredCategories.map(category => <div key={category.id} className="admin-card-soft grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"><input defaultValue={category.name} aria-label={`Name for ${category.name}`} onBlur={event => { const next = event.target.value.trim(); if (next && next !== category.name) update.mutate({ categoryId: category.id, data: { name: next, featured: category.featured } }, { onSuccess: refresh }) }} className="min-w-0 bg-transparent text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring" /><span className="w-fit rounded-full bg-secondary px-2.5 py-1 text-xs font-bold text-muted-foreground">{category.count} {category.count === 1 ? "book" : "books"}</span><button type="button" aria-pressed={category.featured} onClick={() => update.mutate({ categoryId: category.id, data: { name: category.name, featured: !category.featured } }, { onSuccess: refresh })} className={`admin-interactive rounded-full px-3 py-1.5 text-xs font-bold ${category.featured ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{category.featured ? "Featured" : "Feature"}</button><button type="button" disabled={Boolean(category.count) || remove.isPending} title={category.count ? "Reassign books before deleting this category" : "Delete category"} onClick={() => { if (!window.confirm(`Delete ${category.name}? This cannot be undone.`)) return; remove.mutate({ categoryId: category.id }, { onSuccess: refresh }) }} className="admin-interactive rounded-full border border-border px-3 py-1.5 text-xs font-bold text-destructive disabled:cursor-not-allowed disabled:opacity-40">Delete</button></div>)}{!filteredCategories.length && <div className="admin-empty"><Search className="h-6 w-6 text-primary" /><p className="mt-3 text-sm font-bold">No categories found</p><p className="mt-1 text-xs text-muted-foreground">Try a different search or add a new category above.</p></div>}</div>
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
  const orders = useListAdminOrders(undefined, { query: { queryKey: ["/api/admin/orders"], enabled, refetchInterval: 10_000, refetchOnWindowFocus: true } })
  const [form, setForm] = useState<"new" | Book | null>(null)
  const [adminEmail, setAdminEmail] = useState("")
  const [adminEmails, setAdminEmails] = useState<string[]>([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminSaving, setAdminSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"catalogue" | "orders" | "newsletter">("catalogue")
  const [languageRequests, setLanguageRequests] = useState<LanguageRequest[]>([])

  useEffect(() => {
    if (!enabled) return
    void fetch("/api/admin/language-requests").then((response) => response.ok ? response.json() : []).then((data: unknown) => setLanguageRequests(Array.isArray(data) ? data as LanguageRequest[] : [])).catch(() => setLanguageRequests([]))
  }, [enabled])

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
  const revenueByCurrency = dashboard.data?.revenueByCurrency ?? { USD: 0, NGN: 0 }
  const stats = [{ label: "Page views", value: dashboard.data?.totalPageViews ?? 0, icon: Eye, tint: "text-primary bg-primary/10" }, { label: "Unique visitors", value: dashboard.data?.uniqueVisitors ?? 0, icon: Users, tint: "text-indigo-400 bg-indigo-400/10" }, { label: "Paid orders", value: dashboard.data?.paidOrders ?? 0, icon: CheckCircle2, tint: "text-emerald-500 bg-emerald-500/10" }, { label: "Revenue", value: `${formatPrice(revenueByCurrency.USD, "USD")} · ${formatPrice(revenueByCurrency.NGN, "NGN")}`, icon: WalletCards, tint: "text-amber-500 bg-amber-500/10" }]
  const bookList: Book[] = Array.isArray(books.data) ? books.data : []
  const orderList: Order[] = Array.isArray(orders.data) ? orders.data : []
  const orderActionError: string | null = null
  const confirmingOrderId: string | null = null
  const handleConfirmOrder = (_order: Order) => undefined
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

  return <main className="min-h-screen bg-secondary/35 px-4 pb-16 pt-6 sm:px-6 sm:pt-8"><div className="mx-auto max-w-6xl space-y-8"><AdminNav onLogout={async () => { await signOutUser(); setLocation("/admin/login") }} />
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Panel</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight">Manage your website effectively</h1><p className="mt-1 text-sm text-muted-foreground"></p></div><button data-testid="button-refresh-dashboard" onClick={() => { void dashboard.refetch(); void books.refetch(); void orders.refetch() }} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button></div>
    <section><div className="mb-4"><p className="rule-label text-primary">At a glance</p><h2 className="mt-1 text-2xl font-extrabold">Overview</h2></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{stats.map(s => <div key={s.label} className="admin-card flex min-h-28 items-center justify-between gap-3 p-4 sm:p-5"><div className="min-w-0"><p className="text-xs font-bold text-muted-foreground">{s.label}</p><p data-testid={`text-analytics-${s.label.toLowerCase().replace(" ", "-")}`} className="mt-2 truncate text-xl font-extrabold sm:text-2xl">{s.value}</p>{s.label === "Revenue" && <p className="mt-1 text-[0.65rem] text-muted-foreground">USD · NGN</p>}</div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.tint}`}><s.icon className="h-5 w-5" /></span></div>)}</div></section>
    <nav aria-label="Admin sections" className="admin-card flex gap-2 p-2">
      <button type="button" onClick={() => setActiveTab("catalogue")} className={`admin-interactive flex-1 rounded-xl px-3 py-3 text-xs font-extrabold sm:flex-none sm:px-4 ${activeTab === "catalogue" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Catalogue</button>
      <button type="button" onClick={() => setActiveTab("orders")} className={`admin-interactive flex-1 rounded-xl px-3 py-3 text-xs font-extrabold sm:flex-none sm:px-4 ${activeTab === "orders" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Orders{orderList.length > 0 && <span className="ml-2 rounded-full bg-background/30 px-1.5 py-0.5">{orderList.length}</span>}</button>
      <button type="button" onClick={() => setActiveTab("newsletter")} className={`admin-interactive flex-1 rounded-xl px-3 py-3 text-xs font-extrabold sm:flex-none sm:px-4 ${activeTab === "newsletter" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Newsletter</button>
    </nav>
    <section className="admin-card p-5 sm:p-6">
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
          className="admin-interactive inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-xs font-extrabold text-primary-foreground disabled:opacity-60"
        >
          {adminSaving ? "Savingâ€¦" : "Add admin"}
        </button>
      </div>
      {adminError && <p className="mt-4 text-sm text-destructive">{adminError}</p>}
      <div className="mt-7 space-y-3">
        <div className="grid gap-0 text-left text-xs uppercase tracking-[0.16em] text-muted-foreground sm:grid-cols-[1fr_auto]">
          <div className="px-4 py-3">Admin email</div>
          <div className="px-4 py-3">Actions</div>
        </div>
        <div className="space-y-3">
          {adminLoading ? (
            <div className="p-5 text-sm text-muted-foreground">Loading admin listâ€¦</div>
          ) : adminEmails.length ? (
            adminEmails.map((email) => (
              <div key={email} className="admin-card-soft flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0 break-all font-semibold text-foreground">{email}</div>
                <div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!firebaseDb) return
                      if (!window.confirm(`Remove ${email} from admin access?`)) return
                      setAdminError(null)
                      try {
                        await deleteDoc(doc(firebaseDb, "admins", email))
                      } catch (error) {
                        console.error("Could not remove admin email", error)
                        setAdminError("Could not remove admin email.")
                      }
                    }}
                    className="admin-interactive rounded-full border border-border px-3 py-2 text-[0.72rem] font-bold text-destructive"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="admin-empty"><Users className="h-7 w-7 text-primary" /><p className="mt-3 text-sm font-bold">No admin teammates yet</p><p className="mt-1 text-xs text-muted-foreground">Add a trusted email above to share access to the librarian desk.</p></div>
          )}
        </div>
      </div>
    </section>
    {activeTab === "catalogue" && <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="rule-label text-primary">Catalogue</p><h2 className="mt-1 text-2xl font-extrabold">Your shelf</h2></div><button type="button" data-testid="button-add-title" onClick={() => setForm(form === "new" ? null : "new")} aria-expanded={form === "new"} aria-controls="book-form" className="admin-interactive inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-primary-foreground sm:w-auto"><Plus className="h-4 w-4" /> {form === "new" ? "Close form" : "Add book"}</button></div>
    <CategoryManager />
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Reader demand</p><h2 className="mt-1 text-xl font-extrabold">Language requests</h2></div>{languageRequests.length ? <div className="divide-y divide-border">{languageRequests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-bold">{request.language} for {request.bookTitle}</p><p className="mt-1 text-xs text-muted-foreground">{request.name} · {request.country}</p></div><span className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No language requests yet.</p>}</section>
    {form === "new" && <BookForm onDone={() => setForm(null)} />}{form && form !== "new" && <BookForm book={form} onDone={() => setForm(null)} />}
     <div>
      <section className="admin-card overflow-hidden">
        <div className="space-y-3 p-3 sm:p-4">
          {bookList.map((book) => (
            <div key={book.id} className="admin-card-soft admin-interactive flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="flex h-40 w-28 shrink-0 items-center justify-center self-center overflow-hidden rounded-xl bg-primary/10 text-primary sm:h-20 sm:w-14 sm:self-auto">
                {book.coverUrl ? <img src={book.coverUrl} alt={`Cover of ${book.title}`} className="h-full w-full object-cover" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">{book.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{book.author} · {book.format}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-2">{book.categories.slice(0, 4).map(category => <span key={category} className="rounded-full bg-primary/10 px-2 py-1 text-[0.65rem] font-bold text-primary">{category}</span>)}{book.categories.length > 4 && <span className="rounded-full bg-secondary px-2 py-1 text-[0.65rem] font-bold text-muted-foreground">+{book.categories.length - 4} more</span>}</div>
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
          {books.isLoading && <div className="space-y-3 p-2"><div className="admin-skeleton h-24 w-full" /><div className="admin-skeleton h-24 w-full" /></div>}
          {!books.isLoading && !bookList.length && <div className="admin-empty"><BookOpen className="h-7 w-7 text-primary" /><p className="mt-3 text-sm font-bold">No books listed yet</p><p className="mt-1 text-xs text-muted-foreground">Add your first title to start building the shelf.</p><button type="button" onClick={() => setForm("new")} className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground">Add your first book</button></div>}
        </div>
      </section>
    </div>
    </div>}
    {activeTab === "orders" && (
    <section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Operations</p><h2 className="mt-1 text-2xl font-extrabold">Orders</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Flutterwave webhooks verify payments automatically and trigger ebook delivery by email.</p></div>{orderActionError && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{orderActionError}</p>}<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm divide-y divide-border">{orderList.map(order => { const needsDelivery = order.status === "pending" || (order.status === "paid" && !order.deliveryEmailSent); const statusLabel = order.status === "fulfilled" ? "Fulfilled" : order.status === "paid" ? "Paid — delivery pending" : order.status; return <div key={order.id} className="flex flex-wrap items-center gap-3 p-4 hover:bg-secondary/50 sm:p-5"><Link href={`/order/${order.id}`} className="min-w-0 flex-1"><p className="font-mono text-xs font-bold">{order.reference}</p><p className="mt-1 truncate text-xs text-muted-foreground">{order.email} Â· {formatDate(order.createdAt)}</p></Link><div className="flex flex-wrap items-center justify-end gap-2"><span className={`rounded-full px-2.5 py-1 text-[0.62rem] font-bold ${order.status === "fulfilled" ? "bg-emerald-500/10 text-emerald-600" : order.status === "paid" ? "bg-sky-500/10 text-sky-700" : "bg-secondary text-muted-foreground"}`}>{statusLabel}</span><span className="text-sm font-extrabold">{formatPrice(order.subtotal, order.currency)}</span>{needsDelivery && <button type="button" data-testid="button-confirm-payment-target" onClick={() => handleConfirmOrder(order)} disabled={confirmingOrderId === order.id} className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-[0.68rem] font-extrabold text-primary-foreground disabled:cursor-wait disabled:opacity-60">{confirmingOrderId === order.id ? "Sending…" : order.status === "paid" ? "Retry delivery" : "Confirm & Send"}</button>}</div></div> })}{!orders.isLoading && !orderList.length && <div className="p-10 text-center"><Clock3 className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-bold">No orders yet.</p></div>}</div></section>
    )}
    {activeTab === "newsletter" && <NewsletterPanel />}
  </div></main>
}
