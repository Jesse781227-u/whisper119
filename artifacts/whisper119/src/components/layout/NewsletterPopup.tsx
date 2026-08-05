import { X } from "lucide-react"
import { useEffect, useState } from "react"
import { useSubscribeNewsletter } from "@workspace/api-client-react"

export function NewsletterPopup() {
  const subscribe = useSubscribeNewsletter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), 5000)
    const openNewsletter = () => setOpen(true)
    window.addEventListener("open-newsletter", openNewsletter)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("open-newsletter", openNewsletter)
    }
  }, [])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    subscribe.mutate({ data: { email } }, {
      onSuccess: () => setEmail(""),
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="newsletter-title" className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-primary/20 bg-card p-6 shadow-2xl sm:p-8">
        <button type="button" onClick={() => setOpen(false)} aria-label="Close newsletter signup" className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">A little something from me</p>
        <h2 id="newsletter-title" className="mt-2 pr-8 text-2xl font-extrabold tracking-tight">Get a free chapter.</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Join my reader list for a free chapter and occasional notes when a completed ebook lands on the shelf.</p>
        <form onSubmit={submit} className="mt-6 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="newsletter-popup-email">Email address</label>
            <input id="newsletter-popup-email" required autoComplete="email" minLength={3} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10" />
            <button type="submit" disabled={subscribe.isPending} className="h-11 rounded-xl bg-primary px-5 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60">{subscribe.isPending ? "Joining…" : "Send me the chapter"}</button>
          </div>
          {subscribe.isSuccess && <p className="text-xs font-semibold text-emerald-600">You’re on the list. Check your inbox for the chapter.</p>}
          {subscribe.error && <p className="text-xs leading-5 text-destructive">The reader list is unavailable right now. Please try again later.</p>}
        </form>
      </div>
    </div>
  )
}