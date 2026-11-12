import { Mail } from "lucide-react"
import { Link, useLocation } from "wouter"
import { NewsletterSignup } from "@/components/newsletter-signup"

/**
 * Social profiles shown in the footer. Add entries like
 * { label: "TikTok", href: "https://www.tiktok.com/@..." } — nothing renders while empty.
 */
const SOCIAL_LINKS: Array<{ label: string; href: string }> = []

const PAYMENT_METHODS = ["Visa", "Mastercard", "Verve", "Bank transfer"]

const SHOP_LINKS = [
  { href: "/shop", label: "Browse books" },
  { href: "/categories", label: "Categories" },
  { href: "/cart", label: "Cart" },
]
const HELP_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refunds" },
]

function LinkGroup({ id, title, links }: { id: string; title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <nav aria-labelledby={id} className="min-w-0">
      <p id={id} className="text-[0.68rem] font-bold uppercase tracking-[0.15em] text-primary">{title}</p>
      {/* Mobile: links wrap into a compact row. Desktop: a column. */}
      <ul className="mt-1 flex flex-wrap gap-x-4 md:mt-2 md:grid md:gap-x-0">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground/85 hover:text-primary md:min-h-9 md:text-muted-foreground">{link.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function Footer() {
  const [location] = useLocation()
  const showNewsletter = !location.startsWith("/admin") && location !== "/checkout"
  return (
    <footer className="mt-10">
      {showNewsletter && (
        <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6"><NewsletterSignup /></div>
      )}
      <div className="relative bg-[#140f1f]">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--primary)),transparent)]" />
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-7 sm:px-6 md:pb-8 md:pt-10">
          <div className="grid gap-5 md:grid-cols-[1.4fr_1fr_1fr] md:gap-8">
            <div className="flex items-center justify-between gap-4 md:block">
              <Link href="/" aria-label="Whisper 119 home" className="inline-block shrink-0">
                <img src="/whisper-119-wordmark-light.png" alt="Whisper 119" width={237} height={96} loading="lazy" className="h-9 w-auto md:h-10" />
              </Link>
              <p className="text-right text-[0.68rem] font-bold uppercase leading-4 tracking-[0.14em] text-muted-foreground md:mt-3 md:text-left">Romance · Completed series</p>
              {SOCIAL_LINKS.length > 0 && (
                <ul className="mt-3 hidden flex-wrap gap-2 md:flex" aria-label="Social media">
                  {SOCIAL_LINKS.map((social) => (
                    <li key={social.href}><a href={social.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-xs font-bold hover:border-primary hover:text-primary">{social.label}</a></li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid gap-3 md:contents">
              <LinkGroup id="footer-shop" title="Shop" links={SHOP_LINKS} />
              <LinkGroup id="footer-help" title="Help & legal" links={HELP_LINKS} />
            </div>
            {SOCIAL_LINKS.length > 0 && (
              <ul className="flex flex-wrap gap-2 md:hidden" aria-label="Social media">
                {SOCIAL_LINKS.map((social) => (
                  <li key={social.href}><a href={social.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-xs font-bold hover:border-primary hover:text-primary">{social.label}</a></li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 md:mt-8 md:flex-row md:items-center md:justify-between">
            <ul className="flex flex-wrap gap-1.5" aria-label="Accepted payment methods">
              {PAYMENT_METHODS.map((method) => (
                <li key={method} className="rounded-md border border-border px-2 py-0.5 text-[0.68rem] font-bold text-muted-foreground">{method}</li>
              ))}
            </ul>
            <a href="mailto:anastasiaibeh67@gmail.com" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary md:min-h-0">
              <Mail className="h-4 w-4" aria-hidden="true" /> anastasiaibeh67@gmail.com
            </a>
          </div>
          <p className="mt-3 text-[0.7rem] leading-5 text-muted-foreground/80">
            © {new Date().getFullYear()} Whisper 119 · Operated by Audrey Leilani Global Limited (RC 9270417) · Number 6 Unity Street, Off Location Road, Obigbo, Rivers State, Nigeria
          </p>
        </div>
      </div>
    </footer>
  )
}
