import { useState } from "react"
import { Link, useLocation } from "wouter"
import { AlertCircle, ArrowLeft, BookOpen, LogOut, Mail, UserRound } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

export default function Account() {
  const { user, loading, configured, signIn, signUp, signInWithGoogle, signOutUser } = useAuth()
  const [, setLocation] = useLocation()
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (mode === "signin") await signIn(email, password)
      else await signUp(email, password)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not complete that request.")
    } finally {
      setPending(false)
    }
  }

  async function google() {
    setError(null)
    setPending(true)
    try {
      await signInWithGoogle()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in was not completed.")
    } finally {
      setPending(false)
    }
  }

  if (loading) return <main className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Checking your account…</main>

  return (
    <main className="mx-auto max-w-lg px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to shop</Link>
      <section className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></span>
        {user ? (
          <>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">Signed in</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Welcome back.</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">You’re signed in as <span className="font-semibold text-foreground">{user.email ?? "your Google account"}</span>.</p>
            <button type="button" onClick={() => void signOutUser()} className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-xs font-extrabold hover:border-primary hover:text-primary"><LogOut className="h-4 w-4" /> Sign out</button>
          </>
        ) : !configured ? (
          <>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">Accounts coming soon</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">The reader account desk is being connected.</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Email/password and Google sign-in are ready in the app, but Firebase authentication is not configured for this environment yet.</p>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Checkout and email delivery remain available without an account.</div>
          </>
        ) : (
          <>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">{mode === "signin" ? "Reader account" : "Join the shelf"}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{mode === "signin" ? "Welcome back." : "Keep your reading close."}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode === "signin" ? "Sign in to keep your account ready for future purchases." : "Create an account with email/password or Google."}</p>
            <form onSubmit={submit} className="mt-7 space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-bold">Email address</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
              <label className="block"><span className="mb-2 block text-xs font-bold">Password</span><input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
              {error && <p className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm leading-5 text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
              <button disabled={pending} type="submit" className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60">{pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
            </form>
            <div className="my-5 flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
            <button type="button" disabled={pending} onClick={() => void google()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-extrabold hover:border-primary hover:text-primary disabled:opacity-60"><Mail className="h-4 w-4" /> Continue with Google</button>
            <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null) }} className="mt-5 w-full text-xs font-bold text-muted-foreground hover:text-primary">{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
          </>
        )}
      </section>
      <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><BookOpen className="h-3.5 w-3.5 text-primary" /> Your purchases are still delivered by email.</p>
      {user && <button type="button" onClick={() => setLocation("/shop")} className="mx-auto mt-3 block text-xs font-bold text-primary">Browse my books →</button>}
    </main>
  )
}