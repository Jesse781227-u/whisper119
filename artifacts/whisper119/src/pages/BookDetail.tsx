import { useParams } from "wouter"
import { useGetBook } from "@workspace/api-client-react"
import { useCart } from "@/components/cart-provider"
import { formatPrice, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Check, ShoppingBag } from "lucide-react"

export default function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>()
  const { data: book, isLoading, error } = useGetBook(bookId!)
  const { items, addItem } = useCart()

  if (isLoading) {
    return (
      <main className="min-h-screen py-12 px-4 container mx-auto">
        <div className="flex flex-col md:flex-row gap-12 max-w-5xl mx-auto">
          <div className="w-full md:w-1/3">
            <Skeleton className="aspect-[2/3] w-full" />
          </div>
          <div className="w-full md:w-2/3 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !book) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-destructive font-serif text-xl">Book not found.</p>
      </main>
    )
  }

  const isInCart = items.some((item) => item.id === book.id)

  return (
    <main className="min-h-screen py-16 px-4 container mx-auto">
      <div className="flex flex-col md:flex-row gap-12 max-w-5xl mx-auto">
        {/* Cover */}
        <div className="w-full md:w-1/3 shrink-0">
          <div className="aspect-[2/3] bg-muted relative shadow-xl">
            {book.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8 text-center border">
                <span className="font-serif text-xl">{book.title}</span>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="w-full md:w-2/3 flex flex-col">
          <div className="mb-6">
            <Badge variant="outline" className="mb-4 font-mono uppercase tracking-wider text-[10px]">
              {book.category}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-serif leading-tight mb-2">
              {book.title}
            </h1>
            <p className="text-xl text-muted-foreground font-serif italic">
              by {book.author}
            </p>
          </div>

          <div className="prose prose-neutral dark:prose-invert mb-10 max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {book.description || "No description provided."}
          </div>

          <div className="mt-auto border-t pt-8">
            <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
              <div>
                <p className="text-2xl font-medium mb-1">{formatPrice(book.price, book.currency)}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                  Format: {book.format} • DRM-Free
                </p>
              </div>
              
              <Button
                size="lg"
                className="w-full sm:w-auto text-base h-14 px-8"
                onClick={() => {
                  if (!isInCart) addItem(book)
                }}
                disabled={isInCart}
              >
                {isInCart ? (
                  <>
                    <Check className="mr-2" /> In Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2" /> Add to Cart
                  </>
                )}
              </Button>
            </div>
            <div className="mt-6 flex gap-8 text-xs text-muted-foreground border-t pt-6">
              <div>
                <span className="font-medium block text-foreground mb-1">Published</span>
                {formatDate(book.publishedAt)}
              </div>
              <div>
                <span className="font-medium block text-foreground mb-1">File Name</span>
                <span className="font-mono">{book.fileName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
