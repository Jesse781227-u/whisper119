import { Link, useLocation } from "wouter"
import { BookOpen, ChevronDown, Menu, Moon, Search, ShoppingBag, Sun, UserCircle, X } from "lucide-react"
import { useEffect, useState } from "react"
import { useGetStorefrontSummary } from "@workspace/api-client-react"
import { useCart } from "@/components/cart-provider"
import { useTheme } from "@/components/theme-provider"

export function Navbar() {
  const { items } = useCart()
  const { theme, setTheme } = useTheme()
  const { data: summary } = useGetStorefrontSummary()
  const [open, setOpen] = useState(false)
  const [menuVisible, setMenuVisible] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [location] = useLocation()
  const dark = theme === "dark"
  const categories = summary?.categories ?? []

  useEffect(() => {
    if (!open) {
      const timeout = window.setTimeout(() => setMenuVisible(false), 280)
      return () => window.clearTimeout(timeout)
    }

    setMenuVisible(true)
    return undefined
  }, [open])

  useEffect(() => {
    document.body.style.overflow = menuVisible ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [menuVisible])

  const toggleMenu = () => {
    if (open) {
      setOpen(false)
      return
    }

    setMenuVisible(true)
    window.requestAnimationFrame(() => setOpen(true))
  }

  const closeMenu = () => setOpen(false)

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close menu" : "Open menu"} onClick={toggleMenu} className="shrink-0 rounded-full p-2 text-foreground transition-colors hover:bg-secondary md:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/" className="hidden shrink-0 items-center gap-2 md:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="text-sm font-extrabold tracking-tight">Whisper 119</span>
          </Link>
          <label className="relative min-w-0 flex-1 md:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Search books" placeholder="Search what you want" className="h-10 w-full rounded-full border border-transparent bg-secondary/80 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/10" />
          </label>
          <Link href="/cart" className={`relative hidden items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors hover:bg-secondary sm:flex ${location === "/cart" ? "text-primary" : "text-muted-foreground"}`}>
            <ShoppingBag className="h-4 w-4" />
            Cart
            {items.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.58rem] text-primary-foreground">{items.length}</span>}
          </Link>
          <Link href="/cart" className="relative rounded-full p-2 text-muted-foreground hover:bg-secondary sm:hidden" aria-label={`Cart, ${items.length} items`}>
            <ShoppingBag className="h-5 w-5" />
            {items.length > 0 && <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.58rem] text-primary-foreground">{items.length}</span>}
          </Link>
          <button type="button" aria-label="Toggle theme" onClick={() => setTheme(dark ? "light" : "dark")} className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link href="/admin/login" aria-label="Account" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20">
            <UserCircle className="h-5 w-5" />
          </Link>
        </div>

        <nav className="no-scrollbar mx-auto hidden max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6 md:flex" aria-label="Book categories">
          <Link href="/shop" className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${location === "/shop" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary"}`}>All books</Link>
          {categories.map((category) => (
            <Link key={category.name} href={`/shop?category=${encodeURIComponent(category.name)}`} className="shrink-0 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-primary/10 hover:text-primary">
              {category.name}
            </Link>
          ))}
        </nav>
      </div>

      {menuVisible && (
        <div className={`fixed inset-x-0 bottom-0 top-14 z-40 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeMenu}
            className={`absolute inset-0 bg-foreground/25 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
          />
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className={`absolute inset-x-0 top-0 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-border bg-background px-4 pb-6 pt-3 shadow-xl transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}
          >
            <div className="mx-auto max-w-lg">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="rule-label">Navigate</p>
                <span className="text-[0.65rem] font-semibold text-muted-foreground">Whisper 119</span>
              </div>
              <div className="grid gap-1">
                <Link href="/" onClick={closeMenu} className="flex items-center rounded-xl px-4 py-3.5 text-sm font-bold transition-colors hover:bg-secondary">
                  Home
                </Link>

                <div className="rounded-xl bg-secondary/60">
                  <button
                    type="button"
                    aria-expanded={categoriesOpen}
                    aria-controls="mobile-category-links"
                    onClick={() => setCategoriesOpen((value) => !value)}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-sm font-bold transition-colors hover:bg-secondary"
                  >
                    <span>Categories</span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none ${categoriesOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${categoriesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                    <div id="mobile-category-links" className="min-h-0 overflow-hidden">
                      <div className="border-t border-border/70 px-2 pb-2 pt-1">
                        <Link href="/shop" onClick={closeMenu} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-background">
                          All books
                        </Link>
                        {categories.map((category) => (
                          <Link key={category.name} href={`/shop?category=${encodeURIComponent(category.name)}`} onClick={closeMenu} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-background hover:text-primary">
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <Link href="/cart" onClick={closeMenu} className="flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-bold transition-colors hover:bg-secondary">
                  <span>Cart</span>
                  {items.length > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{items.length}</span>}
                </Link>

                <a href="mailto:hello@whisper119.shop" onClick={closeMenu} className="rounded-xl px-4 py-3.5 text-sm font-bold transition-colors hover:bg-secondary">
                  Contact
                </a>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}