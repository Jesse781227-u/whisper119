import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronRight, ImageOff, Languages, MailWarning, Tags } from "lucide-react"
import { getGetAdminDashboardQueryKey, useGetAdminDashboard } from "@workspace/api-client-react"
import type { Book, GetAdminDashboardRange, Order } from "@workspace/api-client-react"
import { formatPrice } from "@/lib/utils"
import { OrderDetailSheet, OrderRow } from "./orders"
import type { LanguageRequest } from "./settings"
import { EmptyState, FilterChips, KpiCard, KpiSkeleton, MAX_TAGS, RowSkeletons, cardClass, plural } from "./shared"

export type AdminTab = "home" | "books" | "orders" | "newsletter" | "settings"
export type GoTo = (tab: AdminTab, extra?: Record<string, string>) => void

/** A paid order whose ebook email still hasn't gone out after this long is treated as failed. */
const DELIVERY_GRACE_MS = 10 * 60 * 1000
const NEW_REQUEST_MS = 14 * 24 * 60 * 60 * 1000

function greeting(now: Date) {
  const hour = now.getHours()
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
}

type AttentionItem = { key: string; icon: typeof AlertTriangle; title: string; detail: string; onClick: () => void }

export function HomeTab({ books, booksLoading, orders, ordersLoading, languageRequests, goTo }: {
  books: Book[]; booksLoading: boolean; orders: Order[]; ordersLoading: boolean; languageRequests: LanguageRequest[]; goTo: GoTo
}) {
  const [range, setRange] = useState<GetAdminDashboardRange>("30d")
  const [openOrder, setOpenOrder] = useState<Order | null>(null)
  const params = { range }
  const dashboard = useGetAdminDashboard(params, { query: { queryKey: getGetAdminDashboardQueryKey(params) } })
  const data = dashboard.data
  const now = new Date()

  const attention = useMemo<AttentionItem[]>(() => {
    const cutoff = Date.now() - DELIVERY_GRACE_MS
    const failedDelivery = orders.filter((order) => order.status === "paid" && !order.deliveryEmailSent && new Date(order.paidAt ?? order.createdAt).getTime() < cutoff)
    const noCover = books.filter((book) => !book.coverUrl)
    const overTagged = books.filter((book) => book.categories.length > MAX_TAGS)
    const newRequests = languageRequests.filter((request) => Date.now() - new Date(request.createdAt).getTime() < NEW_REQUEST_MS)
    const items: AttentionItem[] = []
    if (failedDelivery.length) items.push({ key: "delivery", icon: MailWarning, title: `${plural(failedDelivery.length, "paid order")} without the ebook email`, detail: "Open the order and use “Resend ebook”.", onClick: () => goTo("orders", { filter: "paid" }) })
    if (noCover.length) items.push({ key: "cover", icon: ImageOff, title: `${plural(noCover.length, "book")} with no cover`, detail: "Books without a cover look broken on the storefront.", onClick: () => goTo("books", { filter: "nocover" }) })
    if (overTagged.length) items.push({ key: "tags", icon: Tags, title: `${plural(overTagged.length, "book")} with more than ${MAX_TAGS} tags`, detail: "They can’t be saved until tags are trimmed.", onClick: () => goTo("books", { filter: "tags" }) })
    if (newRequests.length) items.push({ key: "lang", icon: Languages, title: `${plural(newRequests.length, "new language request")}`, detail: "Readers asking for a translation in the last two weeks.", onClick: () => goTo("settings", { section: "language-requests" }) })
    return items
  }, [books, goTo, languageRequests, orders])

  const latest = orders.filter((order) => order.status !== "abandoned").slice(0, 5)
  const attentionLoading = booksLoading || ordersLoading

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{greeting(now)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      <section className="min-w-0 space-y-3" aria-labelledby="kpi-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="kpi-heading" className="text-lg font-extrabold">Performance</h2>
          <FilterChips<GetAdminDashboardRange>
            label="Date range"
            value={range}
            onChange={setRange}
            options={[{ value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "all", label: "All time" }]}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {dashboard.isLoading ? <KpiSkeleton count={5} /> : (
            <>
              <KpiCard label="Page views" value={(data?.totalPageViews ?? 0).toLocaleString("en-US")} />
              <KpiCard label="Unique visitors" value={(data?.uniqueVisitors ?? 0).toLocaleString("en-US")} />
              <KpiCard label="Paid orders" value={(data?.paidOrders ?? 0).toLocaleString("en-US")} />
              <KpiCard label="Revenue (USD)" value={formatPrice(data?.revenueByCurrency.USD ?? 0, "USD")} />
              <KpiCard label="Revenue (NGN)" value={formatPrice(data?.revenueByCurrency.NGN ?? 0, "NGN")} />
            </>
          )}
        </div>
        {dashboard.isError && <p role="alert" className="text-sm font-semibold text-destructive">Couldn’t load the numbers. Pull to refresh or try again shortly.</p>}
      </section>

      <section className={`${cardClass} p-0 sm:p-0`} aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="px-4 pt-4 text-lg font-extrabold sm:px-6 sm:pt-5">Needs attention</h2>
        {attentionLoading ? <RowSkeletons count={2} /> : attention.length ? (
          <ul className="mt-2 divide-y divide-border">
            {attention.map((item) => (
              <li key={item.key}>
                <button type="button" onClick={item.onClick} className="flex min-h-14 w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60 sm:px-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300"><item.icon className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{item.title}</span>
                    <span className="block text-[13px] text-muted-foreground">{item.detail}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />} title="All clear" body="No failed deliveries, missing covers, tag problems or new requests." />
        )}
      </section>

      <section className={`${cardClass} p-0 sm:p-0`} aria-labelledby="latest-heading">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-5">
          <h2 id="latest-heading" className="text-lg font-extrabold">Latest orders</h2>
          <button type="button" onClick={() => goTo("orders")} className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground">View all</button>
        </div>
        {ordersLoading ? <RowSkeletons count={3} /> : latest.length ? (
          <ul className="mt-2 divide-y divide-border">{latest.map((order) => <OrderRow key={order.id} order={order} onOpen={() => setOpenOrder(order)} />)}</ul>
        ) : (
          <EmptyState title="No orders yet" body="Orders appear here as soon as readers check out." />
        )}
      </section>

      {openOrder && <OrderDetailSheet order={orders.find((order) => order.id === openOrder.id) ?? openOrder} onClose={() => setOpenOrder(null)} />}
    </div>
  )
}
