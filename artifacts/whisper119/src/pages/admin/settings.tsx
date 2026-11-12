import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore"
import { Languages, MoreVertical, Pencil, Search, Star, Trash2, UserMinus } from "lucide-react"
import {
  getListAdminBooksQueryKey, getListAdminSeriesQueryKey, getListCategoriesQueryKey,
  useCreateCategory, useDeleteCategory, useDeleteSeries, useListAdminSeries, useListCategories, useUpdateCategory, useUpdateSeries,
} from "@workspace/api-client-react"
import type { Category, Series } from "@workspace/api-client-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"
import { firebaseDb } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { ConfirmDialog, EmptyState, RowSkeletons, cardClass, errorMessage, fieldClass, iconButton, neutralChip, plural, primaryButton, secondaryButton, shortDate } from "./shared"

export type LanguageRequest = { id: string; bookTitle: string; name: string; country: string; language: string; email?: string | null; createdAt: string }

function AdminTeam() {
  const { user } = useAuth()
  const me = user?.email?.toLowerCase() ?? ""
  const [emails, setEmails] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [toRemove, setToRemove] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseDb) { setLoading(false); setError("Firestore is not configured for admin management."); return }
    const unsubscribe = onSnapshot(collection(firebaseDb, "admins"), (snapshot) => {
      setEmails(snapshot.docs.map((entry) => entry.id).sort())
      setLoading(false)
    }, () => { setLoading(false); setError("Could not load the admin list.") })
    return () => unsubscribe()
  }, [])

  async function add() {
    const email = newEmail.trim().toLowerCase()
    if (!firebaseDb) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email address."); return }
    setSaving(true); setError(null)
    try { await setDoc(doc(firebaseDb, "admins", email), { email }); setNewEmail("") }
    catch { setError("Could not add that admin.") }
    finally { setSaving(false) }
  }

  async function remove() {
    if (!firebaseDb || !toRemove) return
    if (toRemove === me) { setToRemove(null); return }
    try { await deleteDoc(doc(firebaseDb, "admins", toRemove)) }
    catch { setError("Could not remove that admin.") }
    finally { setToRemove(null) }
  }

  return (
    <section className={cardClass} aria-labelledby="team-heading">
      <h3 id="team-heading" className="text-xl font-extrabold">Admin team</h3>
      <p className="mt-1 text-sm text-muted-foreground">People who can sign in to this dashboard.</p>
      <div className="mt-4 flex min-w-0 gap-2">
        <label className="min-w-0 flex-1"><span className="sr-only">Admin email</span><input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="name@example.com" className={fieldClass} /></label>
        <button type="button" onClick={() => void add()} disabled={saving} className={primaryButton}>{saving ? "Adding…" : "Add"}</button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
      {loading ? <RowSkeletons count={2} /> : emails.length ? (
        <ul className="mt-3 divide-y divide-border">
          {emails.map((email) => (
            <li key={email} className="flex min-w-0 items-center justify-between gap-3 py-2.5">
              <span className="min-w-0 truncate text-sm font-semibold">{email}{email === me && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}</span>
              {email !== me && <button type="button" onClick={() => setToRemove(email)} aria-label={`Remove ${email}`} className={`${iconButton} border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive`}><UserMinus className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No admins listed" body="Add an email above." />}
      {toRemove && (
        <ConfirmDialog title="Remove admin access?" confirmLabel="Remove" body={<><strong className="text-foreground">{toRemove}</strong> will no longer be able to open the dashboard.</>} onConfirm={() => void remove()} onCancel={() => setToRemove(null)} />
      )}
    </section>
  )
}

function CategoryManager() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data, isLoading } = useListCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()
  const [name, setName] = useState("")
  const [query, setQuery] = useState("")
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const categories: Category[] = Array.isArray(data) ? data : []
  const refresh = () => void queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() })
  const visible = categories.filter((category) => category.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <section className={cardClass} aria-labelledby="categories-heading">
      <h3 id="categories-heading" className="text-xl font-extrabold">Categories</h3>
      <div className="mt-4 flex min-w-0 gap-2">
        <label className="min-w-0 flex-1"><span className="sr-only">New category name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="New category" className={fieldClass} /></label>
        <button type="button" disabled={!name.trim() || create.isPending} onClick={() => create.mutate({ data: { name: name.trim() } }, { onSuccess: () => { setName(""); refresh() }, onError: (error) => toast({ variant: "destructive", title: "Not added", description: errorMessage(error, "Try again.") }) })} className={primaryButton}>Add</button>
      </div>
      <label className="relative mt-3 block">
        <span className="sr-only">Search categories</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${categories.length} categories`} className={`${fieldClass} pl-9`} />
      </label>
      {isLoading ? <RowSkeletons count={4} /> : visible.length ? (
        <ul className="mt-2 divide-y divide-border">
          {visible.map((category) => (
            <li key={category.id} className="flex min-w-0 items-center gap-2 py-1.5">
              <input
                defaultValue={category.name}
                aria-label={`Rename ${category.name}`}
                onBlur={(event) => {
                  const next = event.target.value.trim()
                  if (next && next !== category.name) update.mutate({ categoryId: category.id, data: { name: next, featured: category.featured } }, { onSuccess: refresh })
                }}
                className="h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-semibold outline-none focus:border-border focus:bg-background"
              />
              <span className="shrink-0 text-xs text-muted-foreground">{plural(category.count, "book")}</span>
              <button
                type="button"
                aria-pressed={category.featured}
                aria-label={category.featured ? `Unfeature ${category.name}` : `Feature ${category.name}`}
                onClick={() => update.mutate({ categoryId: category.id, data: { name: category.name, featured: !category.featured } }, { onSuccess: refresh })}
                className={`${iconButton} ${category.featured ? "border-primary/50 text-primary" : ""}`}
              >
                <Star className={`h-4 w-4 ${category.featured ? "fill-primary/30" : ""}`} />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><button type="button" aria-label={`More actions for ${category.name}`} className={iconButton}><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setToDelete(category)} className="min-h-10 text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete category</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No matching categories" body="Try another search, or add a new one." />}
      {toDelete && (
        <ConfirmDialog
          title="Delete this category?"
          busy={remove.isPending}
          body={toDelete.count > 0 ? <>"<strong className="text-foreground">{toDelete.name}</strong>" is used by {plural(toDelete.count, "book")}. Reassign those books first — the server won’t delete a category that’s in use.</> : <>"<strong className="text-foreground">{toDelete.name}</strong>" will be removed.</>}
          onConfirm={() => remove.mutate({ categoryId: toDelete.id }, {
            onSuccess: () => { setToDelete(null); refresh() },
            onError: (error) => { setToDelete(null); toast({ variant: "destructive", title: "Not deleted", description: errorMessage(error, "Try again.") }) },
          })}
          onCancel={() => setToDelete(null)}
        />
      )}
    </section>
  )
}

function SeriesManager() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data, isLoading } = useListAdminSeries()
  const updateSeries = useUpdateSeries()
  const deleteSeries = useDeleteSeries()
  const [editing, setEditing] = useState<Series | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [toDelete, setToDelete] = useState<Series | null>(null)
  const series: Series[] = Array.isArray(data) ? data : []

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: getListAdminSeriesQueryKey() })
    await queryClient.invalidateQueries({ queryKey: getListAdminBooksQueryKey() })
  }

  async function save() {
    if (!editing || !name.trim()) return
    try {
      await updateSeries.mutateAsync({ seriesId: editing.id, data: { name: name.trim(), description: description.trim() } })
      await refresh(); setEditing(null)
    } catch (error) { toast({ variant: "destructive", title: "Series not saved", description: errorMessage(error, "Try again.") }) }
  }

  return (
    <section className={cardClass} aria-labelledby="series-heading">
      <h3 id="series-heading" className="text-xl font-extrabold">Series</h3>
      <p className="mt-1 text-sm text-muted-foreground">Assign a book to a series from its edit form (Advanced).</p>
      {isLoading ? <RowSkeletons count={3} /> : series.length ? (
        <ul className="mt-3 divide-y divide-border">
          {series.map((item) => (
            <li key={item.id} className="py-2.5">
              {editing?.id === item.id ? (
                <div className="grid gap-2">
                  <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Series name" className={fieldClass} />
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short description for the series page" className={`${fieldClass} min-h-20 py-2`} />
                  <div className="flex gap-2"><button type="button" onClick={() => void save()} className={primaryButton}>Save</button><button type="button" onClick={() => setEditing(null)} className={secondaryButton}>Cancel</button></div>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="text-xs text-muted-foreground">{plural(item.bookCount, "book")}</p></div>
                  <button type="button" onClick={() => { setEditing(item); setName(item.name); setDescription(item.description) }} aria-label={`Edit ${item.name}`} className={iconButton}><Pencil className="h-4 w-4" /></button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button type="button" aria-label={`More actions for ${item.name}`} className={iconButton}><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setToDelete(item)} className="min-h-10 text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete series</DropdownMenuItem></DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : <EmptyState title="No series yet" body="Create one from a book’s edit form." />}
      {toDelete && (
        <ConfirmDialog
          title="Delete this series?"
          busy={deleteSeries.isPending}
          body={<>"<strong className="text-foreground">{toDelete.name}</strong>" will be removed. Its {plural(toDelete.bookCount, "book")} stay in the catalogue, just no longer grouped.</>}
          onConfirm={() => deleteSeries.mutate({ seriesId: toDelete.id }, { onSuccess: () => { setToDelete(null); void refresh() }, onError: (error) => { setToDelete(null); toast({ variant: "destructive", title: "Not deleted", description: errorMessage(error, "Try again.") }) } })}
          onCancel={() => setToDelete(null)}
        />
      )}
    </section>
  )
}

export function LanguageRequests({ requests }: { requests: LanguageRequest[] }) {
  return (
    <section id="language-requests" className={cardClass} aria-labelledby="requests-heading">
      <h3 id="requests-heading" className="text-xl font-extrabold">Language requests</h3>
      {requests.length ? (
        <ul className="mt-3 divide-y divide-border">
          {requests.map((request) => (
            <li key={request.id} className="min-w-0 py-2.5 text-sm">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <p className="min-w-0 font-bold">{request.language} <span className="font-normal text-muted-foreground">for</span> {request.bookTitle}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{shortDate(request.createdAt)}</span>
              </div>
              <p className="mt-0.5 min-w-0 truncate text-xs text-muted-foreground">{request.name} · {request.country}{request.email && <> · <a href={`mailto:${request.email}`} className="underline hover:text-foreground">{request.email}</a></>}</p>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={<Languages className="h-6 w-6" />} title="No requests yet" body="Readers can ask for a translation from any book page." />}
    </section>
  )
}

export function SettingsTab({ languageRequests }: { languageRequests: LanguageRequest[] }) {
  return (
    <section className="min-w-0 space-y-4" aria-labelledby="settings-heading">
      <h2 id="settings-heading" className="text-2xl font-extrabold">Settings</h2>
      <AdminTeam />
      <CategoryManager />
      <SeriesManager />
      <LanguageRequests requests={languageRequests} />
      <p className="text-xs text-muted-foreground"><span className={neutralChip}>Tip</span> Changes to categories and series show on the storefront straight away.</p>
    </section>
  )
}
