import type { Book } from "@workspace/api-client-react"

// Presentation fallback only. The API remains the source of truth for inventory,
// prices and files; this prevents a transient/empty catalogue from rendering a
// blank storefront while the database is being provisioned or recovered.
export const FALLBACK_BOOKS: Book[] = [
  ["the-quiet-map", "The Quiet Map", "Mara Bell", "Fiction", 8.99, "cover-1.jpg"],
  ["silence-between-stars", "The Silence Between Stars", "Iris Vale", "Science Fiction", 11.99, "cover-2.jpg"],
  ["beyond-the-horizon", "Beyond the Horizon", "Eli Winters", "Adventure", 7.99, "cover-3.jpg"],
  ["small-weather", "Small Weather", "Nina March", "Poetry", 6.99, "cover-4.jpg"],
  ["house-made-of-light", "A House Made of Light", "June Arlen", "Fiction", 9.49, "cover-1.jpg"],
  ["last-lantern", "The Last Lantern", "Owen Hart", "Mystery", 10.99, "cover-2.jpg"],
  ["night-train", "Notes from the Night Train", "Sana Cole", "Travel", 8.49, "cover-3.jpg"],
  ["slower-day", "The Art of a Slower Day", "Rowan Pierce", "Wellbeing", 12.99, "cover-4.jpg"],
].map(([slug, title, author, category, price, cover], index) => ({
  id: `fallback-${slug}`, slug: String(slug), title: String(title), titleGroupId: `fallback-${slug}`,
  language: "en", author: String(author), price: Number(price), priceNgn: 0, currency: "USD",
  categories: [String(category)], isCompleted: false,
  description: "A sample catalogue entry shown while the live catalogue is unavailable.",
  format: index % 2 ? "PDF" : "EPUB", paystackLink: null, payoneerLink: null,
  coverUrl: `/covers/${String(cover)}`, fileName: `${String(slug)}.epub`, featured: index < 4,
  publishedAt: new Date(Date.UTC(2026, 6, 28 - index)).toISOString(), createdAt: new Date(Date.UTC(2026, 6, 28 - index)).toISOString(),
})) as Book[]

export const FALLBACK_CATEGORIES = Array.from(new Set(FALLBACK_BOOKS.flatMap((book) => book.categories)))
  .sort().map((name, index) => ({ id: `fallback-category-${index}`, name, count: FALLBACK_BOOKS.filter((book) => book.categories.includes(name)).length, featured: index < 4 }))
