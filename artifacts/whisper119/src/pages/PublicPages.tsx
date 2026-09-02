import { Mail, MapPin, ShieldCheck } from "lucide-react"
import { Link } from "wouter"
import { useEffect, type ReactNode } from "react"

const EMAILS = ["anastasiaibeh67@gmail.com", "ibehanastasia726@gmail.com"]

function PageMeta({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = title
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement("meta")
      meta.setAttribute("name", "description")
      document.head.appendChild(meta)
    }
    meta.setAttribute("content", description)
  }, [title, description])
  return null
}

function PublicPage({ children, title, description, eyebrow = "Whisper 119" }: { children: ReactNode; title: string; description: string; eyebrow?: string }) {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
      <PageMeta title={title} description={description} />
      <div className="mx-auto max-w-3xl">
        <p className="rule-label text-primary">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-6xl">{title.split(" | ")[0]}</h1>
        {children}
      </div>
    </main>
  )
}

function PolicyPage({ title, description, effectiveDate, children }: { title: string; description: string; effectiveDate?: string; children: ReactNode }) {
  return (
    <PublicPage title={`${title} | Whisper 119`} description={description}>
      <article className="mt-10 rounded-3xl border border-border/80 bg-card/80 p-6 shadow-2xl shadow-black/10 sm:p-10">
        {effectiveDate && <p className="mb-8 text-xs font-bold uppercase tracking-[0.14em] text-primary">Effective date: {effectiveDate}</p>}
        <div className="prose prose-invert max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-h2:mt-9 prose-h2:text-xl prose-h2:text-foreground prose-p:leading-8 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
          {children}
        </div>
      </article>
      <PageLinks />
    </PublicPage>
  )
}

function PageLinks() {
  return <nav aria-label="Information pages" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-muted-foreground"><Link href="/about" className="hover:text-primary">About Us</Link><Link href="/contact" className="hover:text-primary">Contact</Link><Link href="/terms" className="hover:text-primary">Terms &amp; Conditions</Link><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link><Link href="/refunds" className="hover:text-primary">Refund Policy</Link></nav>
}

export function Terms() {
  return <PolicyPage title="Terms & Conditions" description="Terms and conditions for purchasing digital ebooks from Whisper 119." effectiveDate="1 September 2026">
    <p>These terms govern your purchase of digital products from Whisper 119, operated by Audrey Leilani Global Limited (RC 9270417).</p>
    <h2>1. Nature of the product</h2><p>All products sold on this website are digital downloads (ebook files in PDF and/or EPUB format), not physical products.</p><p>By completing a purchase, you confirm you understand you are buying a digital download, delivered by email after payment confirmation — not a physical item, and not shipped.</p>
    <h2>2. Delivery</h2><p>Digital products are delivered by email after payment confirmation.</p><p>It is the buyer&apos;s responsibility to provide an accurate email address at checkout.</p>
    <h2>3. All sales are final</h2><p>All sales are final once the ebook file has been delivered.</p><p>See the Refund Policy for the specific process if a file was not received.</p>
    <h2>4. Intellectual property</h2><p>Audrey Leilani Global Limited reserves all intellectual property rights to all content sold on this website.</p><p>Unauthorised reproduction or distribution of purchased content — including but not limited to copying, sharing, reselling, or publishing the file elsewhere — is prohibited.</p>
    <h2>5. Payment processing</h2><p>Payments are processed by Flutterwave and Paystack.</p><p>Whisper 119 does not directly collect or store your payment card details.</p>
    <h2>6. Governing law</h2><p>These terms are governed by the laws of Nigeria.</p>
    <h2>7. Contact</h2><p>Questions about these terms can be sent to the email address on the <Link href="/contact" className="text-primary hover:underline">Contact page</Link>.</p>
  </PolicyPage>
}

export function Privacy() {
  return <PolicyPage title="Privacy Policy" description="Privacy policy for Whisper 119 and how customer information is used." effectiveDate="1 September 2026">
    <p>Whisper 119, operated by Audrey Leilani Global Limited, collects your email address and name at checkout solely to deliver your purchased ebook and send order confirmation.</p>
    <h2>What we collect</h2><p>Name and email address, provided by you at checkout.</p>
    <h2>How we use it</h2><p>Solely to deliver your purchased ebook file and send your order confirmation/receipt.</p><p>We do not use this information for any other purpose without your consent.</p>
    <h2>What we don&apos;t do</h2><p>We do not sell your personal information to third parties.</p><p>We do not store payment card information — payment processing is handled securely by Flutterwave and Paystack, and your card details are entered directly with them, not with us.</p>
    <h2>Third-party processors</h2><p>Flutterwave and Paystack process payments on our behalf and handle your payment information according to their own privacy policies.</p>
    <h2>Your rights</h2><p>You may contact us at any time to request deletion of your data.</p><p>Requests can be sent to the email address on the <Link href="/contact" className="text-primary hover:underline">Contact page</Link>.</p>
    <h2>Changes to this policy</h2><p>This policy may be updated from time to time; the effective date above will be revised accordingly.</p>
  </PolicyPage>
}

export function Refunds() {
  return <PolicyPage title="Refund Policy" description="Refund and digital ebook delivery policy for Whisper 119.">
    <p>Due to the digital nature of our products, all sales are final once the ebook file has been delivered to your email.</p>
    <h2>If you didn&apos;t receive your file</h2><p>If you did not receive your file after payment, please contact us immediately at the email address on our <Link href="/contact" className="text-primary hover:underline">Contact page</Link> and we will resend your purchase within 24 hours.</p>
    <h2>If you were charged but received nothing</h2><p>If your payment was charged but no file was received, we will resolve this within 48 hours.</p>
    <h2>What “resolve” means</h2><p>If your payment was charged but no file was received, we will resend your purchased file — via whichever alternative means is convenient for you (for example, a different email address, or another delivery method you request) — within 48 hours.</p>
  </PolicyPage>
}

export function Contact() {
  return <PublicPage title="Contact Us | Whisper 119" description="Contact Whisper 119 and Audrey Leilani Global Limited." eyebrow="We’re here to help">
    <div className="mt-10 grid gap-5 sm:grid-cols-2">
      <section className="rounded-3xl border border-border bg-card/80 p-7 sm:p-8"><Mail className="h-6 w-6 text-primary" /><h2 className="mt-5 text-xl font-extrabold">Email</h2><div className="mt-4 grid gap-3">{EMAILS.map((email) => <a key={email} href={`mailto:${email}`} className="break-all text-sm font-semibold text-primary hover:underline">{email}</a>)}</div></section>
      <section className="rounded-3xl border border-border bg-card/80 p-7 sm:p-8"><MapPin className="h-6 w-6 text-primary" /><h2 className="mt-5 text-xl font-extrabold">Business</h2><p className="mt-4 font-semibold">Audrey Leilani Global Limited</p><p className="mt-1 text-sm text-muted-foreground">RC 9270417</p><p className="mt-4 text-sm leading-7 text-muted-foreground">Number 6 Unity Street, Off Location Road, Obigbo, Rivers State, Nigeria</p></section>
    </div>
    <div className="mt-6 rounded-3xl border border-primary/20 bg-primary/5 p-6 text-sm leading-7 text-muted-foreground"><ShieldCheck className="mb-3 h-5 w-5 text-primary" /><p>For questions about an order or a delivery, please email us using either address above. We&apos;ll be glad to help with your digital purchase.</p></div>
    <PageLinks />
  </PublicPage>
}
