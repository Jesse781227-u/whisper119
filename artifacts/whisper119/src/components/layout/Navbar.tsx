import { Link, useLocation } from "wouter"
import { Menu, ShoppingBag, Sun, Moon, ArrowUpRight } from "lucide-react"
import { useState } from "react"
import { useCart } from "@/components/cart-provider"
import { useTheme } from "@/components/theme-provider"

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
]

export function Navbar() {
  const { items } = useCart()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [location] = useLocation()
  const dark = theme === "dark"

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="font-display text-[1.35rem] font-medium tracking-[-0.04em]">Whisper 119</span>
          <span className="hidden border-l border-border pl-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            Independent digital bookshop
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-mono text-[0.68rem] uppercase tracking-[0.16em] transition-colors ${
                location === link.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/cart"
            className="group relative flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
            Cart
            {items.length > 0 && (
              <span className="absolute -right-3 -top-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.58rem] text-primary-foreground">
                {items.length}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(dark ? "light" : "dark")}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            {dark ? <Sun className="h-4 w-4" strokeWidth={1.5} /> : <Moon className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        </nav>

        <div className="flex items-center gap-4 md:hidden">
          <Link href="/cart" aria-label={`Cart, ${items.length} items`} className="relative text-muted-foreground">
            <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
            {items.length > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.58rem] text-primary-foreground">{items.length}</span>}
          </Link>
          <button type="button" aria-label="Open menu" onClick={() => setOpen((value) => !value)} className="text-muted-foreground">
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border/70 bg-background px-5 py-5 md:hidden">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block border-b border-border/60 py-4 font-display text-2xl">
              {link.label}
            </Link>
          ))}
          <div className="flex items-center justify-between pt-5">
            <Link href="/admin/login" onClick={() => setOpen(false)} className="flex items-center gap-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              Librarian login <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} Theme
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}