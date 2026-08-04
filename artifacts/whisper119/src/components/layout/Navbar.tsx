import { Link } from "wouter"
import { useCart } from "@/components/cart-provider"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

export function Navbar() {
  const { items } = useCart()
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="font-serif text-2xl font-semibold tracking-tight">
          Whisper 119
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/shop" className="text-muted-foreground hover:text-foreground transition-colors">
            Catalogue
          </Link>
          <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
            About
          </Link>
          <Link href="/cart" className="text-foreground transition-colors relative">
            Cart
            {items.length > 0 && (
              <span className="absolute -top-2 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {items.length}
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </nav>
      </div>
    </header>
  )
}
