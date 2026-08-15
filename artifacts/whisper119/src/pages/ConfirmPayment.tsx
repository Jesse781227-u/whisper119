import { AlertCircle, ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react"
import { useMemo, useState } from "react"
import { Link, useLocation } from "wouter"
import { useListBooks, useSubmitPaymentConfirmation } from "@workspace/api-client-react"
import { BookCover } from "@/components/book-card"

const fieldClass = "h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10"

export default function ConfirmPayment() {
  const [location, setLocation] = useLocation()
  const params = useMemo(() => new URLSearchParams(location.split("?")[1] ?? ""), [location])
  const prefilledBookId = params.get("bookId") ?? ""
  const prefilledMethod = params.get("method") === "payoneer" ? "payoneer" : "paystack"
  const booksQuery = useListBooks(undefined, { query: { queryKey: ["/api/books"] } })
  const submitPayment = useSubmitPaymentConfirmation()
  const books = Array.isArray(booksQuery.data) ? booksQuery.data : []
  const [email, setEmail] = useState("")
  const [bookId, setBookId] = useState(prefilledBookId)
  const [method, setMethod] = useState<"paystack" | "payoneer">(prefilledMethod)
  const [reference, setReference] = useState("")
  const selectedBook = books.find((book) => book.id === bookId)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitPayment.mutate(
      { data: { email: email.trim(), bookId, paymentMethod: method, paymentReference: reference.trim() } },
      { onSuccess: () => setLocation("/confirm-payment?submitted=1") },
    )
  }

  if (params.get("submitted") === "1") {
    return (
      <main className="mx-auto flex min-h-[70dvh] max-w-2xl items-center px-4 py-16 sm:px-6">
        <section className="w-full rounded-3xl border border-primary/25 bg-card p-7 text-center shadow-xl shadow-primary/5 sm:p-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/12 text-primary"><CheckCircle2 className="h-8 w-8" /></span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">Reference received</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Your order is with the librarian.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">We’ll review the payment reference and email your ebook as an attachment once payment is confirmed. No file is sent before that review.</p>
          <Link href="/shop" className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-xs font-extrabold text-primary-foreground">Return to the shelf</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-7 sm:px-6 sm:pt-10">
      <Link href="/shop" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Back to the shelf</Link>
      <div className="mt-7 max-w-2xl">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">Payment follow-up</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Tell me where to find your payment.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">You’ve paid through an external provider. Share the reference below so I can review it personally and send the right file to your inbox.</p>
      </div>
      <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_18rem]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3 border-b border-border pb-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="h-4 w-4" /></span>
              <div><p className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">One small note</p><h2 className="mt-1 text-xl font-extrabold">Your delivery details</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Use the inbox where you’d like the actual ebook attachment.</p></div>
            </div>
            <div className="mt-6 space-y-5">
              <label className="block"><span className="mb-2 block text-xs font-bold">Buyer email</span><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className={fieldClass} /></label>
              <label className="block"><span className="mb-2 block text-xs font-bold">Book</span><select required value={bookId} onChange={(event) => setBookId(event.target.value)} className={fieldClass}><option value="">Choose the title you paid for</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
              <fieldset><legend className="mb-2 block text-xs font-bold">Payment method</legend><div className="grid gap-3 sm:grid-cols-2">{(["paystack", "payoneer"] as const).map((option) => <label key={option} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-bold transition-colors ${method === option ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}><input type="radio" name="paymentMethod" value={option} checked={method === option} onChange={() => setMethod(option)} className="accent-[hsl(var(--primary))]" />{option === "paystack" ? "Paystack" : "Payoneer"}</label>)}</div></fieldset>
              <label className="block"><span className="mb-2 block text-xs font-bold">Payment reference or transaction ID</span><input required minLength={1} maxLength={160} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Paste the reference exactly as shown" className={fieldClass} /></label>
            </div>
          </section>
          {submitPayment.error && <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-destructive"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p className="text-sm leading-6">We couldn’t submit that reference. Check the details and try again.</p></div>}
          <button type="submit" disabled={submitPayment.isPending || booksQuery.isLoading} className="flex h-14 w-full items-center justify-center rounded-xl bg-primary text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{submitPayment.isPending ? "Sending for review…" : "Send payment reference"}</button>
          <p className="flex justify-center gap-2 text-center text-[0.68rem] leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Pending review by the librarian · no automatic payment claim</p>
        </form>
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-32">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.15em] text-primary">What happens next</p>
          {selectedBook ? <><BookCover book={selectedBook} className="mx-auto mt-5 aspect-[0.69] max-w-[9rem]" /><h2 className="mt-4 text-center text-lg font-extrabold">{selectedBook.title}</h2></> : <div className="mt-5 rounded-xl bg-secondary/70 p-4 text-sm leading-6 text-muted-foreground">Choose your book and payment provider details. Your reference helps us match the payment to the right title.</div>}
          <ol className="mt-5 space-y-4 border-t border-border pt-5 text-xs leading-5 text-muted-foreground"><li><span className="mr-2 font-extrabold text-primary">01</span> We receive your reference.</li><li><span className="mr-2 font-extrabold text-primary">02</span> The librarian reviews the payment manually.</li><li><span className="mr-2 font-extrabold text-primary">03</span> Your ebook arrives by email after confirmation.</li></ol>
        </aside>
      </div>
    </main>
  )
}