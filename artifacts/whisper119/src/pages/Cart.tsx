import { Link, useLocation } from "wouter"
import { useCart } from "@/components/cart-provider"
import { formatPrice } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export default function Cart() {
  const { items, removeItem, total } = useCart()
  const [, setLocation] = useLocation()

  if (items.length === 0) {
    return (
      <main className="min-h-screen py-24 px-4 flex flex-col items-center">
        <h1 className="text-3xl font-serif mb-6">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-8 text-center max-w-md">
          Whisper 119 is a quiet place. Take your time browsing the shelves.
        </p>
        <Button asChild>
          <Link href="/shop">Browse Titles</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-16 px-4 container mx-auto max-w-4xl">
      <h1 className="text-4xl font-serif mb-10 border-b pb-6">Your Cart</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={item.id} className="flex gap-6 py-6 border-b last:border-0">
              <Link href={`/book/${item.id}`} className="shrink-0">
                <div className="w-20 aspect-[2/3] bg-muted relative">
                  {item.coverUrl && (
                    <img src={item.coverUrl} alt={item.title} className="object-cover w-full h-full" />
                  )}
                </div>
              </Link>
              <div className="flex-1 flex flex-col">
                <Link href={`/book/${item.id}`} className="hover:underline underline-offset-4 decoration-foreground/30">
                  <h3 className="font-serif text-xl mb-1">{item.title}</h3>
                </Link>
                <p className="text-sm text-muted-foreground mb-2">{item.author}</p>
                <p className="text-xs font-mono uppercase text-muted-foreground">{item.format}</p>
                
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-medium">{formatPrice(item.price, item.currency)}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors text-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="md:col-span-1">
          <div className="bg-secondary/20 border p-6 sticky top-24">
            <h2 className="font-serif text-xl mb-6 border-b pb-4">Summary</h2>
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(total, items[0]?.currency || "USD")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxes</span>
                <span>Calculated at checkout</span>
              </div>
            </div>
            <div className="border-t pt-4 mb-8 flex justify-between font-medium text-lg">
              <span>Total</span>
              <span>{formatPrice(total, items[0]?.currency || "USD")}</span>
            </div>
            <Button
              className="w-full h-12 text-base"
              onClick={() => setLocation("/checkout")}
            >
              Checkout securely
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4">
              All files are DRM-free and yours to keep forever.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
