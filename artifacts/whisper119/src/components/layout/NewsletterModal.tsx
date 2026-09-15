import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { X } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import { useSubscribeNewsletter } from "@workspace/api-client-react"

const DISMISS_KEY = "whisper119_newsletter_closed"

export function NewsletterModal() {
  const subscribe = useSubscribeNewsletter()
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState("")
  const prefersReducedMotion = useReducedMotion()

  function close() {
    setVisible(false)
    window.localStorage.setItem(DISMISS_KEY, "true")
  }

  useEffect(() => {
    if (window.localStorage.getItem(DISMISS_KEY)) return

    const timer = window.setTimeout(() => setVisible(true), 12_000)
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
      onSuccess: () => {
        window.localStorage.setItem(DISMISS_KEY, "true")
        setEmail("")
      },
    })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,18,16,0.48)] p-6 backdrop-blur-[4px] max-[600px]:items-end max-[600px]:p-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="newsletter-title"
          onClick={close}
        >
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative w-full max-w-[560px] overflow-hidden rounded-none bg-[#fffdf8] shadow-[0_30px_80px_rgba(0,0,0,0.2)] max-[600px]:max-h-[92vh] max-[600px]:overflow-y-auto max-[600px]:rounded-t-[18px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-[#1b1b1b]" />
            <button type="button" onClick={close} aria-label="Close newsletter signup" className="absolute right-[18px] top-[17px] z-10 flex h-[34px] w-[34px] items-center justify-center bg-transparent text-[25px] leading-none text-[#6d665e] transition hover:rotate-90 hover:text-[#111] max-[600px]:right-3 max-[600px]:top-3">
              <X className="h-5 w-5" />
            </button>

            <div className="px-[65px] pb-[50px] pt-[58px] text-center max-[600px]:px-[25px] max-[600px]:pb-8 max-[600px]:pt-[46px]">
              <img src="/whisper-119-logo.png" alt="Whisper 119" className="mx-auto mb-[34px] block h-auto w-[175px] max-w-[65%] max-[600px]:mb-[27px] max-[600px]:w-[145px]" />
              <p className="mb-[13px] font-sans text-[9px] tracking-[3px] text-[#8c8175]">A NOTE FOR YOUR INBOX</p>
              <h2 id="newsletter-title" className="font-serif text-[39px] font-normal leading-[1.1] tracking-[-1px] text-[#171717] max-[600px]:text-[33px]">Stories worth<br /><em className="block font-normal text-[#88745e]">staying for.</em></h2>
              <p className="mx-auto mb-[30px] mt-[22px] max-w-[420px] font-serif text-[15px] leading-[1.8] text-[#686158]">New releases, new stories, and occasional updates from Whisper 119. No unnecessary noise. Just something worth opening.</p>

              {subscribe.isSuccess ? (
                <p className="border border-[#d6cec3] bg-[#f2ede5] px-4 py-4 text-center font-serif text-[15px] leading-7 text-[#625b53]">You&apos;re on the list. I&apos;ll be in touch when there&apos;s something worth opening.</p>
              ) : (
                <form onSubmit={submit} className="text-left">
                  <label htmlFor="newsletterEmail" className="mb-2 block font-sans text-[10px] tracking-[1.5px] text-[#625b53]">EMAIL ADDRESS</label>
                  <input id="newsletterEmail" name="email" required autoComplete="email" minLength={3} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="box-border block w-full rounded-none border border-[#d6cec3] bg-white px-[17px] py-4 font-sans text-sm text-[#171717] outline-none transition focus:border-[#62584c] focus:ring-[3px] focus:ring-[#62584c]/[0.08] placeholder:text-[#aaa39a]" />
                  <button type="submit" disabled={subscribe.isPending} className="mt-[11px] block w-full border border-[#171717] bg-[#171717] px-5 py-[17px] font-sans text-[10px] font-semibold uppercase tracking-[2px] text-[#fffdf8] transition hover:border-[#88745e] hover:bg-[#88745e] disabled:cursor-wait disabled:opacity-60">{subscribe.isPending ? "Joining..." : "Join Whisper 119"}</button>
                  {subscribe.error && <p role="alert" className="mt-3 text-sm text-destructive">Something went wrong. Please try again.</p>}
                </form>
              )}
              <p className="mt-[18px] font-sans text-[9px] tracking-[0.5px] text-[#999087]">No spam · Unsubscribe anytime</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
