import { collection, onSnapshot, query, where } from "firebase/firestore"
import { sendEmailVerification } from "firebase/auth"
import { AlertCircle, ArrowLeft, BookOpen, Check, CheckCircle2, ChevronRight, Eye, KeyRound, LogOut, Mail, RefreshCw, ShieldCheck, UserRound } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import { Link } from "wouter"
import { useAuth } from "@/components/auth-provider"
import { firebaseDb } from "@/lib/firebase"

type ReaderOrder = {
  id: string
  reference?: string
  status?: string
  paymentStatus?: string
  currency?: string
  subtotal?: number
  createdAt?: { toDate?: () => Date } | string | null
  items?: Array<{ title?: string; format?: string; price?: number }>
}

function dateValue(value: ReaderOrder["createdAt"]) {
  if (!value) return null
  if (typeof value === "string") return new Date(value)
  return value.toDate ? value.toDate() : null
}

function formatDate(value: ReaderOrder["createdAt"]) {
  const date = dateValue(value)
  return date && !Number.isNaN(date.valueOf())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)
    : "Date pending"
}

function statusLabel(order: ReaderOrder) {
  const status = order.paymentStatus ?? order.status ?? "pending"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function authErrorMessage(cause: unknown, fallback: string) {
  if (cause instanceof Error && cause.message) return cause.message
  return fallback
}

function ReaderOrders({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<ReaderOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseDb) {
      setLoading(false)
      setError("Order history is not connected.")
      return
    }

    const ordersQuery = query(collection(firebaseDb, "orders"), where("userId", "==", userId))
    return onSnapshot(ordersQuery, (snapshot) => {
      const nextOrders = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as ReaderOrder)
        .sort((left, right) => {
          const leftDate = dateValue(left.createdAt)?.valueOf() ?? 0
          const rightDate = dateValue(right.createdAt)?.valueOf() ?? 0
          return rightDate - leftDate
        })
      setOrders(nextOrders)
      setLoading(false)
      setError(null)
    }, () => {
      setLoading(false)
      setError("Your order history could not be loaded right now.")
    })
  }, [userId])

  if (loading) return (
    <div className="mt-6 space-y-3" aria-label="Loading purchase history" data-testid="loading-orders">
      {[0, 1].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl border border-border/70 bg-background/35" />)}
    </div>
  )
  if (error) return <p data-testid="status-orders-error" className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{error}</p>
  if (!orders.length) return (
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-background/35 p-8 text-center sm:p-10" data-testid="empty-purchase-history">
      <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full border border-primary/10" />
      <div className="absolute -bottom-16 -left-8 h-28 w-28 rounded-full border border-accent/10" />
      <BookOpen className="relative mx-auto h-7 w-7 text-primary" strokeWidth={1.5} />
      <p className="relative mt-4 font-display text-lg font-semibold">Your shelf is empty.</p>
      <p className="relative mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">There are no purchases connected to this account yet. When you find the right story, it will be recorded here.</p>
      <Link href="/shop" data-testid="link-browse-shelf" className="relative mt-5 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-primary transition-colors hover:text-accent">
        Find a book <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )

  return (
    <div className="mt-5 space-y-3">
      {orders.map((order) => (
        <article key={order.id} data-testid={`card-order-${order.id}`} className="rounded-2xl border border-border bg-background/40 p-4 transition-colors hover:border-primary/35 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p data-testid={`text-order-reference-${order.id}`} className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{order.reference ?? `Order ${order.id.slice(0, 8)}`}</p>
              <p data-testid={`text-order-date-${order.id}`} className="mt-1 text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
            </div>
            <span data-testid={`status-order-${order.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> {statusLabel(order)}</span>
          </div>
          <div className="mt-4 divide-y divide-border/70">
            {(order.items ?? []).map((item, index) => <div key={`${order.id}-${index}`} data-testid={`row-order-item-${order.id}-${index}`} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="font-semibold">{item.title ?? "Digital title"}</span><span className="shrink-0 text-xs uppercase tracking-[0.12em] text-muted-foreground">{item.format ?? "ebook"}</span></div>)}
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />Your  files are delivered as email attachments after payment.</p>
        </article>
      ))}
    </div>
  )
}

export default function Account() {
  const { user, loading, configured, signIn, signUp, signInWithGoogle, resetPassword, refreshUser, signOutUser } = useAuth()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setPending(true)
    try {
      if (mode === "signin") await signIn(email, password)
      else {
        await signUp(email, password)
        setNotice("Account created. Check your inbox to verify your email.")
      }
    } catch (cause) {
      setError(authErrorMessage(cause, "We could not complete that request."))
    } finally {
      setPending(false)
    }
  }

  async function google() {
    setError(null)
    setNotice(null)
    setPending(true)
    try {
      await signInWithGoogle()
    } catch (cause) {
      setError(authErrorMessage(cause, "Google sign-in was not completed."))
    } finally {
      setPending(false)
    }
  }

  async function passwordReset() {
    if (!email) {
      setError("Enter your email address first.")
      return
    }
    setError(null)
    setNotice(null)
    setPending(true)
    try {
      await resetPassword(email)
      setNotice("Password reset instructions are on their way.")
    } catch (cause) {
      setError(authErrorMessage(cause, "We could not send password reset instructions."))
    } finally {
      setPending(false)
    }
  }

  async function resendVerification() {
    setError(null)
    setNotice(null)
    setPending(true)
    try {
      if (!user) return
      await sendEmailVerification(user)
      setNotice("A new verification email is on its way.")
    } catch (cause) {
      setError(authErrorMessage(cause, "We could not send a verification email."))
    } finally {
      setPending(false)
    }
  }

  async function signOut() {
    setError(null)
    setNotice(null)
    try {
      await signOutUser()
    } catch (cause) {
      setError(authErrorMessage(cause, "We could not sign you out."))
    }
  }

  if (loading) return (
    <main className="mx-auto min-h-[65vh] max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-14" aria-label="Loading account">
      <div className="h-4 w-28 animate-pulse rounded-full bg-muted/70" />
      <div className="mt-10 grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="h-80 animate-pulse rounded-[2rem] border border-border/70 bg-card/65" />
        <div className="h-80 animate-pulse rounded-[2rem] border border-border/70 bg-card/65" />
      </div>
    </main>
  )

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <Link href="/" data-testid="link-back-shop" className="group inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to shop</Link>
      {user ? (
        <div className="mt-8 space-y-7 sm:mt-12">
          <header className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-card/80 p-6 shadow-2xl shadow-background/30 sm:p-9">
            <div className="absolute -right-24 -top-32 h-72 w-72 rounded-full border border-primary/15" />
            <div className="absolute -right-8 -top-16 h-44 w-44 rounded-full border border-accent/10" />
            <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-end">
              <div>
                <p className="rule-label text-primary">Whisper 119 · Reader room</p>
                <h1 data-testid="heading-reader-shelf" className="mt-3 max-w-xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl">Your private shelf<span className="text-primary">.</span></h1>
                <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">A quiet place for the stories you have chosen, and the account details that keep them close.</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.13em] text-muted-foreground">
                <span className="h-px w-8 bg-primary/60" /> Reader account
              </div>
            </div>
          </header>
          <div className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr]">
            <section className="rounded-[2rem] border border-border bg-card/80 p-6 shadow-xl shadow-background/20 sm:p-8" data-testid="card-reader-account">
              <div className="flex items-center gap-4">
                {user.photoURL ? <img data-testid="img-reader-avatar" src={user.photoURL} alt="" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-primary/30" /> : <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"><UserRound className="h-7 w-7" /></span>}
                <div className="min-w-0"><p className="rule-label text-primary">Signed in as</p><h2 data-testid="text-reader-name" className="mt-1 truncate font-display text-xl font-semibold">{user.displayName ?? "Reader"}</h2></div>
              </div>
              <div className="mt-8 space-y-4 border-t border-border/70 pt-6 text-sm">
                <p data-testid="text-reader-email" className="flex items-center gap-3"><Mail className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{user.email ?? "Google account"}</span></p>
                <p data-testid="status-reader-verification" className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" />{user.emailVerified ? "Email verified" : "Email verification pending"}</p>
              </div>
              {!user.emailVerified && user.providerData.some((provider) => provider.providerId === "password") && (
                <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/5 p-4">
                  <p className="text-sm font-semibold">One small step remains.</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Verify your email so account messages and delivery notes reach the right reader.</p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    <button type="button" data-testid="button-resend-verification" disabled={pending} onClick={() => void resendVerification()} className="inline-flex items-center gap-2 text-xs font-extrabold text-primary transition-colors hover:text-accent disabled:opacity-60"><Mail className="h-4 w-4" /> Resend email</button>
                    <button type="button" data-testid="button-refresh-verification" disabled={pending} onClick={() => void refreshUser()} className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary disabled:opacity-60"><RefreshCw className="h-4 w-4" /> Check again</button>
                  </div>
                </div>
              )}
              {error && <p data-testid="status-account-error" className="mt-5 flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm leading-5 text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
              {notice && <p data-testid="status-account-notice" className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm leading-5 text-emerald-600"><Check className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p>}
              <button type="button" data-testid="button-sign-out" onClick={() => void signOut()} className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-xs font-extrabold transition-colors hover:border-primary hover:text-primary"><LogOut className="h-4 w-4" /> Sign out</button>
            </section>
            <section className="rounded-[2rem] border border-border bg-card/80 p-6 shadow-xl shadow-background/20 sm:p-8" data-testid="card-purchase-history">
              <div className="flex items-start justify-between gap-4"><div><p className="rule-label text-primary">The stories you chose</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em]">Purchase history</h2></div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span></div>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">Only completed orders belonging to this account appear here. No links are fabricated: ebook files arrive as attachments after payment.</p>
              <ReaderOrders userId={user.uid} />
            </section>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid overflow-hidden rounded-[2rem] border border-primary/20 bg-card/80 shadow-2xl shadow-background/30 lg:mt-12 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative flex min-h-[26rem] flex-col justify-between overflow-hidden bg-primary/10 p-7 sm:p-10 lg:min-h-[38rem]">
            <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full border border-primary/20" />
            <div className="absolute -bottom-16 -left-8 h-48 w-48 rounded-full border border-accent/20" />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Eye className="h-5 w-5" /></div>
              <p className="mt-12 max-w-xs font-display text-4xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-5xl">Stories are better when they know where to find you<span className="text-primary">.</span></p>
              <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">Keep your Whisper 119 purchases connected to one quiet corner. No feeds, no noise — just your shelf.</p>
            </div>
            <div className="relative mt-12 border-t border-primary/20 pt-5">
              <p className="rule-label text-primary">Reader notes</p>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-3"><Check className="h-4 w-4 text-accent" /> One account for your order history</li>
                <li className="flex items-center gap-3"><Check className="h-4 w-4 text-accent" /> Delivery stays in your inbox</li>
                <li className="flex items-center gap-3"><Check className="h-4 w-4 text-accent" /> Sign in securely, wherever you read</li>
              </ul>
            </div>
          </section>
          <section className="p-7 sm:p-10 lg:p-12">
            <span className="rule-label text-primary">{mode === "signin" ? "Reader account" : "Join the shelf"}</span>
            <h1 data-testid="heading-auth" className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{mode === "signin" ? "Welcome back." : "Keep your reading close."}</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">{mode === "signin" ? "Sign in to see your purchase history and keep delivery details tied to you." : "Create a reader account with email and password, or continue with Google."}</p>
            <form onSubmit={submit} className="mt-8 space-y-5">
              <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em]">Email address</span><input data-testid="input-email" required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background/70 px-4 text-sm outline-none transition-[border,box-shadow] placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="you@example.com" /></label>
              <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em]">Password</span><input data-testid="input-password" required autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background/70 px-4 text-sm outline-none transition-[border,box-shadow] placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="At least 6 characters" /></label>
              {error && <p data-testid="status-auth-error" className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm leading-5 text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
              {notice && <p data-testid="status-auth-notice" className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm leading-5 text-emerald-600"><Check className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p>}
              <button data-testid="button-submit-auth" disabled={pending} type="submit" className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition-[transform,box-shadow,opacity] hover:-translate-y-0.5 hover:shadow-primary/30 disabled:translate-y-0 disabled:opacity-60">{pending ? "Please wait…" : mode === "signin" ? "Sign in to shelf" : "Create reader account"}</button>
            </form>
            {mode === "signin" && <button type="button" data-testid="button-password-reset" disabled={pending} onClick={() => void passwordReset()} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"><KeyRound className="h-4 w-4" /> Forgot your password?</button>}
            <div className="my-6 flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
            <button type="button" data-testid="button-google-sign-in" disabled={pending} onClick={() => void google()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-extrabold transition-colors hover:border-primary hover:text-primary disabled:opacity-60"><Mail className="h-4 w-4" /> Continue with Google</button>
            <button type="button" data-testid="button-toggle-auth-mode" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null) }} className="mt-6 flex w-full items-center justify-center gap-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary">{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"} <ChevronRight className="h-3.5 w-3.5" /></button>
            {!configured && (error || notice) && <p data-testid="status-firebase-connection" className="mt-5 text-center text-xs leading-5 text-muted-foreground">This preview has no Firebase credentials. Authentication actions will work once the storefront is connected to its Firebase project.</p>}
          </section>
        </div>
      )}
    </main>
  )
}