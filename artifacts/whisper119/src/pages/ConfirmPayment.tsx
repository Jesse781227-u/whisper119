import { ArrowLeft, CheckCircle2, ExternalLink, Mail, ReceiptText } from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
import { Link } from "wouter"
import { useConfirmPayment, useListBooks } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type PaymentMethod = "flutterwave" | "payoneer"

function getQueryValue(name: string) {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get(name) ?? ""
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "error" in error && typeof error.error === "string") {
    return error.error
  }
  return "We could not save your confirmation. Please check the details and try again."
}

export default function ConfirmPayment() {
  const initialBookId = useMemo(() => getQueryValue("bookId"), [])
  const initialMethod = useMemo<PaymentMethod>(() => {
    return getQueryValue("method") === "payoneer" ? "payoneer" : "flutterwave"
  }, [])
  const [bookId, setBookId] = useState(initialBookId)
  const [email, setEmail] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialMethod)
  const [paymentReference, setPaymentReference] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const { data: books, isLoading: isBooksLoading } = useListBooks(undefined, {
    query: {
      queryKey: ["/api/books"],
      retry: 2,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2000),
    },
  })
  const confirmPayment = useConfirmPayment()
  const catalogue = Array.isArray(books) ? books : []
  const selectedBook = catalogue.find((book) => book.id === bookId)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    confirmPayment.mutate(
      {
        data: {
          email: email.trim(),
          bookId,
          paymentMethod,
          paymentReference: paymentReference.trim(),
        },
      },
      { onSuccess: () => setSubmitted(true) },
    )
  }

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-4 py-20 sm:px-6">
        <section className="w-full rounded-3xl border border-primary/25 bg-secondary/60 p-7 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Confirmation received</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Thanks — we’ll review your payment.</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
            Your payment details are now pending verification. We’ll verify the transaction and send your book shortly after it’s confirmed.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {bookId && <Link href={`/book/${bookId}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-xs font-extrabold text-primary-foreground transition-transform hover:-translate-y-0.5">Back to this book</Link>}
            <Link href="/shop" className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-xs font-extrabold text-foreground transition-colors hover:border-primary hover:text-primary">Browse the shop</Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="pb-28">
      <section className="mx-auto max-w-3xl px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
        <Link href={bookId ? `/book/${bookId}` : "/shop"} className="inline-flex items-center gap-2 text-xs font-bold text-primary transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to the book
        </Link>
        <div className="mt-10 max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Payment confirmation</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Tell us where your payment landed.</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            After paying through your selected provider, share the transaction details below so the librarian can review your payment. Your book is not delivered until payment is verified.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="flex items-start gap-3 rounded-2xl bg-secondary/70 p-4">
            <ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-extrabold">One confirmation per book</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose the title and provider you paid through, then copy the reference exactly as shown by the payment provider.</p>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Your email address</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                minLength={3}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Book purchased</span>
            {isBooksLoading ? (
              <Skeleton className="h-12 w-full rounded-xl" />
            ) : (
              <select
                required
                value={bookId}
                onChange={(event) => setBookId(event.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors focus:border-primary"
              >
                <option value="" disabled>Select the book you paid for</option>
                {catalogue.map((book) => <option key={book.id} value={book.id}>{book.title} — {book.author}</option>)}
              </select>
            )}
          </label>

          <fieldset>
            <legend className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Payment method</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["flutterwave", "Flutterwave", "Secure NGN and USD payments"],
                ["payoneer", "Payoneer", "International payments"],
              ] as const).map(([value, label, description]) => (
                <label key={value} className={`cursor-pointer rounded-2xl border p-4 transition-colors ${paymentMethod === value ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/50"}`}>
                  <input type="radio" name="paymentMethod" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} className="sr-only" />
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-extrabold">{label}</span>
                    <span className={`h-3 w-3 rounded-full border-2 ${paymentMethod === value ? "border-primary bg-primary" : "border-muted-foreground/50"}`} />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Payment reference / transaction ID</span>
            <input
              type="text"
              required
              minLength={1}
              maxLength={200}
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              placeholder="Paste the reference from your receipt"
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
            />
            <span className="mt-2 block text-xs leading-5 text-muted-foreground">Please enter the provider’s reference, not a password or card number.</span>
          </label>

          {selectedBook && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">Reviewing</p>
                <p className="mt-1 text-sm font-bold">{selectedBook.title}</p>
              </div>
              <span className="text-right text-xs font-bold text-muted-foreground">{paymentMethod === "payoneer" ? "Payoneer payment" : "Flutterwave payment"}</span>
            </div>
          )}

          {confirmPayment.error && (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{getErrorMessage(confirmPayment.error)}</p>
          )}

          <Button type="submit" disabled={confirmPayment.isPending || isBooksLoading || catalogue.length === 0} className="h-12 w-full rounded-xl text-xs font-extrabold uppercase tracking-wide">
            {confirmPayment.isPending ? "Saving confirmation…" : "Submit for review"}
          </Button>
          <p className="text-center text-xs leading-5 text-muted-foreground">We’ll only use this email to follow up on your payment confirmation.</p>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need to make the payment first? <Link href={bookId ? `/book/${bookId}` : "/shop"} className="font-bold text-primary hover:text-foreground">Return to the payment options</Link>
          <ExternalLink className="ml-1 inline h-3 w-3" />
        </p>
      </section>
    </main>
  )
}
