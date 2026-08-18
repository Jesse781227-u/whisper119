import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { desc, eq, or, sql } from "drizzle-orm";
import {
  ConfirmAdminOrderParams,
  ConfirmAdminOrderResponse,
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
} from "@workspace/api-zod";
import { analyticsEventsTable, booksTable, db, ordersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { getOrderById, orderResponse, publicBook } from "../lib/bookstore";
import { confirmManualOrder } from "../lib/delivery";
import { initializePaystack } from "../lib/payments";

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
    totalRevenue: sql<number>`coalesce(sum(${ordersTable.subtotal}), 0)`,
  }).from(ordersTable).where(or(eq(ordersTable.status, "paid"), eq(ordersTable.status, "fulfilled")));
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
    totalRevenue: Number(sales?.totalRevenue ?? 0),
    recentOrders: recent.filter((order): order is NonNullable<typeof order> => Boolean(order)),
  }));
});

router.get("/admin/books", async (_req, res): Promise<void> => {
  const books = await db.select().from(booksTable).orderBy(desc(booksTable.createdAt));
  res.json(ListAdminBooksResponse.parse(books.map(publicBook)));
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
    const [book] = await db.insert(booksTable).values({
      id: randomUUID(),
      ...parsed.data,
      priceNgn: parsed.data.priceNgn,
      fileObjectPath: parsed.data.fileObjectPath,
      publishedAt: new Date(parsed.data.publishedAt),
    }).returning();
    if (!book) {
      req.log.error("Admin book creation returned no inserted row");
      res.status(500).json({ error: "The book could not be added to the catalogue." });
      return;
    }
    res.status(201).json(CreateBookResponse.parse(publicBook(book)));
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
  const [book] = await db.update(booksTable).set({
    ...parsed.data,
    publishedAt: parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : undefined,
  }).where(eq(booksTable.id, params.data.bookId)).returning();
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }
  res.json(UpdateBookResponse.parse(publicBook(book)));
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

router.post("/admin/orders/:orderId/confirm", async (req, res): Promise<void> => {
  const parsed = ConfirmAdminOrderParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await confirmManualOrder(parsed.data.orderId);
    if (!result) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(ConfirmAdminOrderResponse.parse(orderResponse(result.order, result.items)));
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_PENDING") {
      res.status(409).json({ error: "Only pending orders can be confirmed." });
      return;
    }
    req.log.error({ err: error, orderId: parsed.data.orderId }, "Admin order confirmation failed");
    res.status(503).json({ error: "The order could not be confirmed. Please try again." });
  }
});

export default router;
