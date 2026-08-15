import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  GetAdminDashboardResponse,
  GetAdminOrderParams,
  GetAdminOrderResponse,
  ConfirmAdminOrderPaymentParams,
  ConfirmAdminOrderPaymentResponse,
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
import { initializePaystack } from "../lib/payments";
import { deliverOrderEmail } from "../lib/delivery";

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

router.post("/admin/login", async (_req, res): Promise<void> => {
  res.status(410).json({ error: "Admin password login is disabled. Authenticate using Firebase and admin email access." });
});

router.use("/admin/dashboard", requireAdmin);
router.use("/admin/books", requireAdmin);
router.use("/admin/orders", requireAdmin);

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
  }).from(ordersTable).where(inArray(ordersTable.status, ["paid", "fulfilled"]));
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
  const parsed = ConfirmAdminOrderPaymentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await getOrderById(parsed.data.orderId);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (result.order.status === "fulfilled") {
    res.json(ConfirmAdminOrderPaymentResponse.parse(orderResponse(result.order, result.items)));
    return;
  }
  if (result.order.status !== "pending" || !result.order.paymentReference) {
    res.status(409).json({ error: "This order is not awaiting manual payment confirmation." });
    return;
  }

  const [claimed] = await db.update(ordersTable)
    .set({ status: "processing", paymentStatus: "confirmed", paidAt: new Date() })
    .where(and(
      eq(ordersTable.id, parsed.data.orderId),
      eq(ordersTable.status, "pending"),
      eq(ordersTable.paymentStatus, "pending"),
    ))
    .returning();
  if (!claimed) {
    res.status(409).json({ error: "This order is already being processed." });
    return;
  }

  try {
    await deliverOrderEmail(parsed.data.orderId);
  } catch (error) {
    req.log.error({ err: error, orderId: parsed.data.orderId }, "Manual order email delivery failed");
    await db.update(ordersTable).set({ status: "pending", paymentStatus: "pending", paidAt: null }).where(eq(ordersTable.id, parsed.data.orderId));
    res.status(503).json({ error: "Payment was not marked fulfilled because the delivery email could not be sent. Check mail settings and try again." });
    return;
  }

  const [fulfilled] = await db.update(ordersTable)
    .set({ status: "fulfilled", paymentStatus: "confirmed" })
    .where(eq(ordersTable.id, parsed.data.orderId))
    .returning();
  if (!fulfilled) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const finalResult = await getOrderById(fulfilled.id);
  if (!finalResult) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(ConfirmAdminOrderPaymentResponse.parse(orderResponse(finalResult.order, finalResult.items)));
});

export default router;