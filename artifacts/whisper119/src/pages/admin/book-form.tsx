import { useState, type FormEvent, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ChevronDown, ImagePlus } from "lucide-react"
import {
  getGetAdminDashboardQueryKey, getGetStorefrontSummaryQueryKey, getListAdminBooksQueryKey, getListAdminSeriesQueryKey, getListBooksQueryKey,
  requestUploadUrl as requestUploadUrlApi,
  useCreateBook, useCreateSeries, useListAdminSeries, useListCategories, useUpdateBook,
} from "@workspace/api-client-react"
import type { Book, BookInput, BookInputFormat, BookUpdate, Series } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { languages } from "@/hooks/use-site-language"
import { AdminModal, MAX_TAGS, errorMessage, fieldClass, neutralChip, primaryButton, secondaryButton } from "./shared"

type Phase = "idle" | "uploading" | "saving"
type FieldErrors = Partial<Record<"cover" | "title" | "author" | "price" | "primaryCategory" | "tags" | "description" | "ebook" | "seriesNumber" | "pageCount" | "sample", string>>

const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function detectFormat(file: File): BookInputFormat | null {
  const extension = file.name.split(".").pop()?.toLowerCase()
  if (extension === "pdf" || file.type === "application/pdf") return "PDF"
  if (extension === "epub" || file.type === "application/epub+zip") return "EPUB"
  return null
}

