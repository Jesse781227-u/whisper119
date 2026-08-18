import { ArrowRight, Globe2, Mail } from "lucide-react"
import { Link } from "wouter"

export default function About() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24">
      <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
        <div>
          <p className="rule-label">A little about me</p>
          <h1 className="mt-5 max-w-md font-display text-5xl leading-[0.98] sm:text-6xl">These are the books I want to share with you.</h1>
          <div className="mt-10 border-l-2 border-primary pl-5">
            <p className="font-display text-xl leading-8">“These books are mine. I made them because I had something I wanted to say, and I hope they find the right readers.”</p>
            <p className="mt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">— From the author</p>
          </div>
        </div>
        <div className="max-w-2xl">
         <div className="space-y-6 text-lg leading-8 text-muted-foreground">
  <p><strong>A little about me</strong></p>
  <p>These stories chose me before I chose them.</p>
  <p>I am Whisper 119. I write the kind of stories that keep you up at night because you cannot put them down — and wake you up in the morning because you cannot stop thinking about them.</p>
  <p>Every alpha, every second chance, every forbidden love, every woman who rises from the ashes — I wrote them because something in me needed to. And somewhere along the way, over 8 million plus readers found them and felt the same thing I felt when the words first came.</p>
  <p>These books are mine. Completely. And when you buy one here, it becomes completely yours — no coins, no paywalls, no waiting for the next chapter. Just the full story, in your hands, forever.</p>
  <p>Welcome to my world.</p>
  <p>I write alphas who are possessive and broken. Women who are stronger than they know. Love that burns everything else down. Worlds where the rules are different and the stakes are everything.</p>
  <p>If you have read me on JoyRead, Dreame or GoodNovel — welcome home. Here you get the complete story, yours to keep, no limits.</p>
  <p>If you are finding me for the first time — I hope you are ready. My stories have a way of staying with you long after the last page.</p>
</div>
          <div className="mt-14 grid gap-6 border-y border-border/70 py-8 sm:grid-cols-3">
            <div><Mail className="h-5 w-5 text-primary" strokeWidth={1.4} /><p className="mt-4 font-display text-lg">I’ll email your book</p><p className="mt-1 text-sm leading-6 text-muted-foreground">You’ll get the PDF or EPUB as a real attachment after payment.</p></div>
            <div><Globe2 className="h-5 w-5 text-primary" strokeWidth={1.4} /><p className="mt-4 font-display text-lg">Read anywhere</p><p className="mt-1 text-sm leading-6 text-muted-foreground">I made this shop for readers wherever they are.</p></div>
            <div><p className="text-2xl font-extrabold text-primary"></p><p className="mt-4 font-display text-lg">It’s yours to keep</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Read your copy on your terms.</p></div>
          </div>
          <Link href="/shop" className="mt-10 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-mono text-[0.68rem] uppercase tracking-[0.13em] text-primary-foreground">See my books <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </main>
  )
}