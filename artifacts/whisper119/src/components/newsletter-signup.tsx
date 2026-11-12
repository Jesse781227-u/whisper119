import { useState, type FormEvent } from "react"
import { Check } from "lucide-react"
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
    if (!consent) { setError("Please tick the box to agree to receive emails."); return }
    try {
      await subscribe.mutateAsync({ data: { email: email.trim() } })
    } catch {
      setError("We couldn't save your email. Please try again.")
    }
  }

  if (subscribe.isSuccess) {
    return (
      <section className="rounded-2xl border border-primary/25 bg-card p-6 text-center sm:p-8" aria-live="polite">
        <Check className="mx-auto h-6 w-6 text-primary" aria-hidden="true" />
        <p className="mt-2 text-lg font-extrabold">You’re on the list.</p>
        <p className="mt-1 text-sm text-muted-foreground">New releases will land in your inbox.</p>
      </section>
    )
  }

  return (
    <section aria-labelledby="newsletter-heading" className="rounded-2xl border border-primary/25 bg-card p-6 sm:p-8">
      <div className="grid gap-5 md:grid-cols-[1fr_1.2fr] md:items-center">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-primary">Newsletter</p>
          <h2 id="newsletter-heading" className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Hear about new releases first</h2>
          <p className="mt-1 text-sm text-muted-foreground">One email when a new book or series is out. No spam.</p>
        </div>
        <form onSubmit={submit} noValidate className="grid min-w-0 gap-3">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Email address</span>
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="box-border h-12 w-full min-w-0 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
            <button type="submit" disabled={subscribe.isPending} className="h-12 shrink-0 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground disabled:opacity-60">
              {subscribe.isPending ? "Saving…" : "Get new releases"}
            </button>
          </div>
          <label className="flex items-start gap-2.5 text-xs leading-5 text-muted-foreground">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]" />
            I agree to receive emails from Whisper 119. I can unsubscribe at any time.
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-destructive">{error}</p>}
        </form>
      </div>
    </section>
  )
}
