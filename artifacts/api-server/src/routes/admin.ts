import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { desc, eq, or, sql } from "drizzle-orm";
import {
  GetAdminDashboardResponse,
  GetAdminOrderParams,
  GetAdminOrderResponse,
  GetAdminSessionResponse,
  ListAdminBooksResponse,
  ListAdminOrdersQueryParams,
  ListAdminOrdersResponse,
  CreateBookBody,
  CreateBookResponse,
  UpdateBookParams,
  UpdateBookBody,
  UpdateBookResponse,
  DeleteBookParams,
  ListCategoriesResponse, CreateCategoryBody, CreateCategoryResponse,
  UpdateCategoryParams, UpdateCategoryBody, UpdateCategoryResponse, DeleteCategoryParams,
} from "@workspace/api-zod";
import { analyticsEventsTable, bookCategoriesTable, booksTable, categoriesTable, db, languageRequestsTable, ordersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { getOrderById, orderResponse, publicBook, publicBooks, replaceBookCategories } from "../lib/bookstore";

const router: IRouter = Router();

function validateExternalLink(link: string | null | undefined): string | null | undefined {
  if (link === undefined || link === null || link.trim() === "") {
    return link === undefined ? undefined : null;
  }
  try {
    const url = new URL(link);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported protocol");
    return link;
  } catch {
    throw new Error("Payment links must be valid HTTP or HTTPS URLs.");
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: unknown }).code === "23505";
}

router.post("/admin/login", async (_req, res): Promise<void> => {
  res.status(410).json({ error: "Admin password login is disabled. Authenticate using Firebase and admin email access." });
});

router.use("/admin/dashboard", requireAdmin);
router.use("/admin/books", requireAdmin);
router.use("/admin/categories", requireAdmin);
router.use("/admin/orders", requireAdmin);
router.use("/storage/uploads", requireAdmin);

router.get("/admin/dashboard", async (_req, res): Promise<void> => {
  const [orders, books, [analytics]] = await Promise.all([
    db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)),
    db.select().from(booksTable),
    db.select({
      totalPageViews: sql<number>`count(*)`,
      uniqueVisitors: sql<number>`count(distinct ${analyticsEventsTable.visitorId})`,
    }).from(analyticsEventsTable).where(eq(analyticsEventsTable.eventType, "page_view")),
  ]);
  const [sales] = await db.select({
    paidOrders: sql<number>`count(*)`,
  }).from(ordersTable).where(or(eq(ordersTable.status, "paid"), eq(ordersTable.status, "fulfilled")));
  const revenueByCurrency = orders
    .filter((order) => order.status === "paid" || order.status === "fulfilled")
    .reduce((totals, order) => {
      if (order.currency === "USD" || order.currency === "NGN") totals[order.currency] += Number(order.subtotal);
      return totals;
    }, { USD: 0, NGN: 0 });
  const recent = await Promise.all(orders.slice(0, 8).map(async (order) => {
    const result = await getOrderById(order.id);
    return result ? orderResponse(result.order, result.items) : null;
  }));
  res.json(GetAdminDashboardResponse.parse({
    totalOrders: orders.length,
    pendingOrders: orders.filter((order) => order.status === "pending").length,
    totalBooks: books.length,
    totalPageViews: Number(analytics?.totalPageViews ?? 0),
    uniqueVisitors: Number(analytics?.uniqueVisitors ?? 0),
    paidOrders: Number(sales?.paidOrders ?? 0),
    revenueByCurrency,
    recentOrders: recent.filter((order): order is NonNullable<typeof order> => Boolean(order)),
  }));
});

router.get("/admin/books", async (_req, res): Promise<void> => {
  const books = await db.select().from(booksTable).orderBy(desc(booksTable.createdAt));
  res.json(ListAdminBooksResponse.parse(await publicBooks(books)));
});

router.get("/admin/language-requests", async (_req, res): Promise<void> => {
  const rows = await db.select({ id: languageRequestsTable.id, bookId: languageRequestsTable.bookId, bookTitle: booksTable.title, name: languageRequestsTable.name, country: languageRequestsTable.country, language: languageRequestsTable.language, createdAt: languageRequestsTable.createdAt })
    .from(languageRequestsTable).innerJoin(booksTable, eq(booksTable.id, languageRequestsTable.bookId)).orderBy(desc(languageRequestsTable.createdAt));
  res.json(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })));
});

router.get("/admin/categories", async (_req, res): Promise<void> => {
  const rows = await db.select({ id: categoriesTable.id, name: categoriesTable.name, featured: categoriesTable.featured, count: sql<number>`count(${bookCategoriesTable.bookId})` })
    .from(categoriesTable).leftJoin(bookCategoriesTable, eq(bookCategoriesTable.categoryId, categoriesTable.id)).groupBy(categoriesTable.id).orderBy(categoriesTable.name);
  res.json(ListCategoriesResponse.parse(rows.map(row => ({ ...row, count: Number(row.count) }))));
});

