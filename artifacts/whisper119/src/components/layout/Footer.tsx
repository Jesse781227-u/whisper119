import { Mail } from "lucide-react"
import { Link } from "wouter"

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/whisper-119-logo.png" alt="Whisper 119" className="h-10 w-auto max-w-[12rem] object-contain dark:invert" />
            </Link>
            <p className="mt-2 text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-primary">browse, buy, read</p>
          </div>
          <div>
            <p className="rule-label mb-3">Legal / Information</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
              <Link href="/shop" className="font-semibold text-muted-foreground hover:text-primary">Browse books</Link>
              <Link href="/about" className="font-semibold text-muted-foreground hover:text-primary">About Us</Link>
              <Link href="/contact" className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-primary"><Mail className="h-3.5 w-3.5" /> Contact</Link>
              <Link href="/terms" className="font-semibold text-muted-foreground hover:text-primary">Terms &amp; Conditions</Link>
              <Link href="/privacy" className="font-semibold text-muted-foreground hover:text-primary">Privacy Policy</Link>
              <Link href="/refunds" className="font-semibold text-muted-foreground hover:text-primary">Refund Policy</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-5 text-[0.62rem] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          <span>© {new Date().getFullYear()} Whisper 119</span>
          <span>Digital copies · Email delivery · Available worldwide.</span>
        </div>
      </div>
    </footer>
  )
}
