import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Mail, X } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import { useSubscribeNewsletter } from "@workspace/api-client-react"

const DISMISS_KEY = "w119_newsletter_dismissed"

export function NewsletterModal() {
  const subscribe = useSubscribeNewsletter()
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState("")
  const prefersReducedMotion = useReducedMotion()

  function close() {
    setVisible(false)
    window.sessionStorage.setItem(DISMISS_KEY, "1")
  }

  useEffect(() => {
    if (window.sessionStorage.getItem(DISMISS_KEY)) return

    const timer = window.setTimeout(() => setVisible(true), 5000)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    subscribe.mutate({ data: { email } }, {
      onSuccess: () => setEmail(""),
    })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="newsletter-title"
          onClick={close}
        >
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-primary/40 bg-card shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" onClick={close} aria-label="Close newsletter signup" className="absolute right-5 top-5 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-border/70 px-6 py-5 sm:px-8">
              <span className="text-lg font-extrabold tracking-tight">Whisper 119</span>
            </div>

            <div className="grid items-center gap-7 p-6 sm:grid-cols-2 sm:gap-8 sm:p-8">
              <div className="hidden md:block">
                <img src={`${import.meta.env.BASE_URL}newsletter-illustration.svg`} alt="" className="mx-auto w-full max-w-[15rem]" />
              </div>

              <div>
                <h2 id="newsletter-title" className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">Stay close to the next story</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">Get new release news and occasional updates from Whisper 119, straight to your inbox.</p>

                {subscribe.isSuccess ? (
                  <p className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-semibold leading-6 text-emerald-400">You&apos;re in. I&apos;ll keep you posted on what&apos;s coming next.</p>
                ) : (
                  <form onSubmit={submit} className="mt-6 space-y-3">
                    <label className="flex h-12 items-center gap-2 rounded-xl border border-border bg-background/70 px-4 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
                      <Mail className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                      <span className="sr-only">Email address</span>
                      <input required autoComplete="email" minLength={3} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70" />
                    </label>
                    <button type="submit" disabled={subscribe.isPending} className="h-12 w-full rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/30 transition-colors hover:bg-primary/90 disabled:opacity-60">
                      {subscribe.isPending ? "Subscribing..." : "Subscribe"}
                    </button>
                    {subscribe.error && <p className="text-sm leading-5 text-destructive">Something went wrong. Please try again.</p>}
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}