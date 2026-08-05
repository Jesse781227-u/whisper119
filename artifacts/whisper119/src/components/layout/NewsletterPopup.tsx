import { X } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
import { useSubscribeNewsletter } from "@workspace/api-client-react"

export function NewsletterPopup() {
  const subscribe = useSubscribeNewsletter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const prefersReducedMotion = useReducedMotion()

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
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,4,15,0.78)] p-4 backdrop-blur-md"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-title"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 24, mass: 0.8 }}
        className="relative w-full max-w-[31rem] overflow-hidden rounded-[2rem] border border-primary/30 bg-[linear-gradient(145deg,hsl(var(--card))_0%,hsl(258_27%_15%)_100%)] p-1 shadow-[0_24px_90px_rgba(190,84,130,0.28)]"
      >
        <div className="relative overflow-hidden rounded-[1.8rem] px-6 pb-7 pt-8 sm:px-9 sm:pb-9 sm:pt-10">
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/20 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
          <div aria-hidden="true" className="absolute right-10 top-8 h-20 w-20 rounded-full border border-primary/20 bg-primary/10" />
          <div aria-hidden="true" className="absolute right-[4.25rem] top-10 h-12 w-12 rounded-full border border-rose-200/10 bg-rose-200/10" />

          <button type="button" onClick={() => setOpen(false)} aria-label="Close newsletter signup" className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>

          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
              <span className="text-xl font-black">@</span>
            </div>
            <p className="mt-7 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary">A little something from me</p>
            <h2 id="newsletter-title" className="mt-2 max-w-sm text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-4xl">Get a free chapter.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">Leave your email and I’ll send you a first taste of the story, plus the occasional note when a completed ebook lands on the shelf.</p>

            <form onSubmit={submit} className="mt-7 space-y-3">
              <label className="sr-only" htmlFor="newsletter-popup-email">Email address</label>
              <input id="newsletter-popup-email" required autoComplete="email" minLength={3} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" className="h-12 w-full rounded-xl border border-border/90 bg-background/75 px-4 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10" />
              <button type="submit" disabled={subscribe.isPending} className="h-12 w-full rounded-xl bg-primary px-5 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60">{subscribe.isPending ? "Joining…" : "Send me the chapter"}</button>
              {subscribe.isSuccess && <p className="text-xs font-semibold text-emerald-400">You’re on the list. Check your inbox for the chapter.</p>}
              {subscribe.error && <p className="text-xs leading-5 text-destructive">The reader list is unavailable right now. Please try again later.</p>}
            </form>
            <p className="mt-4 text-center text-[0.62rem] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">No noise. Just stories and occasional notes.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}