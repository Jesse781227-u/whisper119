import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  ConfirmPaymentBody, ConfirmPaymentResponse, CreateOrderBody, CreateOrderResponse, GetOrderParams, GetOrderResponse, ListOrderDownloadsParams, ListOrderDownloadsResponse,
  RetryOrderPaymentParams, RetryOrderPaymentResponse,
} from "@workspace/api-zod";
import { booksTable, db, orderItemsTable, ordersTable } from "@workspace/db";
import { getOrderById, orderResponse } from "../lib/bookstore";
import { confirmFlutterwaveTransaction, initializeFlutterwave, paymentProvider, validFlutterwaveSignature } from "../lib/payments";
import { getExchangeRates } from "../lib/exchange-rates";

const router: IRouter = Router();

async function paymentSession(orderId: string) {
  const result = await getOrderById(orderId);
  if (!result) throw new Error("ORDER_NOT_FOUND");
  const payment = await initializeFlutterwave(result.order.reference, result.order.email, result.order.subtotal, result.order.currency, result.order.id);
  if (!payment?.link) throw new Error("FLUTTERWAVE_CHECKOUT_LINK_MISSING");
  return { orderId: result.order.id, reference: result.order.reference, authorizationUrl: payment.link, accessCode: "" };
}

async function convertUsdToNgn(amountUsd: number): Promise<number> {
  const rates = await getExchangeRates();
  const usdPerNgn = rates.rates.USD;
  if (!Number.isFinite(usdPerNgn) || usdPerNgn <= 0) throw new Error("USD_TO_NGN_RATE_UNAVAILABLE");
  return Math.round((amountUsd / usdPerNgn) * 100) / 100;
}

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!process.env.FLW_SECRET_KEY) {
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
  let selectedPrices: number[];
  try {
    selectedPrices = currency === "NGN"
      ? await Promise.all(selected.map((book) => convertUsdToNgn(book.price)))
      : selected.map((book) => book.price);
  } catch (error) {
    req.log.error({ err: error }, "Could not convert USD prices to NGN");
    res.status(503).json({ error: "The current NGN exchange rate is unavailable. Please try again shortly." });
    return;
  }
  const subtotal = selectedPrices.reduce((sum, price) => sum + price, 0);
  if (subtotal <= 0 || selectedPrices.some((price) => price <= 0)) {
    res.status(400).json({ error: `One or more selected books does not have a valid ${currency} price yet.` });
    return;
  }
  await db.insert(ordersTable).values({
    id: orderId, reference, email: parsed.data.email, country: parsed.data.country,
    currency, subtotal, status: "pending", paymentStatus: "pending", paymentMethod: paymentProvider(),
  });
  await db.insert(orderItemsTable).values(selected.map((book, index) => ({
    id: randomUUID(), orderId, bookId: book.id, title: book.title, author: book.author,
    price: selectedPrices[index], format: book.format,
  })));
  try {
    res.status(201).json(CreateOrderResponse.parse(await paymentSession(orderId)));
  } catch (error) {
    req.log.error({ err: error, orderId }, "Flutterwave initialization failed");
    res.status(503).json({ error: "Payment initialization failed. Please try again." });
  }
});

router.post("/orders/confirm-payment", async (req, res): Promise<void> => {
  const parsed = ConfirmPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [book] = await db.select().from(booksTable).where(eq(booksTable.id, parsed.data.bookId));
  if (!book) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  // Manual confirmation is a legacy review endpoint; hosted checkout creates
  // the authoritative NGN/USD order and webhook confirmation.
  const isLocalPayment = false;
  const currency = isLocalPayment ? "NGN" : "USD";
  const subtotal = isLocalPayment ? await convertUsdToNgn(book.price) : book.price;
  if (subtotal <= 0) {
    res.status(400).json({ error: `This book does not have a valid ${currency} price yet.` });
    return;
  }

  const orderId = randomUUID();
  const orderReference = `W119-CONF-${Date.now().toString(36).toUpperCase()}-${orderId.slice(0, 6).toUpperCase()}`;
  const createdAt = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(ordersTable).values({
      id: orderId,
      reference: orderReference,
      email: parsed.data.email,
      country: isLocalPayment ? "NG" : "INTL",
      currency,
      subtotal,
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: parsed.data.paymentMethod,
      paymentReference: parsed.data.paymentReference,
      createdAt,
    });
    await tx.insert(orderItemsTable).values({
      id: randomUUID(),
      orderId,
      bookId: book.id,
      title: book.title,
      author: book.author,
      price: subtotal,
      format: book.format,
    });
  });

  res.status(201).json(ConfirmPaymentResponse.parse({
    orderId,
    orderReference,
    bookId: book.id,
    bookTitle: book.title,
    email: parsed.data.email,
    paymentMethod: parsed.data.paymentMethod,
    paymentReference: parsed.data.paymentReference,
    status: "pending",
    createdAt: createdAt.toISOString(),
  }));
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
  if (result.order.status === "paid") {
    res.status(409).json({ error: "This order is already paid." });
    return;
  }
  try {
    res.json(RetryOrderPaymentResponse.parse(await paymentSession(result.order.id)));
  } catch (error) {
    req.log.error({ err: error, orderId: result.order.id }, "Flutterwave retry failed");
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
  if (result.order.status !== "paid") {
    res.status(403).json({ error: "Downloads unlock after payment is confirmed." });
    return;
  }
  // Delivery is attachment-only. No unauthenticated download links are exposed.
  res.json(ListOrderDownloadsResponse.parse([]));
});

router.post("/payments/flutterwave/webhook", async (req, res): Promise<void> => {
  const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody?.toString("utf8") ?? JSON.stringify(req.body);
  if (!validFlutterwaveSignature(rawBody, req.header("flutterwave-signature"))) {
    res.status(401).json({ error: "Invalid Flutterwave signature" });
    return;
  }
  const data = req.body?.data;
  if (data?.id && data?.tx_ref) {
    try {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.reference, data.tx_ref));
      if (order) await confirmFlutterwaveTransaction(String(data.id), order.reference, order.subtotal, order.currency);
    } catch (error) {
      req.log.error({ err: error }, "Flutterwave webhook confirmation failed");
      res.status(502).json({ error: "Payment confirmation failed" });
      return;
    }
  }
  res.json({ received: true });
});

export default router;
