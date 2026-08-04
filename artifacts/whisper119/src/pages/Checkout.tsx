import { useEffect, useState } from "react"
import { useLocation } from "wouter"
import { useCart } from "@/components/cart-provider"
import { useCreateOrder } from "@workspace/api-client-react"
import { formatPrice } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"

export default function Checkout() {
  const { items, total, clearCart } = useCart()
  const [, setLocation] = useLocation()
  
  const [email, setEmail] = useState("")
  const [country, setCountry] = useState("US")
  
  const createOrder = useCreateOrder()

  useEffect(() => {
    if (items.length === 0) setLocation("/cart")
  }, [items.length, setLocation])

  if (items.length === 0) {
    return null
  }

  const currency = items[0]?.currency || "USD"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    createOrder.mutate({
      data: {
        email,
        country,
        currency,
        bookIds: items.map(i => i.id)
      }
    }, {
      onSuccess: (res) => {
        clearCart()
        window.location.href = res.authorizationUrl
      }
    })
  }

  return (
    <main className="min-h-screen py-16 px-4 container mx-auto max-w-4xl">
      <h1 className="text-3xl font-serif mb-10 border-b pb-6">Checkout</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="order-2 md:order-1">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4 border p-6 bg-card">
              <h2 className="font-serif text-xl mb-4">Contact Information</h2>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="Where should we send your files?"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                 <p className="text-xs text-muted-foreground">Your ebook files and receipt will be sent here after payment confirms.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <select
                  id="country"
                  className="flex h-9 w-full border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="JP">Japan</option>
                  {/* ... other countries omitted for brevity */}
                  <option value="NG">Nigeria</option>
                  <option value="ZA">South Africa</option>
                </select>
              </div>
            </div>

            {createOrder.error && (
              <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">We could not start payment. Paystack supports international cards selectively, so please check your details and retry.</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-14 text-lg"
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? "Connecting to payment..." : `Pay ${formatPrice(total, currency)}`}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              Payments are processed securely via Paystack. After the webhook confirms payment, your ebook files are sent as email attachments.
            </p>
          </form>
        </div>

        <div className="order-1 md:order-2">
          <div className="bg-secondary/10 p-6 border sticky top-24">
            <h2 className="font-serif text-lg mb-6 border-b pb-4">Order Summary</h2>
            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-sm leading-tight">{item.title}</p>
                    <p className="text-xs text-muted-foreground font-mono uppercase mt-1">{item.format}</p>
                  </div>
                  <span className="text-sm shrink-0">{formatPrice(item.price, item.currency)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 flex justify-between font-medium text-lg">
              <span>Total</span>
              <span>{formatPrice(total, currency)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
