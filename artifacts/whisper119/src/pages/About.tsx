import { ArrowRight, BookOpen, Mail } from "lucide-react"
import { Link } from "wouter"
import { useEffect } from "react"

export default function About() {
  useEffect(() => {
    document.title = "About Us | Whisper 119"
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "description"); document.head.appendChild(meta) }
    meta.setAttribute("content", "Learn more about Whisper 119 and Audrey Leilani Global Limited.")
  }, [])

  return <main className="mx-auto max-w-5xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
      <div><p className="rule-label text-primary">The Whisper 119 bookshelf</p><h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-6xl">About Us</h1><div className="mt-8 rounded-3xl border border-primary/20 bg-primary/5 p-6"><BookOpen className="h-7 w-7 text-primary" /><p className="mt-5 font-display text-xl leading-8">Completed stories, delivered straight to your inbox.</p></div></div>
      <div className="rounded-3xl border border-border bg-card/80 p-6 sm:p-10"><div className="space-y-6 text-base leading-8 text-muted-foreground sm:text-lg">
        <p><strong className="text-foreground">Whisper 119 is the author brand of Audrey Leilani Global Limited, a registered Nigerian publishing company (RC 9270417).</strong></p>
        <p>We create and sell serialized romance fiction, including:</p>
        <ul className="list-disc space-y-2 pl-6"><li>Werewolf romance</li><li>Dark romance</li><li>Paranormal romance</li><li>Billionaire romance</li></ul>
        <p>Our stories have been read by over <strong className="text-foreground">225,000 readers across multiple countries</strong> and translated into multiple languages.</p>
        <p>All books sold on this website are completed series, available as <strong className="text-foreground">PDF and EPUB digital downloads</strong>, delivered straight to your inbox.</p>
      </div><div className="mt-10 border-t border-border pt-7"><Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-mono text-[0.68rem] uppercase tracking-[0.13em] text-primary-foreground">Browse the books <ArrowRight className="h-4 w-4" /></Link><Link href="/contact" className="ml-4 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><Mail className="h-4 w-4" /> Contact us</Link></div></div>
    </div>
  </main>
}
