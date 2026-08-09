import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
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
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { analyticsEventsTable, booksTable, db, ordersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { getOrderById, orderResponse, publicBook } from "../lib/bookstore";
import { initializePaystack } from "../lib/payments";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();

function validatePaymentLink(paymentLink: string | null | undefined): string | null | undefined {
  if (paymentLink === undefined || paymentLink === null || paymentLink.trim() === "") {
    return paymentLink === undefined ? undefined : null;
  }
  try {
    const url = new URL(paymentLink);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported protocol");
    return paymentLink;
  } catch {
    throw new Error("Payment link must be a valid HTTP or HTTPS URL.");
  }
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
  }).from(ordersTable).where(eq(ordersTable.status, "paid"));
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
    validatePaymentLink(parsed.data.paymentLink);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Invalid payment link." });
    return;
  }
  const [book] = await db.insert(booksTable).values({
    id: randomUUID(),
    ...parsed.data,
    priceNgn: parsed.data.priceNgn,
    fileObjectPath: parsed.data.fileObjectPath,
    publishedAt: new Date(parsed.data.publishedAt),
  }).returning();
  res.status(201).json(CreateBookResponse.parse(publicBook(book)));
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
    validatePaymentLink(parsed.data.paymentLink);
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

router.post("/storage/uploads/request-url", async (req, res): Promise<void> => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const storage = new ObjectStorageService();
    const uploadURL = await storage.getObjectEntityUploadURL();
    res.json(RequestUploadUrlResponse.parse({
      uploadURL,
      objectPath: storage.normalizeObjectEntityPath(uploadURL),
    }));
  } catch (error) {
    req.log.error({ err: error }, "Upload URL generation failed");
    res.status(500).json({ error: "Could not prepare upload." });
  }
});

export default router;