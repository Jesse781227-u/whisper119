import { useCallback, useEffect, useState } from "react"
import { Link, useLocation, useSearch } from "wouter"
import { useQueryClient } from "@tanstack/react-query"
import { BookOpen, Home, LibraryBig, LogOut, Mail, ReceiptText, RefreshCw, Settings } from "lucide-react"
import { getListAdminBooksQueryKey, useListAdminBooks, useListAdminOrders } from "@workspace/api-client-react"
import type { Book, Order } from "@workspace/api-client-react"
import { useAuth } from "@/components/auth-provider"
import { BooksTab, type BookFilter } from "./admin/books"
import { HomeTab, type AdminTab, type GoTo } from "./admin/home"
import { NewsletterPanel } from "./admin/newsletter"
import { OrdersTab, type OrderFilter } from "./admin/orders"
import { SettingsTab, type LanguageRequest } from "./admin/settings"
import { iconButton } from "./admin/shared"

export function AdminLogin() {
  const [, setLocation] = useLocation()
  const { user, loading, isAdmin, signInWithGoogle } = useAuth()

  useEffect(() => {
    if (!loading && user && isAdmin) {
      setLocation("/admin")
    }
  }, [loading, user, isAdmin, setLocation])

  if (loading) {
    return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090f2d] px-4 py-10 text-white"><p>Loading admin access…</p></main>
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

const TABS: Array<{ id: AdminTab; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "books", label: "Books", icon: LibraryBig },
  { id: "orders", label: "Orders", icon: ReceiptText },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "settings", label: "Settings", icon: Settings },
]

const BOOK_FILTERS: BookFilter[] = ["all", "featured", "nocover", "series", "tags"]
const ORDER_FILTERS: OrderFilter[] = ["all", "paid", "fulfilled", "pending", "abandoned"]

function pick<T extends string>(allowed: readonly T[], value: string | null): T | undefined {
  return allowed.find((item) => item === value)
}

function isTab(value: string | null): value is AdminTab {
  return TABS.some((tab) => tab.id === value)
}

function AdminHeader({ onRefresh, refreshing, onLogout }: { onRefresh: () => void; refreshing: boolean; onLogout: () => void }) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
      <Link href="/admin" className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpen className="h-5 w-5" /></span>
        <span className="min-w-0"><span className="block truncate text-sm font-extrabold">Whisper 119</span><span className="block truncate text-xs text-muted-foreground">Admin</span></span>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/" className="hidden h-10 items-center rounded-xl px-3 text-sm font-bold text-muted-foreground hover:bg-secondary sm:inline-flex">View store</Link>
        <button type="button" data-testid="button-refresh-dashboard" onClick={onRefresh} aria-label="Refresh" className={iconButton}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin motion-reduce:animate-none" : ""}`} /></button>
        <button type="button" data-testid="button-admin-logout" onClick={onLogout} aria-label="Sign out" className={iconButton}><LogOut className="h-4 w-4" /></button>
      </div>
    </header>
  )
}

function TabBar({ active, onSelect }: { active: AdminTab; onSelect: (tab: AdminTab) => void }) {
  return (
    <nav aria-label="Admin sections" className="sticky top-0 z-30 mt-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto grid max-w-6xl grid-cols-5 px-1 sm:flex sm:gap-1 sm:px-6">
        {TABS.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              aria-current={selected ? "page" : undefined}
              className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-xs font-bold transition-colors sm:min-h-12 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${selected ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <tab.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate">{tab.label}</span>
              {selected && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function Admin() {
  const { loading: authLoading, isAdmin, signOutUser } = useAuth()
  const [, setLocation] = useLocation()
  const search = useSearch()
  const queryClient = useQueryClient()
  const enabled = Boolean(isAdmin)

  const params = new URLSearchParams(search)
  const tabParam = params.get("tab")
  const activeTab: AdminTab = isTab(tabParam) ? tabParam : "home"
  const filterParam = params.get("filter")
  const sectionParam = params.get("section")

  const books = useListAdminBooks({ query: { queryKey: getListAdminBooksQueryKey(), enabled } })
  const orders = useListAdminOrders(undefined, { query: { queryKey: ["/api/admin/orders"], enabled, refetchInterval: 10_000, refetchOnWindowFocus: true } })
  const [languageRequests, setLanguageRequests] = useState<LanguageRequest[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const loadLanguageRequests = useCallback(() => {
    return fetch("/api/admin/language-requests")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => setLanguageRequests(Array.isArray(data) ? (data as LanguageRequest[]) : []))
      .catch(() => setLanguageRequests([]))
  }, [])

  useEffect(() => {
    if (enabled) void loadLanguageRequests()
  }, [enabled, loadLanguageRequests])

  useEffect(() => {
    if (!authLoading && !isAdmin) setLocation("/admin/login")
  }, [isAdmin, authLoading, setLocation])

  // Scroll to a linked section (e.g. Home → "new language requests") once its tab has rendered.
  useEffect(() => {
    if (!sectionParam) return
    const frame = requestAnimationFrame(() => document.getElementById(sectionParam)?.scrollIntoView({ behavior: "smooth", block: "start" }))
    return () => cancelAnimationFrame(frame)
  }, [sectionParam, activeTab])

  const goTo: GoTo = useCallback((tab, extra) => {
    const next = new URLSearchParams({ tab, ...(extra ?? {}) })
    setLocation(`/admin?${next.toString()}`)
    window.scrollTo({ top: 0 })
  }, [setLocation])

  async function refreshAll() {
    setRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] }),
        queryClient.invalidateQueries({ queryKey: getListAdminBooksQueryKey() }),
        loadLanguageRequests(),
      ])
    } finally {
      setRefreshing(false)
    }
  }

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading admin…</main>
  }
  if (!isAdmin) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">You must be an admin to access this page.</main>
  }

  const bookList: Book[] = Array.isArray(books.data) ? books.data : []
  const orderList: Order[] = Array.isArray(orders.data) ? orders.data : []

  return (
    <main className="min-h-screen overflow-x-clip bg-background pb-24">
      <AdminHeader onRefresh={() => void refreshAll()} refreshing={refreshing} onLogout={async () => { await signOutUser(); setLocation("/admin/login") }} />
      <TabBar active={activeTab} onSelect={(tab) => goTo(tab)} />
      <div className="mx-auto min-w-0 max-w-6xl px-4 pt-5 sm:px-6 sm:pt-6">
        {activeTab === "home" && <HomeTab books={bookList} booksLoading={books.isLoading} orders={orderList} ordersLoading={orders.isLoading} languageRequests={languageRequests} goTo={goTo} />}
        {activeTab === "books" && <BooksTab key={`books-${filterParam ?? "all"}`} books={bookList} isLoading={books.isLoading} initialFilter={pick(BOOK_FILTERS, filterParam)} />}
        {activeTab === "orders" && <OrdersTab key={`orders-${filterParam ?? "all"}`} orders={orderList} isLoading={orders.isLoading} initialFilter={pick(ORDER_FILTERS, filterParam)} />}
        {activeTab === "newsletter" && <NewsletterPanel />}
        {activeTab === "settings" && <SettingsTab languageRequests={languageRequests} />}
      </div>
    </main>
  )
}
