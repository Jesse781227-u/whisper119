import { Router, type IRouter } from "express";
import { GetBookParams, GetBookResponse, GetStorefrontSummaryResponse, ListBooksQueryParams, ListBooksResponse } from "@workspace/api-zod";
import { count, desc, eq, sql } from "drizzle-orm";
import { booksTable, db } from "@workspace/db";
import { findBooks, publicBook } from "../lib/bookstore";

const router: IRouter = Router();

router.get("/books", async (req, res): Promise<void> => {
  const parsed = ListBooksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const books = await findBooks(parsed.data);
  res.json(ListBooksResponse.parse(books.map(publicBook)));
});

router.get("/books/:bookId", async (req, res): Promise<void> => {
  const parsed = GetBookParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, parsed.data.bookId));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  res.json(GetBookResponse.parse(publicBook(book)));
});

router.get("/storefront/summary", async (_req, res): Promise<void> => {
  const [featured, newArrivals, categories] = await Promise.all([
    db.select().from(booksTable).where(eq(booksTable.featured, true)).orderBy(desc(booksTable.publishedAt)).limit(4),
    db.select().from(booksTable).orderBy(desc(booksTable.publishedAt)).limit(6),
    db.select({ name: sql<string>`unnest(${booksTable.categories})`, count: count() }).from(booksTable).groupBy(sql`unnest(${booksTable.categories})`).orderBy(sql`unnest(${booksTable.categories})`),
  ]);
  res.json(GetStorefrontSummaryResponse.parse({
    featured: featured.map(publicBook),
    newArrivals: newArrivals.map(publicBook),
    categories: categories.map((category) => ({ name: category.name, count: Number(category.count) })),
  }));
});

export default router;