import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"
import type { Order } from "@workspace/api-client-react"

export const MAX_TAGS = 6

export const fieldClass = "box-border h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
export const cardClass = "min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6"
export const primaryButton = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
export const secondaryButton = "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
export const dangerButton = "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-destructive/60 px-4 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
export const iconButton = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
export const neutralChip = "inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground/80"

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "object" && error !== null && "error" in error) {
    const message = (error as { error?: unknown }).error
    if (typeof message === "string" && message.trim()) return message
  }
  return fallback
}

/** "7 Nov" (adds the year when it isn't the current one). */
export function shortDate(value: string | null | undefined): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) })
}

export function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

// ---- Order status: one label map, one chip shape, distinct colours ----

export type OrderStatus = Order["status"]
export const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-300" },
  paid: { label: "Paid — sending", className: "bg-sky-500/15 text-sky-300" },
  fulfilled: { label: "Fulfilled", className: "bg-emerald-500/15 text-emerald-300" },
  abandoned: { label: "Abandoned", className: "bg-secondary text-muted-foreground" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive" },
}

export function StatusChip({ status }: { status: string }) {
  const meta = ORDER_STATUS[status] ?? { label: status, className: "bg-secondary text-muted-foreground" }
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>
}

// ---- Dialogs ----

/** Full-screen sheet on mobile, centred panel on desktop; opaque so nothing bleeds through. */
export function AdminModal({ title, onClose, children, footer, wide = true }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose() }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    closeRef.current?.focus()
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown) }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className={`relative flex h-full w-full flex-col overflow-hidden bg-card shadow-2xl ring-1 ring-border sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-md"}`}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
          <h2 className="min-w-0 truncate text-lg font-extrabold">{title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className={iconButton}><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="shrink-0 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, body, confirmLabel = "Delete", busy = false, onConfirm, onCancel }: { title: string; body: ReactNode; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <AdminModal title={title} onClose={onCancel} wide={false} footer={
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondaryButton}>Cancel</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex h-11 items-center justify-center rounded-xl bg-destructive px-4 text-sm font-extrabold text-destructive-foreground disabled:opacity-60">{busy ? "Working…" : confirmLabel}</button>
      </div>
    }>
      <div className="p-4 text-sm leading-6 text-muted-foreground sm:p-6">{body}</div>
    </AdminModal>
  )
}

// ---- KPI cards & loading/empty states ----

export function KpiCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-3.5 sm:p-4">
      <p className="truncate text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1.5 truncate text-xl font-extrabold tracking-tight sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return <>{Array.from({ length: count }, (_, index) => <div key={index} className="h-[5.25rem] animate-pulse rounded-2xl bg-secondary motion-reduce:animate-none" aria-hidden="true" />)}</>
}

export function RowSkeletons({ count = 5 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-border">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3 p-4" aria-hidden="true">
          <div className="h-12 w-9 animate-pulse rounded-lg bg-secondary motion-reduce:animate-none" />
          <div className="flex-1 space-y-2"><div className="h-3.5 w-3/5 animate-pulse rounded bg-secondary motion-reduce:animate-none" /><div className="h-3 w-2/5 animate-pulse rounded bg-secondary motion-reduce:animate-none" /></div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="p-8 text-center">
      {icon && <div className="mx-auto flex h-10 w-10 items-center justify-center text-muted-foreground">{icon}</div>}
      <p className="mt-2 text-sm font-bold">{title}</p>
      {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Horizontally scrollable filter chips (single choice). */
export function FilterChips<T extends string>({ options, value, onChange, label }: { options: Array<{ value: T; label: string; count?: number }>; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors ${value === option.value ? "bg-foreground text-background" : "bg-secondary text-foreground/80 hover:text-foreground"}`}
        >
          {option.label}{option.count !== undefined && <span className="text-xs opacity-70">{option.count}</span>}
        </button>
      ))}
    </div>
  )
}
