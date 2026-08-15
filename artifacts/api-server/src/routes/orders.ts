import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  CreateOrderBody, CreateOrderResponse, GetOrderParams, GetOrderResponse, ListOrderDownloadsParams, ListOrderDownloadsResponse,
  SubmitPaymentConfirmationBody, SubmitPaymentConfirmationResponse,
  PaystackWebhookBody, PaystackWebhookResponse, RetryOrderPaymentParams, RetryOrderPaymentResponse,
} from "@workspace/api-zod";
import { booksTable, db, orderItemsTable, ordersTable } from "@workspace/db";
import { getOrderById, orderResponse } from "../lib/bookstore";
import { confirmPaystackReference, initializePaystack, validPaystackSignature } from "../lib/payments";

const router: IRouter = Router();

async function paymentSession(orderId: string) {
  const result = await getOrderById(orderId);
  if (!result) throw new Error("ORDER_NOT_FOUND");
  const payment = await initializePaystack(result.order.reference, result.order.email, result.order.subtotal, result.order.currency, result.order.id);
  return { orderId: result.order.id, reference: result.order.reference, authorizationUrl: payment?.authorization_url ?? "", accessCode: payment?.access_code ?? "" };
}

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!process.env.PAYSTACK_SECRET_KEY) {
    res.status(503).json({ error: "Payments are not configured yet. Please try again later." });
    return;
  }
  const ids = [...new Set(parsed.data.bookIds)];
  const books = await db.select().from(booksTable);
  const selected = ids.map((id) => books.find((book) => book.id === id)).filter((book): book is typeof books[number] => Boolean(book));
  if (selected.length !== ids.length) {
    res.status(400).json({ error: "One or more selected books are no longer available." });
    return;
  }
  const orderId = randomUUID();
  const reference = `W119-${Date.now().toString(36).toUpperCase()}-${orderId.slice(0, 6).toUpperCase()}`;
  const currency = parsed.data.country.toUpperCase() === "NG" ? "NGN" : "USD";
  const subtotal = selected.reduce((sum, book) => sum + (currency === "NGN" ? book.priceNgn : book.price), 0);
  if (subtotal <= 0 || selected.some((book) => currency === "NGN" ? book.priceNgn <= 0 : book.price <= 0)) {
    res.status(400).json({ error: `One or more selected books does not have a valid ${currency} price yet.` });
    return;
  }
  await db.insert(ordersTable).values({
    id: orderId, reference, email: parsed.data.email, country: parsed.data.country,
    currency, subtotal, status: "pending", paymentStatus: "pending",
  });
  await db.insert(orderItemsTable).values(selected.map((book) => ({
    id: randomUUID(), orderId, bookId: book.id, title: book.title, author: book.author,
    price: currency === "NGN" ? book.priceNgn : book.price, format: book.format,
  })));
  try {
    res.status(201).json(CreateOrderResponse.parse(await paymentSession(orderId)));
  } catch (error) {
    req.log.error({ err: error, orderId }, "Paystack initialization failed");
    res.status(503).json({ error: "Payment initialization failed. Please try again." });
  }
});

router.post("/orders/payment-confirmation", async (req, res): Promise<void> => {
  const parsed = SubmitPaymentConfirmationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const paymentReference = parsed.data.paymentReference.trim();
  if (!email.includes("@") || !email.includes(".")) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, parsed.data.bookId));
  if (!book) {
    res.status(404).json({ error: "That book is no longer available." });
    return;
  }

  const [duplicate] = await db.select({ id: ordersTable.id }).from(ordersTable).where(and(
    eq(ordersTable.paymentMethod, parsed.data.paymentMethod),
    eq(ordersTable.paymentReference, paymentReference),
  ));
  if (duplicate) {
    res.status(409).json({ error: "That payment reference has already been submitted." });
    return;
  }

  const orderId = randomUUID();
  const reference = `W119-${Date.now().toString(36).toUpperCase()}-${orderId.slice(0, 6).toUpperCase()}`;
  const isPaystack = parsed.data.paymentMethod === "paystack";
  const currency = isPaystack ? "NGN" : "USD";
  const price = isPaystack ? book.priceNgn : book.price;
  if (price <= 0) {
    res.status(400).json({ error: `This book does not have a valid ${currency} price yet.` });
    return;
  }

  await db.insert(ordersTable).values({
    id: orderId,
    reference,
    email,
    country: isPaystack ? "NG" : "INTL",
    currency,
    subtotal: price,
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: parsed.data.paymentMethod,
    paymentReference,
  });
  await db.insert(orderItemsTable).values({
    id: randomUUID(),
    orderId,
    bookId: book.id,
    title: book.title,
    author: book.author,
    price,
    format: book.format,
  });

  const result = await getOrderById(orderId);
  if (!result) {
    res.status(500).json({ error: "The order could not be created." });
    return;
  }
  res.status(201).json(SubmitPaymentConfirmationResponse.parse(orderResponse(result.order, result.items)));
});

router.get("/orders/:orderId", async (req, res): Promise<void> => {
  const parsed = GetOrderParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await getOrderById(parsed.data.orderId);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(GetOrderResponse.parse(orderResponse(result.order, result.items)));
});

router.post("/orders/:orderId/retry", async (req, res): Promise<void> => {
  const parsed = RetryOrderPaymentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await getOrderById(parsed.data.orderId);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (["paid", "processing", "fulfilled"].includes(result.order.status)) {
    res.status(409).json({ error: "This order is already paid." });
    return;
  }
  try {
    res.json(RetryOrderPaymentResponse.parse(await paymentSession(result.order.id)));
  } catch (error) {
    req.log.error({ err: error, orderId: result.order.id }, "Paystack retry failed");
    res.status(503).json({ error: "Payment initialization failed. Please try again." });
  }
});

router.get("/orders/:orderId/downloads", async (req, res): Promise<void> => {
  const parsed = ListOrderDownloadsParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await getOrderById(parsed.data.orderId);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (!["paid", "fulfilled"].includes(result.order.status)) {
    res.status(403).json({ error: "Downloads unlock after payment is confirmed." });
    return;
  }
  // Delivery is attachment-only. No unauthenticated download links are exposed.
  res.json(ListOrderDownloadsResponse.parse([]));
});

router.post("/payments/paystack/webhook", async (req, res): Promise<void> => {
  const signature = req.header("x-paystack-signature");
  const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody?.toString("utf8") ?? JSON.stringify(req.body);
  if (!validPaystackSignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid Paystack signature" });
    return;
  }
  const parsed = PaystackWebhookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    if (parsed.data.data.reference) await confirmPaystackReference(parsed.data.data.reference);
    res.json(PaystackWebhookResponse.parse({ received: true }));
  } catch (error) {
    req.log.error({ err: error }, "Paystack webhook confirmation failed");
    res.status(502).json({ error: "Payment confirmation failed" });
  }
});

export default router;