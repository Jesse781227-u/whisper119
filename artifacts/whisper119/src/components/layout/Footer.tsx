import { Link } from "wouter"

export function Footer() {
  return (
    <footer className="border-t py-12">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <h3 className="font-serif text-xl font-medium mb-4">Whisper 119</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            A small shop with a long reading list. Quiet, carefully chosen titles sold as clean, DRM-free EPUB and PDF files.
          </p>
        </div>
        <div>
          <h4 className="font-medium mb-4">Shop</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/shop" className="hover:text-foreground transition-colors">
                All Books
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-foreground transition-colors">
                About the Shop
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium mb-4">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/admin/login" className="hover:text-foreground transition-colors">
                Librarian Login
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center">
        <p>&copy; {new Date().getFullYear()} Whisper 119. All rights reserved.</p>
        <p className="mt-2 md:mt-0">Instant download upon purchase.</p>
      </div>
    </footer>
  )
}
