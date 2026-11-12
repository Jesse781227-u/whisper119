import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { CreateLanguageRequestBody, CreateLanguageRequestResponse, GetBookParams, GetBookResponse, GetBookSampleResponse, GetSeriesResponse, GetStorefrontSummaryQueryParams, GetStorefrontSummaryResponse, ListBooksQueryParams, ListBooksResponse, ListSeriesQueryParams, ListSeriesResponse } from "@workspace/api-zod";
import { and, count, desc, eq } from "drizzle-orm";
import { bookCategoriesTable, booksTable, categoriesTable, db, languageRequestsTable } from "@workspace/db";
import { categoryNamesForBooks, findBooks, isPublished, listSeriesWithBooks, publicBook, publicBooks, publicSeries } from "../lib/bookstore";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

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
    email: parsed.data.email?.trim().toLowerCase() || null,
  }).returning();
  res.status(201).json(CreateLanguageRequestResponse.parse({
    id: request.id, bookId: book.id, bookTitle: book.title, name: request.name,
    country: request.country, language: request.language, email: request.email, createdAt: request.createdAt.toISOString(),
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

router.get("/storefront/summary", async (req, res): Promise<void> => {
  const parsed = GetStorefrontSummaryQueryParams.safeParse(req.query);
  const language = parsed.success ? parsed.data.language : undefined;
  const visible = and(isPublished(), language ? eq(booksTable.language, language) : undefined);
  // Category counts use the same filter as the /books listing (published,
  // same language) so "Werewolf romance 12" opens a page with 12 books.
  const [featured, newArrivals, categories] = await Promise.all([
    db.select().from(booksTable).where(and(visible, eq(booksTable.featured, true))).orderBy(desc(booksTable.publishedAt)).limit(4),
    db.select().from(booksTable).where(visible).orderBy(desc(booksTable.publishedAt)).limit(12),
    db.select({ id: categoriesTable.id, name: categoriesTable.name, featured: categoriesTable.featured, count: count(booksTable.id) })
      .from(categoriesTable)
      .leftJoin(bookCategoriesTable, eq(bookCategoriesTable.categoryId, categoriesTable.id))
      .leftJoin(booksTable, and(eq(booksTable.id, bookCategoriesTable.bookId), visible))
      .groupBy(categoriesTable.id).orderBy(desc(count(booksTable.id)), categoriesTable.name),
  ]);
  res.json(GetStorefrontSummaryResponse.parse({
    featured: await publicBooks(featured),
    newArrivals: await publicBooks(newArrivals),
    categories: categories.map((category) => ({ id: category.id, name: category.name, featured: category.featured, count: Number(category.count) })),
  }));
});

router.get("/series", async (req, res): Promise<void> => {
  const parsed = ListSeriesQueryParams.safeParse(req.query);
  const rows = await listSeriesWithBooks(parsed.success ? parsed.data.language : undefined);
  res.json(ListSeriesResponse.parse(rows.filter((row) => row.volumes.length).map((row) => publicSeries(row.series, row.volumes))));
});

router.get("/series/:seriesSlug", async (req, res): Promise<void> => {
  const rows = await listSeriesWithBooks();
  const row = rows.find((candidate) => candidate.series.slug === req.params.seriesSlug);
  if (!row || !row.volumes.length) { res.status(404).json({ error: "Series not found" }); return; }
  res.json(GetSeriesResponse.parse({ series: publicSeries(row.series, row.volumes), books: await publicBooks(row.volumes) }));
});

router.get("/books/:bookId/sample", async (req, res): Promise<void> => {
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, req.params.bookId));
  if (!book || !(book.sampleText?.trim() || book.sampleObjectPath)) { res.status(404).json({ error: "This book has no free sample." }); return; }
  // Only the separate sample is exposed; the paid file path never leaves the server.
  res.json(GetBookSampleResponse.parse({
    bookId: book.id,
    title: book.title,
    text: book.sampleText?.trim() || null,
    pdfUrl: book.sampleObjectPath ? `/api/books/${book.id}/sample.pdf` : null,
  }));
});

router.get("/books/:bookId/sample.pdf", async (req, res): Promise<void> => {
  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, req.params.bookId));
  if (!book?.sampleObjectPath) { res.status(404).json({ error: "This book has no sample PDF." }); return; }
  try {
    const storage = new ObjectStorageService();
    const file = await storage.getObjectEntityFile(book.sampleObjectPath);
    const response = await storage.downloadObject(file, 3600);
    res.status(200);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("Content-Disposition", "inline");
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "Sample not found" }); return; }
    req.log.error({ err: error }, "Could not serve sample PDF");
    res.status(500).json({ error: "The sample could not be loaded." });
  }
});

export default router;
