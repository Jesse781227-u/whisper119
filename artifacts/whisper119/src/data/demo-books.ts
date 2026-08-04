import type { Book } from "@workspace/api-client-react"

export const DEMO_BOOKS: Book[] = [
  {
    id: "demo-book-01", slug: "the-quiet-map", title: "The Quiet Map", author: "Mara Bell",
    price: 8.99, currency: "USD", category: "Fiction",
    description: "A tender story about belonging, second chances, and the places we carry with us.",
    format: "EPUB", coverUrl: "/covers/cover-1.jpg", fileName: "the-quiet-map.epub", featured: true,
    publishedAt: "2026-07-28T09:00:00.000Z", createdAt: "2026-07-28T09:00:00.000Z",
  },
  {
    id: "demo-book-02", slug: "the-silence-between-stars", title: "The Silence Between Stars", author: "Iris Vale",
    price: 11.99, currency: "USD", category: "Science Fiction",
    description: "A thoughtful, atmospheric novel about distance, wonder, and what we choose to answer.",
    format: "PDF", coverUrl: "/covers/cover-2.jpg", fileName: "the-silence-between-stars.pdf", featured: true,
    publishedAt: "2026-07-25T09:00:00.000Z", createdAt: "2026-07-25T09:00:00.000Z",
  },
  {
    id: "demo-book-03", slug: "beyond-the-horizon", title: "Beyond the Horizon", author: "Eli Winters",
    price: 7.99, currency: "USD", category: "Adventure",
    description: "Three friends follow a half-finished journal across islands missing from every chart.",
    format: "EPUB", coverUrl: "/covers/cover-3.jpg", fileName: "beyond-the-horizon.epub", featured: true,
    publishedAt: "2026-07-22T09:00:00.000Z", createdAt: "2026-07-22T09:00:00.000Z",
  },
  {
    id: "demo-book-04", slug: "small-weather", title: "Small Weather", author: "Nina March",
    price: 6.99, currency: "USD", category: "Poetry",
    description: "Small poems for ordinary days, kitchen light, summer rain, and starting over.",
    format: "PDF", coverUrl: "/covers/cover-4.jpg", fileName: "small-weather.pdf", featured: true,
    publishedAt: "2026-07-19T09:00:00.000Z", createdAt: "2026-07-19T09:00:00.000Z",
  },
  {
    id: "demo-book-05", slug: "a-house-made-of-light", title: "A House Made of Light", author: "June Arlen",
    price: 9.49, currency: "USD", category: "Fiction",
    description: "An architect inherits a half-built house designed around somebody else's expected life.",
    format: "EPUB", coverUrl: "/covers/cover-1.jpg", fileName: "a-house-made-of-light.epub", featured: false,
    publishedAt: "2026-07-16T09:00:00.000Z", createdAt: "2026-07-16T09:00:00.000Z",
  },
  {
    id: "demo-book-06", slug: "the-last-lantern", title: "The Last Lantern", author: "Owen Hart",
    price: 10.99, currency: "USD", category: "Mystery",
    description: "A lighthouse keeper finds a sealed letter inside a lantern that has not been lit in forty years.",
    format: "PDF", coverUrl: "/covers/cover-2.jpg", fileName: "the-last-lantern.pdf", featured: false,
    publishedAt: "2026-07-13T09:00:00.000Z", createdAt: "2026-07-13T09:00:00.000Z",
  },
  {
    id: "demo-book-07", slug: "notes-from-the-night-train", title: "Notes from the Night Train", author: "Sana Cole",
    price: 8.49, currency: "USD", category: "Travel",
    description: "A lyrical travel journal made from conversations overheard between midnight stations.",
    format: "EPUB", coverUrl: "/covers/cover-3.jpg", fileName: "notes-from-the-night-train.epub", featured: false,
    publishedAt: "2026-07-10T09:00:00.000Z", createdAt: "2026-07-10T09:00:00.000Z",
  },
  {
    id: "demo-book-08", slug: "the-art-of-a-slower-day", title: "The Art of a Slower Day", author: "Rowan Pierce",
    price: 12.99, currency: "USD", category: "Wellbeing",
    description: "A gentle guide to making space for attention, rest, and rituals that feel like your own.",
    format: "PDF", coverUrl: "/covers/cover-4.jpg", fileName: "the-art-of-a-slower-day.pdf", featured: false,
    publishedAt: "2026-07-07T09:00:00.000Z", createdAt: "2026-07-07T09:00:00.000Z",
  },
  {
    id: "demo-book-09", slug: "the-ocean-in-the-library", title: "The Ocean in the Library", author: "Tessa North",
    price: 7.49, currency: "USD", category: "Fiction",
    description: "A night librarian notices that one shelf smells faintly of saltwater, and then the stories change.",
    format: "EPUB", coverUrl: "/covers/cover-1.jpg", fileName: "the-ocean-in-the-library.epub", featured: false,
    publishedAt: "2026-07-04T09:00:00.000Z", createdAt: "2026-07-04T09:00:00.000Z",
  },
  {
    id: "demo-book-10", slug: "after-the-blue-hour", title: "After the Blue Hour", author: "Mina Sol",
    price: 9.99, currency: "USD", category: "Fiction",
    description: "Four neighbors meet every evening at the edge of a changing city.",
    format: "PDF", coverUrl: "/covers/cover-2.jpg", fileName: "after-the-blue-hour.pdf", featured: false,
    publishedAt: "2026-07-01T09:00:00.000Z", createdAt: "2026-07-01T09:00:00.000Z",
  },
  {
    id: "demo-book-11", slug: "orbit-of-ordinary-things", title: "Orbit of Ordinary Things", author: "Caleb Reed",
    price: 13.49, currency: "USD", category: "Science Fiction",
    description: "A salvage pilot discovers that one lost object is still waiting for its owner.",
    format: "EPUB", coverUrl: "/covers/cover-3.jpg", fileName: "orbit-of-ordinary-things.epub", featured: false,
    publishedAt: "2026-06-28T09:00:00.000Z", createdAt: "2026-06-28T09:00:00.000Z",
  },
  {
    id: "demo-book-12", slug: "the-garden-at-low-tide", title: "The Garden at Low Tide", author: "Amelia Fox",
    price: 8.99, currency: "USD", category: "Mystery",
    description: "Every low tide reveals a new row of flowers beneath the cliffs.",
    format: "PDF", coverUrl: "/covers/cover-4.jpg", fileName: "the-garden-at-low-tide.pdf", featured: false,
    publishedAt: "2026-06-25T09:00:00.000Z", createdAt: "2026-06-25T09:00:00.000Z",
  },
  {
    id: "demo-book-13", slug: "field-notes-for-the-curious", title: "Field Notes for the Curious", author: "Lena Moss",
    price: 6.49, currency: "USD", category: "Travel",
    description: "Prompts for noticing more: local food, unexpected histories, and generous strangers.",
    format: "EPUB", coverUrl: "/covers/cover-1.jpg", fileName: "field-notes-for-the-curious.epub", featured: false,
    publishedAt: "2026-06-22T09:00:00.000Z", createdAt: "2026-06-22T09:00:00.000Z",
  },
  {
    id: "demo-book-14", slug: "a-practical-kindness", title: "A Practical Kindness", author: "Dara Kim",
    price: 10.49, currency: "USD", category: "Wellbeing",
    description: "Small, specific ways to make relationships, workdays, and communities more humane.",
    format: "PDF", coverUrl: "/covers/cover-2.jpg", fileName: "a-practical-kindness.pdf", featured: false,
    publishedAt: "2026-06-19T09:00:00.000Z", createdAt: "2026-06-19T09:00:00.000Z",
  },
  {
    id: "demo-book-15", slug: "the-moon-in-the-teacup", title: "The Moon in the Teacup", author: "Faye Linden",
    price: 7.99, currency: "USD", category: "Poetry",
    description: "Poems about domestic wonder, inherited stories, and silver moments after dark.",
    format: "EPUB", coverUrl: "/covers/cover-3.jpg", fileName: "the-moon-in-the-teacup.epub", featured: false,
    publishedAt: "2026-06-16T09:00:00.000Z", createdAt: "2026-06-16T09:00:00.000Z",
  },
  {
    id: "demo-book-16", slug: "the-vanishing-platform", title: "The Vanishing Platform", author: "Jon Bell",
    price: 9.49, currency: "USD", category: "Mystery",
    description: "A commuter steps off the train at a platform missing from every timetable.",
    format: "PDF", coverUrl: "/covers/cover-4.jpg", fileName: "the-vanishing-platform.pdf", featured: false,
    publishedAt: "2026-06-13T09:00:00.000Z", createdAt: "2026-06-13T09:00:00.000Z",
  },
  {
    id: "demo-book-17", slug: "a-short-history-of-faraway", title: "A Short History of Faraway", author: "Milo Grant",
    price: 11.49, currency: "USD", category: "Adventure",
    description: "A young historian follows impossible postcards through deserts, ports, and mountain passes.",
    format: "EPUB", coverUrl: "/covers/cover-1.jpg", fileName: "a-short-history-of-faraway.epub", featured: false,
    publishedAt: "2026-06-10T09:00:00.000Z", createdAt: "2026-06-10T09:00:00.000Z",
  },
  {
    id: "demo-book-18", slug: "the-maps-we-make", title: "The Maps We Make", author: "Priya Sen",
    price: 8.49, currency: "USD", category: "Fiction",
    description: "Two siblings inherit unfinished maps and revisit the landscape of a family story.",
    format: "PDF", coverUrl: "/covers/cover-2.jpg", fileName: "the-maps-we-make.pdf", featured: false,
    publishedAt: "2026-06-07T09:00:00.000Z", createdAt: "2026-06-07T09:00:00.000Z",
  },
  {
    id: "demo-book-19", slug: "signals-from-the-deep", title: "Signals from the Deep", author: "Theo March",
    price: 12.49, currency: "USD", category: "Science Fiction",
    description: "A deep-sea engineer receives a repeating signal below the ocean floor.",
    format: "EPUB", coverUrl: "/covers/cover-3.jpg", fileName: "signals-from-the-deep.epub", featured: false,
    publishedAt: "2026-06-04T09:00:00.000Z", createdAt: "2026-06-04T09:00:00.000Z",
  },
  {
    id: "demo-book-20", slug: "the-long-way-home", title: "The Long Way Home", author: "Rae Okafor",
    price: 7.49, currency: "USD", category: "Travel",
    description: "A warm account of taking the scenic route through unfamiliar countries.",
    format: "PDF", coverUrl: "/covers/cover-4.jpg", fileName: "the-long-way-home.pdf", featured: false,
    publishedAt: "2026-06-01T09:00:00.000Z", createdAt: "2026-06-01T09:00:00.000Z",
  },
  {
    id: "demo-book-21", slug: "the-brightest-room", title: "The Brightest Room", author: "Clara West",
    price: 9.99, currency: "USD", category: "Wellbeing",
    description: "An inviting guide to building a personal reset space with more compassion.",
    format: "EPUB", coverUrl: "/covers/cover-1.jpg", fileName: "the-brightest-room.epub", featured: false,
    publishedAt: "2026-05-29T09:00:00.000Z", createdAt: "2026-05-29T09:00:00.000Z",
  },
  {
    id: "demo-book-22", slug: "weather-for-beginners", title: "Weather for Beginners", author: "Nico Avery",
    price: 6.99, currency: "USD", category: "Poetry",
    description: "A playful collection about storms, forecasts, seasons, and emotional weather.",
    format: "PDF", coverUrl: "/covers/cover-2.jpg", fileName: "weather-for-beginners.pdf", featured: false,
    publishedAt: "2026-05-26T09:00:00.000Z", createdAt: "2026-05-26T09:00:00.000Z",
  },
  {
    id: "demo-book-23", slug: "the-compass-room", title: "The Compass Room", author: "Ada Finch",
    price: 10.99, currency: "USD", category: "Adventure",
    description: "An old hotel has a room that always points north.",
    format: "EPUB", coverUrl: "/covers/cover-3.jpg", fileName: "the-compass-room.epub", featured: false,
    publishedAt: "2026-05-23T09:00:00.000Z", createdAt: "2026-05-23T09:00:00.000Z",
  },
  {
    id: "demo-book-24", slug: "the-gold-thread", title: "The Gold Thread", author: "Elian Rose",
    price: 8.99, currency: "USD", category: "Fiction",
    description: "A tailor traces a golden thread through the lives of everyone who wore a coat.",
    format: "PDF", coverUrl: "/covers/cover-4.jpg", fileName: "the-gold-thread.pdf", featured: false,
    publishedAt: "2026-05-20T09:00:00.000Z", createdAt: "2026-05-20T09:00:00.000Z",
  },
  {
    id: "demo-book-25", slug: "the-lantern-keepers-daughter", title: "The Lantern Keeper's Daughter", author: "Mara Bell",
    price: 8.49, currency: "USD", category: "Fiction",
    description: "A daughter returns to a remote island to close her father's lighthouse.",
    format: "PDF", coverUrl: "/covers/cover-1.jpg", fileName: "the-lantern-keepers-daughter.pdf", featured: false,
    publishedAt: "2026-05-17T09:00:00.000Z", createdAt: "2026-05-17T09:00:00.000Z",
  },
  {
    id: "demo-book-26", slug: "a-memory-of-europa", title: "A Memory of Europa", author: "Iris Vale",
    price: 10.49, currency: "USD", category: "Science Fiction",
    description: "A mission historian reconstructs the last day of a lost expedition.",
    format: "EPUB", coverUrl: "/covers/cover-2.jpg", fileName: "a-memory-of-europa.epub", featured: false,
    publishedAt: "2026-05-14T09:00:00.000Z", createdAt: "2026-05-14T09:00:00.000Z",
  },
  {
    id: "demo-book-27", slug: "the-river-road-atlas", title: "The River Road Atlas", author: "Eli Winters",
    price: 9.49, currency: "USD", category: "Adventure",
    description: "A retired guide and a young mapmaker follow a river from spring to sea.",
    format: "PDF", coverUrl: "/covers/cover-3.jpg", fileName: "the-river-road-atlas.pdf", featured: false,
    publishedAt: "2026-05-11T09:00:00.000Z", createdAt: "2026-05-11T09:00:00.000Z",
  },
  {
    id: "demo-book-28", slug: "how-to-hold-a-morning", title: "How to Hold a Morning", author: "Nina March",
    price: 6.49, currency: "USD", category: "Poetry",
    description: "Short poems for beginnings, unfinished tea, early trains, and brave hours.",
    format: "EPUB", coverUrl: "/covers/cover-4.jpg", fileName: "how-to-hold-a-morning.epub", featured: false,
    publishedAt: "2026-05-08T09:00:00.000Z", createdAt: "2026-05-08T09:00:00.000Z",
  },
  {
    id: "demo-book-29", slug: "the-missing-hour", title: "The Missing Hour", author: "Owen Hart",
    price: 8.99, currency: "USD", category: "Mystery",
    description: "Every clock in a small hotel loses the same sixty minutes.",
    format: "PDF", coverUrl: "/covers/cover-1.jpg", fileName: "the-missing-hour.pdf", featured: false,
    publishedAt: "2026-05-05T09:00:00.000Z", createdAt: "2026-05-05T09:00:00.000Z",
  },
  {
    id: "demo-book-30", slug: "cities-by-candlelight", title: "Cities by Candlelight", author: "Sana Cole",
    price: 9.99, currency: "USD", category: "Travel",
    description: "Night walks through six cities, told through food stalls, museums, and local legends.",
    format: "EPUB", coverUrl: "/covers/cover-2.jpg", fileName: "cities-by-candlelight.epub", featured: false,
    publishedAt: "2026-05-02T09:00:00.000Z", createdAt: "2026-05-02T09:00:00.000Z",
  },
]

export const DEMO_CATEGORIES = Array.from(new Set(DEMO_BOOKS.map((book) => book.category)))
  .sort()
  .map((name) => ({ name, count: DEMO_BOOKS.filter((book) => book.category === name).length }))

export function filterDemoBooks(filters: {
  search?: string
  category?: string
  format?: "PDF" | "EPUB"
  maxPrice?: number
}) {
  const search = filters.search?.trim().toLowerCase()
  return DEMO_BOOKS.filter((book) => (
    (!search || `${book.title} ${book.author}`.toLowerCase().includes(search)) &&
    (!filters.category || book.category === filters.category) &&
    (!filters.format || book.format === filters.format) &&
    (filters.maxPrice === undefined || book.price <= filters.maxPrice)
  ))
}