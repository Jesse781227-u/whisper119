import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { CreateLanguageRequestBody, CreateLanguageRequestResponse, GetBookParams, GetBookResponse, GetStorefrontSummaryResponse, ListBooksQueryParams, ListBooksResponse } from "@workspace/api-zod";
import { count, desc, eq } from "drizzle-orm";
import { bookCategoriesTable, booksTable, categoriesTable, db, languageRequestsTable } from "@workspace/db";
import { categoryNamesForBooks, findBooks, publicBook, publicBooks } from "../lib/bookstore";

const router: IRouter = Router();

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

router.get("/share/books/:bookId", async (req, res): Promise<void> => {
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, req.params.bookId));
  if (!book) {
    res.status(404).type("html").send("<!doctype html><title>Book not found</title><p>Book not found.</p>");
    return;
  }

  const publicBookData = publicBook(book, (await categoryNamesForBooks([book.id])).get(book.id) ?? []);
  const requestOrigin = `${req.protocol}://${req.get("host")}`;
  const cover = publicBookData.coverUrl ? new URL(publicBookData.coverUrl, requestOrigin).href : null;
  const redirectParam = typeof req.query.redirect === "string" ? req.query.redirect : "";
  const redirectUrl = /^https?:\/\//i.test(redirectParam) ? redirectParam : `${requestOrigin}/api/books/${book.id}`;
  const title = escapeHtml(publicBookData.title);
  const description = escapeHtml(publicBookData.description || `Discover ${publicBookData.title} by ${publicBookData.author}.`);
  const escapedRedirect = escapeHtml(redirectUrl);
  const imageTags = cover
    ? `<meta property="og:image" content="${escapeHtml(cover)}"><meta property="og:image:alt" content="${escapeHtml(`Cover of ${publicBookData.title}`)}"><meta name="twitter:image" content="${escapeHtml(cover)}">`
    : "";

  res.set("Cache-Control", "public, max-age=300");
  res.type("html").send(`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · Whisper 119</title>
<meta property="og:title" content="${title}"><meta property="og:description" content="${description}">
<meta property="og:type" content="book"><meta property="og:url" content="${escapedRedirect}">
<meta name="twitter:card" content="${cover ? "summary_large_image" : "summary"}"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}">
${imageTags}
<meta http-equiv="refresh" content="0;url=${escapedRedirect}">
</head><body><p>Opening <a href="${escapedRedirect}">${title}</a>…</p>
<script>window.location.replace(${JSON.stringify(redirectUrl).replace(/</g, "\\u003c")});</script></body></html>`);
});

router.get("/books", async (req, res): Promise<void> => {
  const parsed = ListBooksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const books = await findBooks(parsed.data);
  res.json(ListBooksResponse.parse(await publicBooks(books)));
});

router.post("/language-requests", async (req, res): Promise<void> => {
  const parsed = CreateLanguageRequestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, parsed.data.bookId));
  if (!book) { res.status(404).json({ error: "Book not found" }); return; }
  const [request] = await db.insert(languageRequestsTable).values({
    id: randomUUID(), bookId: book.id, name: parsed.data.name.trim(),
    country: parsed.data.country.trim(), language: parsed.data.language.trim(),
  }).returning();
  res.status(201).json(CreateLanguageRequestResponse.parse({
    id: request.id, bookId: book.id, bookTitle: book.title, name: request.name,
    country: request.country, language: request.language, createdAt: request.createdAt.toISOString(),
  }));
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
  res.json(GetBookResponse.parse((await publicBooks([book]))[0]));
});

router.get("/storefront/summary", async (_req, res): Promise<void> => {
  const [featured, newArrivals, categories] = await Promise.all([
    db.select().from(booksTable).where(eq(booksTable.featured, true)).orderBy(desc(booksTable.publishedAt)).limit(4),
    db.select().from(booksTable).orderBy(desc(booksTable.publishedAt)).limit(6),
    db.select({ id: categoriesTable.id, name: categoriesTable.name, featured: categoriesTable.featured, count: count(bookCategoriesTable.bookId) })
      .from(categoriesTable).leftJoin(bookCategoriesTable, eq(bookCategoriesTable.categoryId, categoriesTable.id))
      .groupBy(categoriesTable.id).orderBy(desc(count(bookCategoriesTable.bookId)), categoriesTable.name),
  ]);
  res.json(GetStorefrontSummaryResponse.parse({
    featured: await publicBooks(featured),
    newArrivals: await publicBooks(newArrivals),
    categories: categories.map((category) => ({ id: category.id, name: category.name, featured: category.featured, count: Number(category.count) })),
  }));
});

export default router;
