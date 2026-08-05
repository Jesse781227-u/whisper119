import { collection, onSnapshot, query, where } from "firebase/firestore"
import { sendEmailVerification } from "firebase/auth"
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, KeyRound, LogOut, Mail, RefreshCw, ShieldCheck, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
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

  if (loading) return <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" /> Loading your orders…</div>
  if (error) return <p className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">{error}</p>
  if (!orders.length) return <div className="mt-5 rounded-2xl border border-dashed border-border bg-background/40 p-7 text-center"><BookOpen className="mx-auto h-6 w-6 text-primary" /><p className="mt-3 font-bold">No orders yet.</p><p className="mt-1 text-sm text-muted-foreground">Your completed purchases will appear here.</p><Link href="/shop" className="mt-4 inline-block text-xs font-extrabold text-primary">Browse the shelf →</Link></div>

  return (
    <div className="mt-5 space-y-3">
      {orders.map((order) => (
        <article key={order.id} className="rounded-2xl border border-border bg-background/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{order.reference ?? `Order ${order.id.slice(0, 8)}`}</p>
              <p className="mt-1 text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> {statusLabel(order)}</span>
          </div>
          <div className="mt-4 divide-y divide-border/70">
            {(order.items ?? []).map((item, index) => <div key={`${order.id}-${index}`} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="font-semibold">{item.title ?? "Digital title"}</span><span className="shrink-0 text-xs uppercase tracking-[0.12em] text-muted-foreground">{item.format ?? "ebook"}</span></div>)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Your DRM-free files are delivered as email attachments after payment.</p>
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

  async function submit(event: React.FormEvent) {
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
      setError(cause instanceof Error ? cause.message : "We could not complete that request.")
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
      setError(cause instanceof Error ? cause.message : "Google sign-in was not completed.")
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
      setError(cause instanceof Error ? cause.message : "We could not send password reset instructions.")
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
      setError(cause instanceof Error ? cause.message : "We could not send a verification email.")
    } finally {
      setPending(false)
    }
  }

  if (loading) return <main className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Checking your account…</main>

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to shop</Link>
      {!configured ? (
        <section className="mx-auto mt-8 max-w-lg rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <UserRound className="h-6 w-6 text-primary" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">Reader account</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Sign in to your shelf.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Authentication is temporarily unavailable. Please try again after the account service reconnects.</p>
        </section>
      ) : user ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-4">
              {user.photoURL ? <img src={user.photoURL} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="h-6 w-6" /></span>}
              <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">My account</p><h1 className="mt-1 truncate text-xl font-extrabold">{user.displayName ?? "Reader"}</h1></div>
            </div>
            <div className="mt-7 space-y-3 text-sm">
              <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-primary" /><span className="truncate">{user.email ?? "Google account"}</span></p>
              <p className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-primary" />{user.emailVerified ? "Email verified" : "Email verification pending"}</p>
            </div>
            {!user.emailVerified && user.providerData.some((provider) => provider.providerId === "password") && <div className="mt-5 flex flex-wrap gap-4"><button type="button" disabled={pending} onClick={() => void resendVerification()} className="inline-flex items-center gap-2 text-xs font-extrabold text-primary disabled:opacity-60"><Mail className="h-4 w-4" /> Resend verification email</button><button type="button" disabled={pending} onClick={() => void refreshUser()} className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary disabled:opacity-60"><RefreshCw className="h-4 w-4" /> Refresh status</button></div>}
            {error && <p className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm leading-5 text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
            {notice && <p className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm leading-5 text-emerald-600">{notice}</p>}
            <button type="button" onClick={() => void signOutUser()} className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-xs font-extrabold hover:border-primary hover:text-primary"><LogOut className="h-4 w-4" /> Sign out</button>
          </section>
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Your library</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight">Purchase history</h2></div><BookOpen className="h-6 w-6 text-primary" /></div>
            <ReaderOrders userId={user.uid} />
          </section>
        </div>
      ) : (
        <section className="mx-auto mt-8 max-w-lg rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">{mode === "signin" ? "Reader account" : "Join the shelf"}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{mode === "signin" ? "Welcome back." : "Keep your reading close."}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode === "signin" ? "Sign in to view your purchase history and account details." : "Create your reader account with email/password or Google."}</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block"><span className="mb-2 block text-xs font-bold">Email address</span><input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
            <label className="block"><span className="mb-2 block text-xs font-bold">Password</span><input required autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
            {error && <p className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm leading-5 text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
            {notice && <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm leading-5 text-emerald-600">{notice}</p>}
            <button disabled={pending} type="submit" className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60">{pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
          </form>
          {mode === "signin" && <button type="button" disabled={pending} onClick={() => void passwordReset()} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"><KeyRound className="h-4 w-4" /> Forgot your password?</button>}
          <div className="my-5 flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
          <button type="button" disabled={pending} onClick={() => void google()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-extrabold hover:border-primary hover:text-primary disabled:opacity-60"><Mail className="h-4 w-4" /> Continue with Google</button>
          <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null) }} className="mt-5 w-full text-xs font-bold text-muted-foreground hover:text-primary">{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
        </section>
      )}
    </main>
  )
}