function Field({ label, required, error, hint, children, className = "" }: { label: string; required?: boolean; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-sm font-bold">{label}{required && <span className="text-destructive"> *</span>}</span>
      {children}
      {error ? <span role="alert" className="mt-1 block text-sm font-semibold text-destructive">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

const fileInputClass = "block w-full min-w-0 text-sm text-muted-foreground file:mr-3 file:h-10 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:text-sm file:font-bold file:text-foreground"

export function BookFormModal({ book, onClose }: { book?: Book; onClose: () => void }) {
  const createBook = useCreateBook()
  const updateBook = useUpdateBook()
  const createSeries = useCreateSeries()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: categoryData } = useListCategories()
  const { data: seriesData } = useListAdminSeries()
  const availableCategories = Array.isArray(categoryData) ? categoryData : []
  const seriesOptions: Series[] = Array.isArray(seriesData) ? seriesData : []

  // Essentials
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(book?.coverUrl ?? null)
  const [title, setTitle] = useState(book?.title ?? "")
  const [author, setAuthor] = useState(book?.author ?? "Whisper 119")
  const [price, setPrice] = useState(book ? String(book.price) : "")
  const [primaryCategory, setPrimaryCategory] = useState(book?.primaryCategory ?? "")
  const [tags, setTags] = useState<string[]>(book?.categories ? [...book.categories] : [])
  const [tagSearch, setTagSearch] = useState("")
  const [description, setDescription] = useState(book?.description ?? "")
  const [ebookFile, setEbookFile] = useState<File | null>(null)
  // Advanced
  const [language, setLanguage] = useState(book?.language ?? "en")
  const [titleGroupId, setTitleGroupId] = useState(book?.titleGroupId ?? "")
  const [slug, setSlug] = useState(book?.slug ?? "")
  const [slugEdited, setSlugEdited] = useState(Boolean(book))
  const [seriesId, setSeriesId] = useState(book?.seriesId ?? "")
  const [seriesNumber, setSeriesNumber] = useState(book?.seriesNumber ? String(book.seriesNumber) : "")
  const [newSeriesName, setNewSeriesName] = useState("")
  const [pageCount, setPageCount] = useState(book?.pageCount ? String(book.pageCount) : "")
  const [publishedAt, setPublishedAt] = useState(book?.publishedAt ? book.publishedAt.slice(0, 16) : new Date().toISOString().slice(0, 16))
  const [sampleText, setSampleText] = useState("")
  const [sampleFile, setSampleFile] = useState<File | null>(null)
  const [removeSample, setRemoveSample] = useState(false)
  const [featured, setFeatured] = useState(book?.featured ?? false)
  const [isCompleted, setIsCompleted] = useState(book?.isCompleted ?? false)

  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [progress, setProgress] = useState<number | null>(null)
  const busy = phase !== "idle"
  const tooManyTags = tags.length > MAX_TAGS
  const tagsFull = tags.length >= MAX_TAGS

  function onTitleChange(value: string) {
    setTitle(value)
    if (!slugEdited) setSlug(slugify(value))
  }

  function uploadFile(file: File, onProgress: (loaded: number, total: number) => void) {
    return requestUploadUrlApi({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream", language: language.trim().toLowerCase() }, {})
      .then((upload) => new Promise<string>((resolve, reject) => {
        if (!upload?.uploadURL || !upload.objectPath) { reject(new Error("The server returned an empty upload response.")); return }
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", upload.uploadURL)
        xhr.timeout = UPLOAD_TIMEOUT_MS
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
        xhr.upload.addEventListener("progress", (event) => { if (event.lengthComputable) onProgress(event.loaded, event.total) })
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) { onProgress(file.size, file.size); resolve(upload.objectPath) }
          else reject(new Error(`Could not upload ${file.name} (storage returned ${xhr.status}).`))
        })
        xhr.addEventListener("error", () => reject(new Error(`Could not upload ${file.name}: the storage endpoint was unreachable.`)))
        xhr.addEventListener("timeout", () => reject(new Error(`Uploading ${file.name} timed out.`)))
        xhr.send(file)
      }))
  }

  /** Uploads files in parallel and reports combined progress. Returns object paths in the same order. */
  async function uploadAll(files: File[]): Promise<string[]> {
    if (!files.length) return []
    setPhase("uploading")
    const total = files.reduce((sum, file) => sum + file.size, 0) || 1
    const loaded = files.map(() => 0)
    setProgress(0)
    return Promise.all(files.map((file, index) => uploadFile(file, (bytes) => {
      loaded[index] = bytes
      setProgress(Math.min(100, Math.round((loaded.reduce((sum, value) => sum + value, 0) / total) * 100)))
    })))
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (!book && !coverFile) next.cover = "Add a cover image."
    if (coverFile && !coverFile.type.startsWith("image/")) next.cover = "The cover must be a PNG, JPEG or WebP image."
    if (!title.trim()) next.title = "Enter the title."
    if (!author.trim()) next.author = "Enter the author."
    if (!price.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) next.price = "Enter a price in USD, e.g. 5.99."
    if (!primaryCategory) next.primaryCategory = "Choose a primary category."
    if (!tags.length) next.tags = "Pick at least one tag."
    if (tooManyTags) next.tags = `Remove ${tags.length - MAX_TAGS} tag${tags.length - MAX_TAGS === 1 ? "" : "s"} — the limit is ${MAX_TAGS}.`
    if (!description.trim()) next.description = "Write a short description."
    if (!book && !ebookFile) next.ebook = "Choose the PDF or EPUB file buyers receive."
    if (ebookFile && !detectFormat(ebookFile)) next.ebook = "The ebook must be a .pdf or .epub file."
    if (seriesId && !(Number(seriesNumber) >= 1)) next.seriesNumber = "Enter the book’s number in the series."
    if (pageCount && !(Number(pageCount) >= 1)) next.pageCount = "Enter a page count, or leave it empty."
    if (sampleFile && sampleFile.type !== "application/pdf") next.sample = "The sample must be a PDF."
    return next
  }

  async function addSeries() {
    const name = newSeriesName.trim()
    if (!name) return
    try {
      const created = await createSeries.mutateAsync({ data: { name } })
      await queryClient.invalidateQueries({ queryKey: getListAdminSeriesQueryKey() })
      setSeriesId(created.id)
      setNewSeriesName("")
    } catch (error) {
      setFormError(errorMessage(error, "Could not create the series."))
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) {
      setFormError("Fix the highlighted fields to save.")
      return
    }

    const format: BookInputFormat = ebookFile ? detectFormat(ebookFile)! : (book?.format ?? "PDF")
    const formats = Array.from(new Set([format, ...(book?.formats ?? []).filter((value) => value !== format)])) as BookInputFormat[]
    const common = {
      title: title.trim(),
      titleGroupId: titleGroupId.trim() || slugify(title),
      language: language.trim().toLowerCase(),
      slug: slug.trim() || slugify(title),
      author: author.trim(),
      price: Number(price),
      categories: tags,
      description: description.trim(),
      format,
      formats,
      primaryCategory,
      seriesId: seriesId || null,
      seriesNumber: seriesId ? Number(seriesNumber) : null,
      pageCount: pageCount ? Number(pageCount) : null,
      featured,
      isCompleted,
      publishedAt: new Date(publishedAt).toISOString(),
    }

    try {
      const files = [ebookFile, coverFile, sampleFile].filter((file): file is File => Boolean(file))
      const paths = await uploadAll(files)
      const pathFor = (file: File | null) => (file ? paths[files.indexOf(file)] : undefined)
      setPhase("saving")

      if (book) {
        const data: BookUpdate = { ...common }
        if (ebookFile) { data.fileObjectPath = pathFor(ebookFile); data.fileName = ebookFile.name }
        if (coverFile) data.coverObjectPath = pathFor(coverFile)
        if (sampleText.trim()) data.sampleText = sampleText.trim()
        if (sampleFile) data.sampleObjectPath = pathFor(sampleFile)
        if (removeSample) { data.sampleText = null; data.sampleObjectPath = null }
        await updateBook.mutateAsync({ bookId: book.id, data })
      } else {
        const payload: BookInput = {
          ...common,
          priceNgn: 0,
          currency: "USD",
          paystackLink: null,
          payoneerLink: null,
          coverObjectPath: pathFor(coverFile) ?? null,
          fileObjectPath: pathFor(ebookFile)!,
          fileName: ebookFile!.name,
          sampleText: sampleText.trim() || null,
          sampleObjectPath: pathFor(sampleFile) ?? null,
        }
        await createBook.mutateAsync({ data: payload })
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAdminBooksQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetStorefrontSummaryQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListAdminSeriesQueryKey() }),
      ])
      toast({ title: book ? "Book updated" : "Book added", description: `"${title.trim()}" is in the catalogue.` })
      onClose()
    } catch (error) {
      setFormError(errorMessage(error, "Could not save this book. Please try again."))
    } finally {
      setPhase("idle")
      setProgress(null)
    }
  }

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 truncate text-sm text-muted-foreground" aria-live="polite">
        {phase === "uploading" ? `Uploading… ${progress ?? 0}%` : phase === "saving" ? "Saving…" : formError ? <span className="font-semibold text-destructive">{formError}</span> : null}
      </p>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onClose} disabled={busy} className={secondaryButton}>Cancel</button>
        <button type="submit" form="book-form" disabled={busy || tooManyTags} className={primaryButton}>{busy ? "Saving…" : "Save book"}</button>
      </div>
    </div>
  )

  const visibleTags = availableCategories.filter((category) => !tags.includes(category.name) && category.name.toLowerCase().includes(tagSearch.toLowerCase())).slice(0, 14)

  return (
    <AdminModal title={book ? "Edit book" : "Add a book"} onClose={() => { if (!busy) onClose() }} footer={footer}>
      {phase === "uploading" && (
        <div className="h-1 w-full bg-secondary" role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? 0}>
          <div className="h-full bg-primary transition-[width] duration-200" style={{ width: `${progress ?? 0}%` }} />
        </div>
      )}
      <form id="book-form" onSubmit={submit} noValidate className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-sm font-bold">Cover{!book && <span className="text-destructive"> *</span>}</span>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
              {coverPreview ? <img src={coverPreview} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
            </div>
            <input aria-label="Cover image" accept="image/png,image/jpeg,image/webp" type="file" onChange={(event) => { const file = event.target.files?.[0] ?? null; setCoverFile(file); if (file) setCoverPreview(URL.createObjectURL(file)) }} className={fileInputClass} />
          </div>
          {errors.cover && <span role="alert" className="mt-1 block text-sm font-semibold text-destructive">{errors.cover}</span>}
        </div>

        <Field label="Title" required error={errors.title} className="sm:col-span-2"><input value={title} onChange={(event) => onTitleChange(event.target.value)} className={fieldClass} /></Field>
        <Field label="Author" required error={errors.author}><input value={author} onChange={(event) => setAuthor(event.target.value)} className={fieldClass} /></Field>
        <Field label="Price (USD)" required error={errors.price} hint="Naira is shown automatically to readers in Nigeria."><input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="5.99" className={fieldClass} /></Field>
        <Field label="Primary category" required error={errors.primaryCategory} hint="Used for breadcrumbs and “Related books”." className="sm:col-span-2">
          <select value={primaryCategory} onChange={(event) => { const value = event.target.value; setPrimaryCategory(value); if (value && !tags.includes(value) && !tagsFull) setTags((current) => [value, ...current]) }} className={fieldClass}>
            <option value="">Choose one</option>
            {availableCategories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
          </select>
        </Field>

        <fieldset className="min-w-0 sm:col-span-2">
          <legend className="mb-1.5 flex w-full items-center justify-between text-sm font-bold">
            <span>Tags <span className="text-destructive">*</span></span>
            <span className={tooManyTags ? "text-destructive" : tagsFull ? "text-foreground" : "font-semibold text-muted-foreground"} aria-live="polite">{tags.length}/{MAX_TAGS} selected</span>
          </legend>
          {tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button key={tag} type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))} aria-label={`Remove tag ${tag}`} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-secondary px-3 text-xs font-semibold text-foreground">{tag} <span aria-hidden="true">×</span></button>
              ))}
            </div>
          )}
          {tagsFull ? (
            <p className="text-xs text-muted-foreground">{tooManyTags ? `This book has ${tags.length} tags. Remove ${tags.length - MAX_TAGS} to save.` : "Limit reached. Remove a tag to pick another."}</p>
          ) : (
            <>
              <input value={tagSearch} onChange={(event) => setTagSearch(event.target.value)} placeholder="Search tags" className={fieldClass} />
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleTags.map((category) => (
                  <button key={category.id} type="button" onClick={() => setTags((current) => (current.length >= MAX_TAGS ? current : [...current, category.name]))} className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-xs font-semibold text-foreground/80 hover:border-foreground/40">{category.name}</button>
                ))}
              </div>
            </>
          )}
          {errors.tags ? <span role="alert" className="mt-1 block text-sm font-semibold text-destructive">{errors.tags}</span> : <span className="mt-1 block text-xs text-muted-foreground">Pick the tags a reader would actually search for.</span>}
        </fieldset>

        <Field label="Description" required error={errors.description} className="sm:col-span-2"><textarea value={description} onChange={(event) => setDescription(event.target.value)} className={`${fieldClass} min-h-32 py-3`} /></Field>

        <Field label={book ? "Replace ebook file" : "Ebook file"} required={!book} error={errors.ebook} hint={ebookFile ? `Detected: ${detectFormat(ebookFile) ?? "unknown"}` : book ? `Current file: ${book.fileName} (${book.format})` : "PDF or EPUB — the format is detected automatically."} className="sm:col-span-2">
          <input accept=".pdf,.epub,application/pdf,application/epub+zip" type="file" onChange={(event) => setEbookFile(event.target.files?.[0] ?? null)} className={fileInputClass} />
        </Field>

        <details className="group rounded-xl border border-border sm:col-span-2">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-bold">
            Advanced
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-5 border-t border-border p-4 sm:grid-cols-2">
            <Field label="Language"><select value={language} onChange={(event) => setLanguage(event.target.value)} className={fieldClass}>{languages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></Field>
            <Field label="Title group" hint="Same ID for every language edition of this title."><input value={titleGroupId} onChange={(event) => setTitleGroupId(event.target.value)} placeholder={slugify(title)} className={fieldClass} /></Field>
            <Field label="Slug" hint="Made from the title; edit only if needed." className="sm:col-span-2"><input value={slug} onChange={(event) => { setSlug(event.target.value); setSlugEdited(true) }} className={fieldClass} /></Field>
            <Field label="Series"><select value={seriesId} onChange={(event) => setSeriesId(event.target.value)} className={fieldClass}><option value="">Not part of a series</option>{seriesOptions.map((series) => <option key={series.id} value={series.id}>{series.name}</option>)}</select></Field>
            <Field label="Book number" error={errors.seriesNumber}><input inputMode="numeric" disabled={!seriesId} value={seriesNumber} onChange={(event) => setSeriesNumber(event.target.value)} className={`${fieldClass} disabled:opacity-50`} /></Field>
            <div className="flex min-w-0 gap-2 sm:col-span-2">
              <input aria-label="New series name" value={newSeriesName} onChange={(event) => setNewSeriesName(event.target.value)} placeholder="Or create a new series" className={fieldClass} />
              <button type="button" onClick={() => void addSeries()} disabled={!newSeriesName.trim() || createSeries.isPending} className={secondaryButton}>Create</button>
            </div>
            <Field label="Pages" error={errors.pageCount}><input inputMode="numeric" value={pageCount} onChange={(event) => setPageCount(event.target.value)} placeholder="Optional" className={fieldClass} /></Field>
            <Field label="Publish date"><input type="datetime-local" value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} className={fieldClass} /></Field>
            <Field label="Free sample text" hint="Paste the first chapter; blank lines separate paragraphs. Never the paid file." className="sm:col-span-2"><textarea value={sampleText} onChange={(event) => setSampleText(event.target.value)} placeholder={book?.hasSample ? "This book has a sample. Paste new text to replace it." : ""} className={`${fieldClass} min-h-28 py-3`} /></Field>
            <Field label="Or a sample PDF" error={errors.sample} className="sm:col-span-2"><input accept=".pdf,application/pdf" type="file" onChange={(event) => setSampleFile(event.target.files?.[0] ?? null)} className={fileInputClass} /></Field>
            {book?.hasSample && <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" checked={removeSample} onChange={(event) => setRemoveSample(event.target.checked)} className="h-5 w-5" />Remove the existing sample</label>}
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} className="h-5 w-5" />Featured</label>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm"><input type="checkbox" checked={isCompleted} onChange={(event) => setIsCompleted(event.target.checked)} className="h-5 w-5" />Completed series</label>
          </div>
        </details>
      </form>
    </AdminModal>
  )
}
