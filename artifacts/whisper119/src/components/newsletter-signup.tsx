import { useState, type FormEvent } from "react"
import { ArrowRight, Check } from "lucide-react"
import { useSubscribeNewsletter } from "@workspace/api-client-react"

/** Email + consent signup wired to the in-house newsletter list. */
export function NewsletterSignup() {
  const subscribe = useSubscribeNewsletter()
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address."); return }
    if (!consent) { setError("Tick the box to agree to receive emails."); return }
    try {
      await subscribe.mutateAsync({ data: { email: email.trim() } })
    } catch {
      setError("We couldn't save your email. Please try again.")
    }
  }

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#2a1438_0%,#5a2347_60%,#8f3c65_100%)] p-5 text-white shadow-lg shadow-primary/15 sm:p-8"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[url('/dark-romance-background.jpg')] bg-cover bg-center opacity-10 mix-blend-luminosity" />
      <div className="relative grid gap-4 md:grid-cols-[1fr_1.2fr] md:items-center md:gap-8">
        <div>
          <h2 id="newsletter-heading" className="text-lg font-extrabold leading-tight sm:text-2xl">New releases, first.</h2>
          <p className="mt-1 text-sm text-white/80">One email when a new book is out. No spam.</p>
        </div>
        {subscribe.isSuccess ? (
          <p className="flex items-center gap-2 text-sm font-bold" aria-live="polite"><Check className="h-5 w-5" aria-hidden="true" /> You’re on the list.</p>
        ) : (
          <form onSubmit={submit} noValidate className="grid min-w-0 gap-2.5">
            <div className="flex min-w-0 gap-2">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Email address</span>
                <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="box-border h-12 w-full min-w-0 rounded-xl border border-white/20 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/55 focus:border-white/60 focus:bg-white/15" />
              </label>
              <button type="submit" disabled={subscribe.isPending} aria-label="Get new releases" className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-[#5a2347] disabled:opacity-60">
                <span className="hidden sm:inline">{subscribe.isPending ? "Saving…" : "Get new releases"}</span>
                <ArrowRight className="h-4 w-4 sm:hidden" aria-hidden="true" />
              </button>
            </div>
            <label className="flex items-center gap-2.5 text-xs text-white/80">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="h-5 w-5 shrink-0 accent-white" />
              Email me new releases. Unsubscribe anytime.
            </label>
            {error && <p role="alert" className="text-sm font-semibold text-rose-100">{error}</p>}
          </form>
        )}
      </div>
    </section>
  )
}
