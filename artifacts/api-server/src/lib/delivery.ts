import nodemailer from "nodemailer";
import { and, eq, inArray } from "drizzle-orm";
import { db, booksTable, orderItemsTable, ordersTable } from "@workspace/db";
import { buildPurchaseEmailHtml } from "./email";
import { ObjectStorageService } from "./objectStorage";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS ?? 120_000);

export async function confirmManualOrder(orderId: string): Promise<{ order: typeof ordersTable.$inferSelect; items: typeof orderItemsTable.$inferSelect[] } | null> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;
  if (order.status !== "pending" && !(order.status === "paid" && !order.deliveryEmailSent)) {
    throw new Error("ORDER_NOT_PENDING");
  }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const [paidOrder] = order.status === "pending" ? await db.update(ordersTable)
    .set({ status: "paid", paymentStatus: "confirmed", paidAt: order.paidAt ?? new Date() })
    .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "pending")))
    .returning() : [order];
  if (!paidOrder) return null;

  try {
    await sendOrderEmail(paidOrder, items);
  } catch (error) {
    console.error("Manual order payment confirmed, but delivery failed", { orderId, error });
    return { order: paidOrder, items };
  }

  const [fulfilledOrder] = await db.update(ordersTable)
    .set({ status: "fulfilled", paymentStatus: "confirmed", deliveryEmailSent: true })
    .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "paid")))
    .returning();
  if (!fulfilledOrder) return null;
  return { order: fulfilledOrder, items };
}

export async function deliverOrderEmail(orderId: string): Promise<void> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || (order.status !== "paid" && order.status !== "fulfilled") || order.deliveryEmailSent) return;
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  await sendOrderEmail(order, items);
  await db.update(ordersTable)
    .set({ status: "fulfilled", paymentStatus: "confirmed", deliveryEmailSent: true })
    .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "paid")));
}

async function sendOrderEmail(
  order: typeof ordersTable.$inferSelect,
  items: typeof orderItemsTable.$inferSelect[],
): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM_ADDRESS;
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const smtpPort = Number(process.env.SMTP_PORT ?? 587);
  const smtpSecure = process.env.SMTP_SECURE === undefined ? smtpPort === 465 : process.env.SMTP_SECURE === "true";
  const smtpRequireTls = process.env.SMTP_REQUIRE_TLS === "true" || smtpPort === 2525 || smtpPort === 587;
  const smtpConfigured = Boolean(smtpHost && smtpUser && smtpPass);
  if (!from) throw new Error("MAIL_FROM_ADDRESS_NOT_CONFIGURED");
  if (!resendApiKey && !smtpConfigured) throw new Error("EMAIL_DELIVERY_NOT_CONFIGURED");
  if (!items.length) throw new Error("ORDER_HAS_NO_ITEMS");

  const books = await db.select().from(booksTable).where(inArray(booksTable.id, items.map((item) => item.bookId)));
  const storage = new ObjectStorageService();
  const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
  let totalBytes = 0;
  for (const item of items) {
    const book = books.find((candidate) => candidate.id === item.bookId);
    if (!book) throw new Error(`Missing book for order item ${item.bookId}`);
    const content = await downloadEbookContent(book.fileObjectPath, storage);
    totalBytes += content.byteLength;
    if (totalBytes > MAX_ATTACHMENT_BYTES) throw new Error("EMAIL_ATTACHMENT_LIMIT_EXCEEDED");
    attachments.push({
      filename: book.fileName,
      content,
      contentType: book.format === "PDF" ? "application/pdf" : "application/epub+zip",
    });
  }
  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `whisper119-${order.id}`,
      },
      body: JSON.stringify({
        from,
        to: [order.email],
        subject: "Your book from Whisper 119 is here ðŸ“š",
        html,
        attachments: attachments.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content.toString("base64"),
          content_type: attachment.contentType,
        })),
      }),
      signal: AbortSignal.timeout(SMTP_TIMEOUT_MS),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`RESEND_DELIVERY_FAILED_${response.status}${details ? `: ${details.slice(0, 200)}` : ""}`);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: smtpRequireTls,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
  const bookTitle = items.map((item) => item.title).join(", ");
  const paymentMethod = order.paymentMethod === "payoneer" ? "Payoneer" : "Flutterwave";
  const purchaseDate = (order.paidAt ?? order.createdAt).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });
  const html = buildPurchaseEmailHtml({
    customerEmail: order.email,
    bookTitle,
    orderId: order.reference,
    amount: order.subtotal,
    currency: order.currency,
    paymentMethod,
    purchaseDate,
  });
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      transporter.sendMail({
    from,
    to: order.email,
    subject: "Your book from Whisper 119 is here 📚",
    html,
    attachments,
      }),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error("SMTP_DELIVERY_TIMEOUT")), SMTP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    transporter.close();
  }
}

async function downloadEbookContent(fileObjectPath: string, storage: ObjectStorageService): Promise<Buffer> {
  if (fileObjectPath.startsWith("/objects/")) {
    const file = await storage.getObjectEntityFile(fileObjectPath);
    return storage.downloadBuffer(file);
  }

  let url: URL;
  try {
    url = new URL(fileObjectPath);
  } catch {
    throw new Error("EBOOK_FILE_PATH_INVALID");
  }
  if (!["firebasestorage.googleapis.com", "storage.googleapis.com"].includes(url.hostname)) {
    throw new Error("EBOOK_FILE_HOST_INVALID");
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`EBOOK_FILE_DOWNLOAD_FAILED_${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}
