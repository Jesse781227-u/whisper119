import { useEffect, useState } from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TiptapLink from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Mail, Pencil, Plus, Send } from "lucide-react"
import {
  requestUploadUrl as requestUploadUrlApi,
  getListNewsletterMessagesQueryKey, useListNewsletterMessages, useCreateNewsletterMessage, useUpdateNewsletterMessage, useSendNewsletterMessage,
} from "@workspace/api-client-react"
import type { NewsletterMessage } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { AdminModal, ConfirmDialog, EmptyState, KpiCard, KpiSkeleton, RowSkeletons, cardClass, fieldClass, neutralChip, plural, primaryButton, secondaryButton, shortDate } from "./shared"

function previewMarkdown(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>').replace(/\n/g, "<br />")
}

function isFullEmailHtml(value: string): boolean {
  return /<!doctype\s+html\b|<html\b|<head\b|<body\b/i.test(value)
}

function normalizeEmailSource(value: string): string {
  const trimmed = value.trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/, "").trim()
  if (!trimmed.includes("&lt;")) return trimmed
  const node = document.createElement("textarea")
  node.innerHTML = trimmed
  const decoded = node.value.trim()
  return isFullEmailHtml(decoded) || /<\/?(?:table|tbody|thead|tfoot|tr|td|th|p|h[1-6]|strong|em|u|ul|ol|li|a|blockquote|hr|img|br)\b[^>]*>/i.test(decoded) ? decoded : trimmed
}

