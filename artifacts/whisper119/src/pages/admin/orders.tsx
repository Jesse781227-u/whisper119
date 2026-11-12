import { useMemo, useState, type ReactNode } from "react"
import { Link } from "wouter"
import { useQueryClient } from "@tanstack/react-query"
import { ChevronRight, Clock3, ExternalLink, Search } from "lucide-react"
import { getGetAdminDashboardQueryKey, useResendOrderEbook } from "@workspace/api-client-react"
import type { Order } from "@workspace/api-client-react"
import { useToast } from "@/hooks/use-toast"
import { formatPrice } from "@/lib/utils"
import { AdminModal, EmptyState, FilterChips, RowSkeletons, StatusChip, cardClass, errorMessage, fieldClass, primaryButton, secondaryButton, shortDate } from "./shared"

export type OrderFilter = "all" | "paid" | "fulfilled" | "pending" | "abandoned"

/** Only paid orders whose ebook email hasn't gone out can be resent. */
export function canResend(order: Order) {
  return order.status === "paid" && !order.deliveryEmailSent
}

export function OrderRow({ order, onOpen }: { order: Order; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full min-w-0 items-center gap-3 p-3 text-left transition-colors hover:bg-secondary/60 sm:p-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="truncate font-mono text-sm font-bold">{order.reference}</p>
            <p className="shrink-0 text-sm font-extrabold">{formatPrice(order.subtotal, order.currency)}</p>
          </div>
          <div className="mt-1 flex min-w-0 items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-muted-foreground">{order.email} · {shortDate(order.createdAt)}</p>
            <StatusChip status={order.status} />
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
  )
}

export function OrderDetailSheet({ order, onClose }: { order: Order; onClose: () => void }) {
  const resend = useResendOrderEbook()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  function doResend() {
    resend.mutate({ orderId: order.id }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] })
        void queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() })
        toast({ title: "Ebook sent", description: `Delivered to ${order.email}.` })
        onClose()
      },
      onError: (error) => toast({ variant: "destructive", title: "Not sent", description: errorMessage(error, "The ebook could not be resent.") }),
    })
  }

  const row = (label: string, value: ReactNode) => (
    <div className="flex min-w-0 items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all text-right font-semibold">{value}</dd>
    </div>
  )

  return (
    <AdminModal title={order.reference} onClose={onClose} wide={false} footer={
      <div className="flex flex-wrap justify-end gap-2">
        <Link href={`/order/${order.id}`} className={secondaryButton}><ExternalLink className="h-4 w-4" /> Order page</Link>
        {canResend(order) && <button type="button" onClick={doResend} disabled={resend.isPending} className={primaryButton}>{resend.isPending ? "Verifying…" : "Resend ebook"}</button>}
      </div>
    }>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <StatusChip status={order.status} />
          <p className="text-xl font-extrabold">{formatPrice(order.subtotal, order.currency)}</p>
        </div>
        <dl className="mt-4 divide-y divide-border">
          {row("Email", order.email)}
          {row("Placed", new Date(order.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }))}
          {row("Paid", order.paidAt ? new Date(order.paidAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—")}
          {row("Provider", order.paymentMethod === "flutterwave" ? "Flutterwave" : "Payoneer")}
          {row("Provider ref", order.paymentReference ?? "—")}
          {row("Ebook email", order.deliveryEmailSent ? "Sent" : order.status === "paid" ? "Not sent yet" : "—")}
        </dl>
        <h3 className="mt-5 text-sm font-bold">Books</h3>
        <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
          {order.items.map((item, index) => (
            <li key={`${item.bookId}-${index}`} className="flex min-w-0 items-start justify-between gap-3 p-3 text-sm">
              <span className="min-w-0"><span className="block font-semibold">{item.title}</span><span className="text-xs text-muted-foreground">{item.format}</span></span>
              <span className="shrink-0 font-bold">{formatPrice(item.price, order.currency)}</span>
            </li>
          ))}
        </ul>
        {canResend(order) && <p className="mt-4 text-xs text-muted-foreground">“Resend ebook” checks the payment with Flutterwave first and only sends if it’s confirmed.</p>}
      </div>
    </AdminModal>
  )
}

export function OrdersTab({ orders, isLoading, initialFilter = "all" }: { orders: Order[]; isLoading: boolean; initialFilter?: OrderFilter }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<OrderFilter>(initialFilter)
  const [showAbandoned, setShowAbandoned] = useState(false)
  const [open, setOpen] = useState<Order | null>(null)

  const counts = useMemo(() => {
    const byStatus = (status: string) => orders.filter((order) => order.status === status).length
    return { paid: byStatus("paid"), fulfilled: byStatus("fulfilled"), pending: byStatus("pending"), abandoned: byStatus("abandoned") }
  }, [orders])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((order) => {
      if (q && !`${order.reference} ${order.email}`.toLowerCase().includes(q)) return false
      if (filter === "all") return showAbandoned || order.status !== "abandoned"
      return order.status === filter
    })
  }, [filter, orders, query, showAbandoned])

  return (
    <section className="min-w-0 space-y-4" aria-labelledby="orders-heading">
      <div>
        <h2 id="orders-heading" className="text-2xl font-extrabold">Orders</h2>
        <p className="mt-1 text-sm text-muted-foreground">Flutterwave confirms payments automatically and the ebook is emailed straight away.</p>
      </div>
      <label className="relative block">
        <span className="sr-only">Search orders</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reference or email" className={`${fieldClass} pl-9`} />
      </label>
      <FilterChips<OrderFilter>
        label="Filter orders"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "paid", label: "Paid", count: counts.paid },
          { value: "fulfilled", label: "Fulfilled", count: counts.fulfilled },
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "abandoned", label: "Abandoned", count: counts.abandoned },
        ]}
      />
      {filter === "all" && counts.abandoned > 0 && (
        <label className="flex min-h-10 items-center gap-3 text-sm text-muted-foreground">
          <input type="checkbox" checked={showAbandoned} onChange={(event) => setShowAbandoned(event.target.checked)} className="h-5 w-5" />
          Show abandoned ({counts.abandoned})
        </label>
      )}
      <div className={`${cardClass} p-0 sm:p-0`}>
        {isLoading ? <RowSkeletons count={5} /> : visible.length ? (
          <ul className="divide-y divide-border">{visible.map((order) => <OrderRow key={order.id} order={order} onOpen={() => setOpen(order)} />)}</ul>
        ) : (
          <EmptyState icon={<Clock3 className="h-6 w-6" />} title={orders.length ? "No orders match" : "No orders yet"} body={orders.length ? "Try another search or filter." : "Orders appear here as soon as readers check out."} />
        )}
      </div>
      {open && <OrderDetailSheet order={orders.find((order) => order.id === open.id) ?? open} onClose={() => setOpen(null)} />}
    </section>
  )
}
