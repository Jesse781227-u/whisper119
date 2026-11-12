import { Link, useLocation } from "wouter"
import { ChevronDown, ChevronRight, Globe, Menu, Search, ShoppingBag, UserRound } from "lucide-react"
import { useRef, useState, type FormEvent, type TouchEvent } from "react"
import { useGetStorefrontSummary } from "@workspace/api-client-react"
import { useCart } from "@/components/cart-provider"
import { LanguageRegionSelector, LanguageRegionSheet, useLanguageRegionLabel } from "@/components/language-region-selector"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { motion, useReducedMotion } from "framer-motion"

function Wordmark({ className = "h-7" }: { className?: string }) {
  return <img src="/whisper-119-wordmark-light.png" alt="Whisper 119" width={237} height={96} className={`w-auto ${className}`} />
}

function CartIcon({ count }: { count: number }) {
  const prefersReducedMotion = useReducedMotion()
  return (
    <span className="relative">
      <motion.span key={count} className="block" animate={prefersReducedMotion ? undefined : { scale: [1, 1.14, 1] }} transition={{ duration: 0.32 }}>
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      </motion.span>
      {count > 0 && (
        <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-primary-foreground">{count}</span>
      )}
    </span>
  )
}

const iconButton = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
const drawerRow = "flex min-h-12 w-full items-center justify-between rounded-xl px-4 text-left text-sm font-bold transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"

export function Navbar() {
  const { items } = useCart()
  const { data: summary } = useGetStorefrontSummary()
  const [open, setOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [location, setLocation] = useLocation()
  const languageLabel = useLanguageRegionLabel()
  const touchStartX = useRef<number | null>(null)
  const categories = Array.isArray(summary?.categories) ? summary.categories : []
  const onShop = location === "/shop"

  const closeMenu = () => setOpen(false)

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = new FormData(event.currentTarget).get("search")?.toString().trim() ?? ""
    setLocation(query ? `/shop?search=${encodeURIComponent(query)}` : "/shop")
  }

  // Swipe left anywhere on the drawer to close it.
  const onTouchStart = (event: TouchEvent) => { touchStartX.current = event.touches[0]?.clientX ?? null }
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current
    const end = event.changedTouches[0]?.clientX
    touchStartX.current = null
    if (start !== null && end !== undefined && start - end > 60) closeMenu()
  }

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-2 sm:gap-3 sm:px-6 md:h-16">
          <button type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label="Open menu" onClick={() => setOpen(true)} className={`${iconButton} md:hidden`}>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link href="/" aria-label="Whisper 119 home" className="flex shrink-0 items-center rounded-lg px-1 py-1">
            <Wordmark className="h-7 md:h-8" />
          </Link>

          {/* Desktop search. Hidden on /shop, which has its own search field. */}
          {!onShop && (
            <form role="search" onSubmit={submitSearch} className="relative ml-4 hidden min-w-0 flex-1 md:block md:max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input name="search" aria-label="Search books" placeholder="Search books" className="h-10 w-full rounded-full border border-transparent bg-secondary/80 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/10" />
            </form>
          )}

          <span className="flex-1" />

          {!onShop && (
            <Link href="/shop?focus=search" aria-label="Search books" className={`${iconButton} md:hidden`}>
              <Search className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
          <Link href="/cart" aria-label={`Cart, ${items.length} ${items.length === 1 ? "item" : "items"}`} className={`${iconButton} ${location === "/cart" ? "text-primary" : ""}`}>
            <CartIcon count={items.length} />
          </Link>
          <Link href="/account" aria-label="Reader account" className={`${iconButton} hidden md:flex`}>
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="hidden md:block"><LanguageRegionSelector /></div>
        </div>

        <nav className="no-scrollbar mx-auto hidden max-w-7xl gap-2 overflow-x-auto px-6 pb-3 md:flex" aria-label="Book categories">
          <Link href="/shop" className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${onShop ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary"}`}>All books</Link>
          {categories.filter(category => category.featured || category.count > 0).slice(0, 6).map((category) => (
            <Link key={category.name} href={`/shop?category=${encodeURIComponent(category.name)}`} className="shrink-0 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-primary/10 hover:text-primary">
              {category.name}
            </Link>
          ))}
          <Link href="/categories" className="shrink-0 rounded-full border border-primary/30 px-4 py-2 text-xs font-semibold text-primary">All categories</Link>
        </nav>
      </div>

      {/* Mobile menu drawer: Esc, backdrop tap and swipe-left close it; focus is trapped while open. */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          id="mobile-navigation"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="flex w-[86vw] max-w-sm flex-col gap-0 overflow-y-auto p-0 pb-[env(safe-area-inset-bottom)] [&>button:first-child]:right-3 [&>button:first-child]:top-3 [&>button:first-child]:flex [&>button:first-child]:h-11 [&>button:first-child]:w-11 [&>button:first-child]:items-center [&>button:first-child]:justify-center [&>button:first-child]:rounded-full"
        >
          <div className="flex h-16 items-center border-b border-border px-5">
            <Link href="/" onClick={closeMenu} aria-label="Whisper 119 home"><Wordmark className="h-8" /></Link>
          </div>
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>

          <nav aria-label="Main" className="grid gap-1 p-3">
            <Link href="/" onClick={closeMenu} className={drawerRow}>Home</Link>
            <Link href="/shop" onClick={closeMenu} className={drawerRow}>Browse all books</Link>

            <div className="rounded-xl bg-secondary/50">
              <button type="button" aria-expanded={categoriesOpen} aria-controls="drawer-categories" onClick={() => setCategoriesOpen((value) => !value)} className={drawerRow}>
                <span>Categories</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform motion-reduce:transition-none ${categoriesOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {categoriesOpen && (
                <div id="drawer-categories" className="grid border-t border-border/70 px-2 pb-2 pt-1">
                  <Link href="/categories" onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:bg-background">All categories</Link>
                  {categories.map((category) => (
                    <Link key={category.name} href={`/shop?category=${encodeURIComponent(category.name)}`} onClick={closeMenu} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground hover:bg-background hover:text-primary">
                      {category.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/cart" onClick={closeMenu} className={drawerRow}>
              <span>My cart</span>
              {items.length > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{items.length}</span>}
            </Link>
            <Link href="/account" onClick={closeMenu} className={drawerRow}>Reader account</Link>
            <button type="button" onClick={() => setLanguageOpen(true)} className={drawerRow}>
              <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Language &amp; region</span>
              <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">{languageLabel}<ChevronRight className="h-4 w-4" aria-hidden="true" /></span>
            </button>
            <Link href="/about" onClick={closeMenu} className={drawerRow}>About</Link>
            <Link href="/contact" onClick={closeMenu} className={drawerRow}>Contact</Link>
          </nav>
        </SheetContent>
      </Sheet>
      <LanguageRegionSheet open={languageOpen} onOpenChange={setLanguageOpen} />
    </header>
  )
}
