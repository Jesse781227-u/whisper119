import { Link } from "wouter"
import { ArrowUpRight } from "lucide-react"

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-secondary/35">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_0.7fr_0.7fr]">
        <div>
          <p className="font-display text-2xl">Whisper 119</p>
          <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
            A small, carefully kept bookshop for digital readers. Every title is chosen slowly and delivered as a clean, DRM-free file.
          </p>
          <p className="mt-8 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Made for readers everywhere</p>
        </div>
        <div>
          <p className="rule-label">Explore</p>
          <div className="mt-5 grid gap-3 text-sm">
            <Link href="/shop" className="text-muted-foreground transition-colors hover:text-primary">All books</Link>
            <Link href="/about" className="text-muted-foreground transition-colors hover:text-primary">About the shop</Link>
            <Link href="/admin/login" className="text-muted-foreground transition-colors hover:text-primary">Shop owner login</Link>
          </div>
        </div>
        <div>
          <p className="rule-label">Contact</p>
          <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
            <a href="mailto:hello@whisper119.shop" className="transition-colors hover:text-primary">hello@whisper119.shop</a>
            <span>Prices in USD</span>
            <span className="flex items-center gap-1">Worldwide delivery <ArrowUpRight className="h-3.5 w-3.5" /></span>
          </div>
        </div>
      </div>
      <div className="border-t border-border/70 px-5 py-5 text-center font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground sm:px-8">
        © {new Date().getFullYear()} Whisper 119 · Digital titles only · Delivered by email
      </div>
    </footer>
  )
}