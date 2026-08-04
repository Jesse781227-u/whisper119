import { ArrowRight, Globe2, Mail, Sparkles } from "lucide-react"
import { Link } from "wouter"

export default function About() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24">
      <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <div>
          <p className="rule-label">About the shop</p>
          <h1 className="mt-5 max-w-md font-display text-5xl leading-[0.98] sm:text-6xl">A small shop with a long reading list.</h1>
          <div className="mt-10 border-l-2 border-primary pl-5">
            <p className="font-display text-xl leading-8">“I read every title before it goes on the shelf. If it’s here, it’s because I’d press it into a friend’s hands.”</p>
            <p className="mt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">— The bookseller</p>
          </div>
        </div>
        <div className="max-w-2xl">
          <div className="space-y-6 text-lg leading-8 text-muted-foreground">
            <p>Whisper 119 is a one-person bookshop. There’s no warehouse, no algorithm and no recommendations engine — just a shelf of titles chosen carefully and sold as clean, DRM-free EPUB and PDF files.</p>
            <p>Every book listed here represents a deliberate choice. We look for literature in translation, small independent presses, and titles that deserve to be read slowly and kept forever.</p>
            <p>Because everything is digital, there is no waiting for shipping. Once payment clears, your files and receipt are sent to the inbox you entered at checkout as email attachments.</p>
            <p>We believe you should own the books you buy. DRM locks you into specific ecosystems and devices. Our files are completely DRM-free, meaning you can read them anywhere, convert them for your e-reader, and keep a personal archive.</p>
          </div>
          <div className="mt-14 grid gap-6 border-y border-border/70 py-8 sm:grid-cols-3">
            <div><Mail className="h-5 w-5 text-primary" strokeWidth={1.4} /><p className="mt-4 font-display text-lg">Inbox delivery</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Actual PDF and EPUB attachments after payment.</p></div>
            <div><Globe2 className="h-5 w-5 text-primary" strokeWidth={1.4} /><p className="mt-4 font-display text-lg">Worldwide</p><p className="mt-1 text-sm leading-6 text-muted-foreground">A small shop open to readers everywhere.</p></div>
            <div><Sparkles className="h-5 w-5 text-primary" strokeWidth={1.4} /><p className="mt-4 font-display text-lg">DRM-free</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Keep your files and read on your own terms.</p></div>
          </div>
          <Link href="/shop" className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-mono text-[0.68rem] uppercase tracking-[0.13em] text-primary-foreground">Browse the shop <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </main>
  )
}