router.post("/admin/categories", async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [category] = await db.insert(categoriesTable).values({ id: randomUUID(), name: parsed.data.name.trim(), featured: parsed.data.featured ?? false }).returning();
    res.status(201).json(CreateCategoryResponse.parse({ ...category, count: 0 }));
  } catch (error) { res.status(isUniqueConstraintError(error) ? 409 : 500).json({ error: isUniqueConstraintError(error) ? "That category already exists." : "The category could not be created." }); }
});

router.patch("/admin/categories/:categoryId", async (req, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params); const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Invalid category update." }); return; }
  const [category] = await db.update(categoriesTable).set({ name: parsed.data.name.trim(), featured: parsed.data.featured }).where(eq(categoriesTable.id, params.data.categoryId)).returning();
  if (!category) { res.status(404).json({ error: "Category not found" }); return; }
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(bookCategoriesTable).where(eq(bookCategoriesTable.categoryId, category.id));
  res.json(UpdateCategoryResponse.parse({ ...category, count: Number(count) }));
});

router.delete("/admin/categories/:categoryId", async (req, res): Promise<void> => {
  const parsed = DeleteCategoryParams.safeParse(req.params); if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(bookCategoriesTable).where(eq(bookCategoriesTable.categoryId, parsed.data.categoryId));
  if (Number(count)) { res.status(409).json({ error: "Reassign this category before deleting it." }); return; }
  const deleted = await db.delete(categoriesTable).where(eq(categoriesTable.id, parsed.data.categoryId)).returning();
  if (!deleted.length) { res.status(404).json({ error: "Category not found" }); return; }
  res.status(204).send();
});

router.post("/admin/books", async (req, res): Promise<void> => {
  const parsed = CreateBookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    validateExternalLink(parsed.data.paystackLink);
    validateExternalLink(parsed.data.payoneerLink);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid payment link." });
    return;
  }
  try {
    const { categories, ...bookData } = parsed.data;
    const [book] = await db.insert(booksTable).values({
      id: randomUUID(),
      ...bookData,
      publishedAt: new Date(parsed.data.publishedAt),
    }).returning();
    if (!book) {
      req.log.error("Admin book creation returned no inserted row");
      res.status(500).json({ error: "The book could not be added to the catalogue." });
      return;
    }
    await replaceBookCategories(book.id, categories);
    res.status(201).json(CreateBookResponse.parse((await publicBooks([book]))[0]));
  } catch (error) {
    req.log.error({ err: error, slug: parsed.data.slug }, "Admin book creation failed");
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ error: "A book with this title already exists. Choose a different title." });
      return;
    }
    res.status(500).json({ error: "The book upload succeeded, but the catalogue record could not be saved. Please try again." });
  }
});

router.patch("/admin/books/:bookId", async (req, res): Promise<void> => {
  const params = UpdateBookParams.safeParse(req.params);
  const parsed = UpdateBookBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    validateExternalLink(parsed.data.paystackLink);
    validateExternalLink(parsed.data.payoneerLink);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid payment link." });
    return;
  }
  const { categories, ...bookData } = parsed.data;
  const [book] = await db.update(booksTable).set({
    ...bookData,
    publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : undefined,
  }).where(eq(booksTable.id, params.data.bookId)).returning();
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  if (categories) await replaceBookCategories(book.id, categories);
  res.json(UpdateBookResponse.parse((await publicBooks([book]))[0]));
});

router.delete("/admin/books/:bookId", async (req, res): Promise<void> => {
  const parsed = DeleteBookParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [book] = await db.delete(booksTable).where(eq(booksTable.id, parsed.data.bookId)).returning();
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  res.status(204).send();
});

router.get("/admin/orders", async (req, res): Promise<void> => {
  const parsed = ListAdminOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const orders = await db.select().from(ordersTable)
    .where(parsed.data.status ? eq(ordersTable.status, parsed.data.status) : undefined)
    .orderBy(desc(ordersTable.createdAt));
  const response = await Promise.all(orders.map(async (order) => {
    const result = await getOrderById(order.id);
    return result ? orderResponse(result.order, result.items) : null;
  }));
  res.json(ListAdminOrdersResponse.parse(response.filter((order): order is NonNullable<typeof order> => Boolean(order))));
});

router.get("/admin/orders/:orderId", async (req, res): Promise<void> => {
  const parsed = GetAdminOrderParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await getOrderById(parsed.data.orderId);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(GetAdminOrderResponse.parse(orderResponse(result.order, result.items)));
});

export default router;
