import { Mail, MapPin } from "lucide-react"
import { Link, useLocation } from "wouter"
import { NewsletterSignup } from "@/components/newsletter-signup"

/**
 * Social profiles shown in the footer. Add entries like
 * { label: "TikTok", href: "https://www.tiktok.com/@..." } — nothing renders while empty.
 */
const SOCIAL_LINKS: Array<{ label: string; href: string }> = []

const PAYMENT_METHODS = ["Visa", "Mastercard", "Verve", "Bank transfer", "Flutterwave"]

const linkClass = "inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground hover:text-primary"

export function Footer() {
  const [location] = useLocation()
  const showNewsletter = !location.startsWith("/admin") && location !== "/checkout"
  return (
    <footer className="mt-12">
      {showNewsletter && (
        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6"><NewsletterSignup /></div>
      )}
      <div className="border-t border-border bg-[#140f1f]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="max-w-sm">
              <Link href="/" aria-label="Whisper 119 home" className="inline-block">
                <img src="/whisper-119-wordmark-light.png" alt="Whisper 119" width={237} height={96} loading="lazy" className="h-10 w-auto" />
              </Link>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">Whisper 119 is operated by Audrey Leilani Global Limited (RC 9270417).</p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Mail className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><a href="mailto:anastasiaibeh67@gmail.com" className="break-all hover:text-primary">anastasiaibeh67@gmail.com</a></li>
                <li className="flex items-start gap-2"><MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><span>Number 6 Unity Street, Off Location Road, Obigbo, Rivers State, Nigeria</span></li>
              </ul>
              {SOCIAL_LINKS.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Social media">
                  {SOCIAL_LINKS.map((social) => (
                    <li key={social.href}><a href={social.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-xs font-bold hover:border-primary hover:text-primary">{social.label}</a></li>
                  ))}
                </ul>
              )}
            </div>
            <nav aria-labelledby="footer-shop">
              <p id="footer-shop" className="rule-label mb-2">Shop</p>
              <ul className="grid">
                <li><Link href="/shop" className={linkClass}>Browse books</Link></li>
                <li><Link href="/categories" className={linkClass}>Categories</Link></li>
                <li><Link href="/cart" className={linkClass}>Cart</Link></li>
              </ul>
            </nav>
            <nav aria-labelledby="footer-help">
              <p id="footer-help" className="rule-label mb-2">Help &amp; legal</p>
              <ul className="grid">
                <li><Link href="/about" className={linkClass}>About</Link></li>
                <li><Link href="/contact" className={linkClass}>Contact</Link></li>
                <li><Link href="/terms" className={linkClass}>Terms</Link></li>
                <li><Link href="/privacy" className={linkClass}>Privacy</Link></li>
                <li><Link href="/refund" className={linkClass}>Refund policy</Link></li>
              </ul>
            </nav>
          </div>
          <div className="mt-8 border-t border-border pt-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">We accept</p>
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Accepted payment methods">
              {PAYMENT_METHODS.map((method) => (
                <li key={method} className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground">{method}</li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-muted-foreground">© {new Date().getFullYear()} Whisper 119 · Digital PDF ebooks · Delivered by email worldwide</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