function looksLikeFlattenedEmailHtml(value: string): boolean {
  if (isFullEmailHtml(value)) return false
  const markers = [
    /\b(?:src|href|style|width|height|cellpadding|cellspacing|valign|align)\s*=/i,
    /\{\{(?:book|order|purchase|amount|pdf|epub|support)/i,
    /\b(?:YOUR READING COPY|YOUR BOOK|ORDER DETAILS|DOWNLOAD PDF|DOWNLOAD EPUB)\b/i,
    /<\/?(?:table|tbody|thead|tfoot|tr|td|th)\b/i,
  ]
  return markers.filter((marker) => marker.test(value)).length >= 2
}

function isEmailTemplateHtml(value: string): boolean {
  return isFullEmailHtml(value) || looksLikeFlattenedEmailHtml(value)
}

function normalizeRichHtml(value: string): string {
  return normalizeEmailSource(value)
}

function RichNewsletterEditor({ html, disabled, onChange, onFullHtmlPaste }: { html: string; disabled?: boolean; onChange: (html: string) => void; onFullHtmlPaste: (html: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline, TiptapLink.configure({ openOnClick: false }), Image.configure({ inline: true, allowBase64: false })],
    content: html,
    editable: !disabled,
    onUpdate: ({ editor: nextEditor }) => onChange(nextEditor.getHTML()),
  })
  const [linkEditorOpen, setLinkEditorOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [imageUploading, setImageUploading] = useState(false)
  useEffect(() => {
    if (editor && html !== editor.getHTML() && !editor.isFocused) editor.commands.setContent(html || "<p></p>")
  }, [editor, html])
  useEffect(() => {
    if (disabled) {
      setLinkEditorOpen(false)
      setLinkUrl("")
    }
  }, [disabled])
  useEffect(() => {
    if (!editor) return
    const editorElement = editor.view.dom
    const onPaste = (event: ClipboardEvent) => {
      const clipboardHtml = event.clipboardData?.getData("text/html") ?? ""
      const clipboardText = event.clipboardData?.getData("text/plain") ?? ""
      const htmlCandidate = normalizeEmailSource(clipboardHtml)
      const textCandidate = normalizeEmailSource(clipboardText)
      const fullHtml = isEmailTemplateHtml(htmlCandidate) ? htmlCandidate : isEmailTemplateHtml(textCandidate) ? textCandidate : ""
      if (!fullHtml || !isFullEmailHtml(fullHtml)) return
      event.preventDefault()
      onFullHtmlPaste(fullHtml)
    }
    editorElement.addEventListener("paste", onPaste)
    return () => editorElement.removeEventListener("paste", onPaste)
  }, [editor, onFullHtmlPaste])

  function openLinkEditor() {
    if (!editor) return
    setLinkUrl(editor.getAttributes("link").href ?? "")
    setLinkEditorOpen(true)
  }

  function saveLink() {
    if (!editor) return
    const href = linkUrl.trim()
    if (!href) {
      editor.chain().focus().unsetLink().run()
    } else {
      try {
        const parsed = new URL(href, window.location.origin)
        if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) throw new Error("Unsupported URL protocol")
        editor.chain().focus().setLink({ href: parsed.toString() }).run()
      } catch {
        window.alert("Enter a valid http, https, or mailto link.")
        return
      }
    }
    setLinkEditorOpen(false)
  }

  async function insertImage() {
    const input = document.createElement("input")
    input.type = "file"; input.accept = "image/*"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file || !editor) return
      const insertPosition = editor.state.selection.from
      setImageUploading(true)
      try {
        const contentType = file.type || "application/octet-stream"
        const upload = await requestUploadUrlApi({ name: file.name, size: file.size, contentType, language: "newsletter" })
        const response = await fetch(upload.uploadURL, { method: "PUT", headers: { "Content-Type": contentType }, body: file })
        if (!response.ok) throw new Error("Image upload failed")
        editor.chain().focus().insertContentAt(insertPosition, {
          type: "image",
          attrs: { src: `/api/storage${upload.objectPath}`, alt: file.name },
        }).run()
      } catch (error) { window.alert(error instanceof Error ? error.message : "Image upload failed") }
      finally { setImageUploading(false) }
    }
    input.click()
  }
  if (!editor) return <div className="min-h-64 rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">Loading editor…</div>
  const button = (label: string, action: () => void, active = false, buttonDisabled = false) => (
    <button
      type="button"
      disabled={disabled || buttonDisabled}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={action}
      className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-xs font-bold transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {label}
    </button>
  )
  return <div className="overflow-hidden rounded-xl border border-border bg-background/60">
    <div role="toolbar" aria-label="Formatting toolbar" className="flex flex-wrap gap-1 border-b border-border p-2">
      {button("B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}{button("I", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}{button("U", () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"))}
      {button("H1", () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 }))}{button("H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}{button("H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
      {button("• List", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}{button("1. List", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}{button("Quote", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}{button("Divider", () => editor.chain().focus().setHorizontalRule().run(), editor.isActive("horizontalRule"))}
      {button("Link", openLinkEditor, editor.isActive("link"))}{button("Image", () => void insertImage(), editor.isActive("image"), imageUploading)}
    </div>
    {linkEditorOpen && (
      <form
        className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/30 p-2"
        onSubmit={(event) => { event.preventDefault(); saveLink() }}
      >
        <label htmlFor="newsletter-link-url" className="sr-only">Link URL</label>
        <input
          id="newsletter-link-url"
          value={linkUrl}
          onChange={(event) => setLinkUrl(event.target.value)}
          placeholder="https://example.com"
          autoFocus
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:min-w-64"
        />
        <button type="submit" className="h-10 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground">Apply</button>
        <button type="button" onClick={() => setLinkEditorOpen(false)} className="h-10 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground">Cancel</button>
      </form>
    )}
    <EditorContent editor={editor} className="newsletter-editor min-h-64 p-4 text-sm leading-6" />
  </div>
}

function NewsletterPreview({ html }: { html: string }) {
  if (!html) return <p className="text-sm text-muted-foreground">Write a message for your readers.</p>
  if (looksLikeFlattenedEmailHtml(html)) {
    return <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
      <p className="font-bold">This email was flattened by the visual editor.</p>
      <p className="mt-1">Switch to HTML source mode and replace the contents with the original complete HTML document. The preview cannot reconstruct missing tags and attributes automatically.</p>
    </div>
  }
  if (isFullEmailHtml(html)) {
    return <iframe title="Email preview" srcDoc={html} sandbox="" className="h-[48rem] w-full rounded-xl border border-border bg-white" />
  }
  return <div className="text-sm leading-6 text-foreground" dangerouslySetInnerHTML={{ __html: html }} />
}

function htmlToPlainText(html: string): string {
  const node = document.createElement("div")
  node.innerHTML = normalizeRichHtml(html)
  node.querySelectorAll("img").forEach((image) => image.remove())
  node.querySelectorAll("br").forEach((breakNode) => breakNode.replaceWith("\n"))
  node.querySelectorAll("a").forEach((anchor) => {
    const label = anchor.textContent?.trim() ?? ""
    const href = anchor.getAttribute("href")?.trim() ?? ""
    if (href && href !== label) anchor.textContent = label ? `${label} (${href})` : href
  })
  node.querySelectorAll("li").forEach((item) => {
    const marker = item.parentElement?.tagName === "OL" ? "1. " : "• "
    item.insertAdjacentText("afterbegin", marker)
    item.insertAdjacentText("beforeend", "\n")
  })
  node.querySelectorAll("p,h1,h2,h3,blockquote,hr").forEach((block) => {
    if (block.tagName === "HR") block.replaceWith("\n—\n")
    else {
      block.insertAdjacentText("afterbegin", "\n")
      block.insertAdjacentText("beforeend", "\n")
    }
  })
  return (node.textContent || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

type NewsletterAudience = "all_subscribers" | "verified_purchasers" | "new_subscribers"
const audienceLabels: Record<NewsletterAudience, string> = {
  all_subscribers: "All active subscribers",
  verified_purchasers: "Verified purchasers",
  new_subscribers: "New subscribers (last 30 days)",
}

export function NewsletterPanel() {
  type NewsletterOverview = {
    subscribers: Array<{ id: string; email: string; name: string | null; source: "signup_form" | "purchase" | "both"; subscribed: boolean; createdAt: string }>
    summary: { totalSubscribers: number; activeSubscribers: number; totalMessagesSent: number; audienceCounts: Record<NewsletterAudience, number>; engagement: Record<"sent" | "delivered" | "bounced" | "complained", number>; rates: Record<"delivered", number> }
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
  const [composerOpen, setComposerOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [bodyHtml, setBodyHtml] = useState("")
  const [htmlSourceMode, setHtmlSourceMode] = useState(false)
  const [bodyText, setBodyText] = useState("")
  const [bodyTextEdited, setBodyTextEdited] = useState(false)
  const [scheduledAt, setScheduledAt] = useState("")
  const [audience, setAudience] = useState<NewsletterAudience>("all_subscribers")
  const [confirmSend, setConfirmSend] = useState(false)

  function edit(message: NewsletterMessage | null) {
    setComposerOpen(true)
    setSelected(message)
    setSubject(message?.subject ?? "")
    const nextBodyHtml = normalizeRichHtml(message?.bodyHtml ?? "")
    setBodyHtml(nextBodyHtml)
    setHtmlSourceMode(isEmailTemplateHtml(nextBodyHtml))
    setBodyText(message?.bodyText ?? "")
    setBodyTextEdited(false)
    setScheduledAt(message?.scheduledAt ? message.scheduledAt.slice(0, 16) : "")
    setAudience(message?.audience ?? "all_subscribers")
  }

  function applyTemplate(template: NewsletterTemplate) {
    setComposerOpen(true)
    setSelected(null)
    setSubject(template.subject)
    setBodyHtml(previewMarkdown(template.bodyMarkdown))
    setHtmlSourceMode(false)
    setBodyText("")
    setBodyTextEdited(false)
    setScheduledAt("")
    setAudience("all_subscribers")
  }

  function saveCurrentTemplate() {
    const name = window.prompt("Template name", subject.trim())?.trim()
    if (!name) return
    if (!subject.trim() || !bodyHtml.replace(/<[^>]+>/g, "").trim()) {
      toast({ title: "Cannot save template", description: "Add a subject and body before saving a template.", variant: "destructive" })
      return
    }
    saveTemplate.mutate({ name, subject: subject.trim(), bodyMarkdown: bodyText.trim() || htmlToPlainText(bodyHtml) }, {
      onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["/api/admin/newsletter/templates"] }); toast({ title: "Template saved" }) },
      onError: (error) => toast({ title: "Template could not be saved", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" }),
    })
  }

  function toggleHtmlSourceMode() {
    if (htmlSourceMode && isEmailTemplateHtml(bodyHtml)) {
      toast({ title: "Full HTML template stays in source mode", description: "This document uses email tables and inline styles that the visual editor cannot preserve." })
      return
    }
    setHtmlSourceMode((current) => !current)
  }

  function handleFullHtmlPaste(html: string) {
    setBodyHtml(normalizeEmailSource(html))
    setHtmlSourceMode(true)
    toast({ title: "Full HTML detected", description: "Kept the email document intact and switched the editor to HTML source mode." })
  }

  function save(schedule = false) {
    if (!subject.trim() || !bodyHtml.replace(/<[^>]+>/g, "").trim()) {
      toast({ title: "Cannot save newsletter", description: "Add a subject and body before saving.", variant: "destructive" })
      return
    }
    if (schedule && !scheduledAt) {
      toast({ title: "Choose a schedule time", description: "Select when this newsletter should be sent.", variant: "destructive" })
      return
    }
    const data = { subject: subject.trim(), bodyMarkdown: bodyText.trim() || htmlToPlainText(bodyHtml), bodyHtml, bodyText: bodyTextEdited ? bodyText.trim() : "", audience, scheduledAt: schedule && scheduledAt ? new Date(scheduledAt).toISOString() : null }
    const onSuccess = () => { void queryClient.invalidateQueries({ queryKey: getListNewsletterMessagesQueryKey() }); toast({ title: schedule ? "Newsletter scheduled" : "Draft saved" }) }
    const onError = (error: unknown) => toast({ title: schedule ? "Newsletter could not be scheduled" : "Draft could not be saved", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    if (selected) update.mutate({ messageId: selected.id, data }, { onSuccess, onError })
    else create.mutate({ data }, { onSuccess: (message) => { edit(message); onSuccess() }, onError })
  }

  async function sendNow() {
    setConfirmSend(false)
    try {
      const data = { subject: subject.trim(), bodyMarkdown: bodyText.trim() || htmlToPlainText(bodyHtml), bodyHtml, bodyText: bodyTextEdited ? bodyText.trim() : "", audience, scheduledAt: null }
      const message = selected
        ? await update.mutateAsync({ messageId: selected.id, data })
        : await create.mutateAsync({ data })
      await send.mutateAsync({ messageId: message.id })
      setComposerOpen(false)
      void queryClient.invalidateQueries({ queryKey: getListNewsletterMessagesQueryKey() })
      toast({ title: "Newsletter sent" })
    } catch (error) {
      toast({ title: "Newsletter could not be sent", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    }
  }

  const messageList = Array.isArray(messages.data) ? messages.data : []
  const overviewData = overview.data
  const normalizedBodyHtml = normalizeRichHtml(bodyHtml)
  const bodyHasContent = Boolean(normalizedBodyHtml.replace(/<[^>]+>/g, "").trim())
  const canSave = Boolean(subject.trim() && bodyHasContent)
  const audienceCount = overviewData?.summary.audienceCounts?.[audience] ?? 0
  return <section className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl font-extrabold">Newsletter</h2>
        <p className="mt-1 text-sm text-muted-foreground">Subscribers, delivery health and messages.</p>
      </div>
      <button type="button" onClick={() => edit(null)} className={primaryButton}><Plus className="h-4 w-4" /> New message</button>
    </div>

    {overview.isLoading ? (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><KpiSkeleton count={4} /></div>
    ) : overviewData ? (
      <>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard label="Subscribers" value={overviewData.summary.totalSubscribers} />
          <KpiCard label="Active" value={overviewData.summary.activeSubscribers} />
          <KpiCard label="Messages sent" value={overviewData.summary.totalMessagesSent} />
          <KpiCard label="Delivery rate" value={`${overviewData.summary.rates.delivered}%`} />
        </div>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className={cardClass}>
            <h3 className="mb-4 text-xl font-extrabold">Subscribers</h3>
            <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-border/80 bg-background/40 p-3">
                <p className="text-muted-foreground">Active</p>
                <p className="mt-1 text-lg font-extrabold">{overviewData.byStatus.active}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background/40 p-3">
                <p className="text-muted-foreground">Unsubscribed</p>
                <p className="mt-1 text-lg font-extrabold">{overviewData.byStatus.unsubscribed}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background/40 p-3">
                <p className="text-muted-foreground">Signup form</p>
                <p className="mt-1 text-lg font-extrabold">{overviewData.bySource.signup_form}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background/40 p-3">
                <p className="text-muted-foreground">Purchase</p>
                <p className="mt-1 text-lg font-extrabold">{overviewData.bySource.purchase}</p>
              </div>
            </div>
            {overviewData.subscribers.length === 0 ? (
              <EmptyState title="No subscribers yet" body="People who sign up or buy a book will appear here." />
            ) : (
              <>
                <ul className="divide-y divide-border sm:hidden">
                  {overviewData.subscribers.map((subscriber) => (
                    <li key={subscriber.id} className="min-w-0 py-3">
                      <p className="truncate text-sm font-semibold">{subscriber.email}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className={neutralChip}>{subscriber.source === "both" ? "Both" : subscriber.source === "purchase" ? "Purchase" : "Signup"}</span>
                        <span className={`rounded-full px-2 py-0.5 font-bold ${subscriber.subscribed ? "bg-emerald-500/15 text-emerald-300" : "bg-secondary text-muted-foreground"}`}>{subscriber.subscribed ? "Active" : "Unsubscribed"}</span>
                        <span>{shortDate(subscriber.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden max-w-full overflow-x-auto sm:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs text-muted-foreground">
                      <tr><th className="pb-2 pr-3 font-bold">Email</th><th className="pb-2 pr-3 font-bold">Source</th><th className="pb-2 pr-3 font-bold">Status</th><th className="pb-2 font-bold">Joined</th></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {overviewData.subscribers.map((subscriber) => (
                        <tr key={subscriber.id}>
                          <td className="max-w-56 truncate py-2 pr-3 font-medium">{subscriber.email}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{subscriber.source === "both" ? "Both" : subscriber.source === "purchase" ? "Purchase" : "Signup"}</td>
                          <td className="py-2 pr-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${subscriber.subscribed ? "bg-emerald-500/15 text-emerald-300" : "bg-secondary text-muted-foreground"}`}>{subscriber.subscribed ? "Active" : "Unsubscribed"}</span></td>
                          <td className="py-2 text-muted-foreground">{shortDate(subscriber.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="min-w-0 space-y-5">
            <div className={cardClass}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-xl font-extrabold">Campaign history</h3>
                <span className={neutralChip}>{messageList.length} total</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/30 divide-y divide-border">
                {messages.isLoading ? (
                  <RowSkeletons count={3} />
                ) : messageList.length ? (
                  messageList.map((message) => (
                    <button type="button" key={message.id} onClick={() => edit(message)} className="flex w-full min-w-0 items-start gap-3 p-4 text-left transition-colors hover:bg-secondary/60">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Mail className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0 truncate text-sm font-extrabold">{message.subject}</span>
                          <span className={`${neutralChip} shrink-0 capitalize`}>{message.status}</span>
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">{message.status === "scheduled" && message.scheduledAt ? `Scheduled ${shortDate(message.scheduledAt)}` : message.sentAt ? `Sent ${shortDate(message.sentAt)}` : "Draft"} · {audienceLabels[message.audience]}</span>
                        {message.status === "sent" && <span className="mt-1 block text-xs text-muted-foreground">{message.stats.sent} sent · {message.stats.delivered} delivered · {message.stats.bounced} failed</span>}
                      </span>
                    </button>
                  ))
                ) : (
                  <EmptyState title="No messages yet" body="Write your first newsletter with “New message”." />
                )}
              </div>
            </div>

            <div className={cardClass}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-xl font-extrabold">Templates</h3>
                <span className="text-xs text-muted-foreground">{templates.data?.length ?? 0} saved</span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/80 bg-background/30 divide-y divide-border">
                {templates.isLoading ? (
                  <RowSkeletons count={2} />
                ) : templates.data?.length ? (
                  templates.data.map((template) => (
                    <button key={template.id} type="button" onClick={() => applyTemplate(template)} className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-secondary/60">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold">{template.name}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{template.subject}</p>
                      </div>
                      <span className={neutralChip}>Use</span>
                    </button>
                  ))
                ) : (
                  <EmptyState title="No templates yet" body="Use “Save as template” in the composer." />
                )}
              </div>
            </div>
          </div>
        </div>

        {composerOpen && (
          <AdminModal title={selected ? "Edit message" : "New message"} onClose={() => setComposerOpen(false)}>
          <div className="p-4 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold">Subject</span>
                  <input value={subject} onChange={(event) => setSubject(event.target.value)} disabled={selected?.status === "sent"} className={fieldClass} />
                </label>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-sm font-bold">Audience</span>
                  <select value={audience} onChange={(event) => setAudience(event.target.value as NewsletterAudience)} disabled={selected?.status === "sent"} className={fieldClass}>
                    {(Object.keys(audienceLabels) as NewsletterAudience[]).map((value) => <option key={value} value={value}>{audienceLabels[value]}</option>)}
                  </select>
                  <span className="mt-1 block text-xs text-muted-foreground">{plural(audienceCount, "active recipient")} match this audience.</span>
                </label>
                <div className="mt-4">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold">Message content</span>
                    <button type="button" onClick={toggleHtmlSourceMode} disabled={selected?.status === "sent" || (htmlSourceMode && isEmailTemplateHtml(bodyHtml))} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50">
                      {htmlSourceMode ? "HTML source" : "Edit HTML"}
                    </button>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">{htmlSourceMode ? "Paste a complete email document; its tables and inline styles are kept." : "Use the visual editor for normal newsletter content."}</p>
                  {htmlSourceMode ? (
                    <>
                      {looksLikeFlattenedEmailHtml(bodyHtml) && <p className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">This draft was previously flattened by the visual editor. Select all, then paste the original complete HTML document to restore the designed email.</p>}
                      <textarea aria-label="Email HTML source" value={bodyHtml} onChange={(event) => setBodyHtml(event.target.value)} disabled={selected?.status === "sent"} className="min-h-[24rem] w-full rounded-xl border border-border bg-background/60 p-3 font-mono text-xs leading-5 text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="<!doctype html>..." spellCheck={false} />
                      <p className="mt-2 text-xs text-muted-foreground">The preview is sandboxed. Merge placeholders such as <code>{"{{bookTitle}}"}</code> remain literal unless another delivery flow replaces them.</p>
                    </>
                  ) : (
                    <RichNewsletterEditor html={normalizedBodyHtml} onChange={setBodyHtml} onFullHtmlPaste={handleFullHtmlPaste} disabled={selected?.status === "sent"} />
                  )}
                  <details className="mt-4 rounded-xl border border-border bg-background/35 p-3">
                    <summary className="flex min-h-10 cursor-pointer items-center text-sm font-bold text-muted-foreground">Plain-text version</summary>
                    <textarea value={bodyText} onChange={(event) => { setBodyTextEdited(true); setBodyText(event.target.value) }} disabled={selected?.status === "sent"} className={`${fieldClass} mt-3 min-h-28 py-3`} placeholder={htmlToPlainText(bodyHtml) || "Generated automatically from the rich content"} />
                    <p className="mt-2 text-xs text-muted-foreground">Leave this blank to generate text automatically from the rich message.</p>
                  </details>
                </div>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/35 p-4">
                <p className="text-sm font-bold">Preview</p>
                <div className="mt-3 rounded-2xl border border-border bg-card/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{subject.trim() || "Subject preview"}</p>
                  <div className="mt-3"><NewsletterPreview html={normalizedBodyHtml} /></div>
                </div>
                <p className="mt-4 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-semibold text-muted-foreground">Will be sent to {audienceCount} {audienceLabels[audience].toLowerCase()}.</p>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                  <button type="button" onClick={() => save()} disabled={!canSave || Boolean(selected?.status === "sent") || create.isPending || update.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"><Pencil className="h-3.5 w-3.5" /> Save as draft</button>
                  <button type="button" onClick={saveCurrentTemplate} disabled={!canSave || saveTemplate.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-xs font-extrabold text-foreground disabled:cursor-not-allowed disabled:opacity-50">Save as template</button>
                  {selected?.status !== "sent" && (
                    <>
                      <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="h-10 rounded-xl border border-border bg-background/70 px-3 text-xs text-foreground" />
                      <button type="button" onClick={() => save(true)} disabled={!canSave || !scheduledAt || create.isPending || update.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-xs font-extrabold text-foreground disabled:cursor-not-allowed disabled:opacity-50">Schedule</button>
                    </>
                  )}
                  {selected?.status !== "sent" && (
                    <button type="button" onClick={() => setConfirmSend(true)} disabled={!canSave || send.isPending || create.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-3.5 w-3.5" /> {send.isPending ? "Sending..." : "Send now"}</button>
                  )}
                </div>
              </div>
            </div>
          </div>
          </AdminModal>
        )}
      </>
    ) : (
      <div className={cardClass}><EmptyState title="Couldn’t load the newsletter" body="Refresh the page to try again." /></div>
    )}
    {confirmSend && (
      <ConfirmDialog
        title="Send newsletter now?"
        confirmLabel="Send now"
        busy={send.isPending}
        body={<>This will email <strong className="text-foreground">{audienceCount} {audienceLabels[audience].toLowerCase()}</strong> immediately. It can’t be undone.</>}
        onConfirm={() => void sendNow()}
        onCancel={() => setConfirmSend(false)}
      />
    )}
  </section>
}

