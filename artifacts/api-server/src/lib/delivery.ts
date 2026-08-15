import nodemailer from "nodemailer";
import { and, eq, inArray } from "drizzle-orm";
import { db, booksTable, orderItemsTable, ordersTable } from "@workspace/db";
import { buildPurchaseEmailHtml } from "./email";
import { ObjectStorageService } from "./objectStorage";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export async function confirmManualOrder(orderId: string): Promise<{ order: typeof ordersTable.$inferSelect; items: typeof orderItemsTable.$inferSelect[] } | null> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;
  if (order.status !== "pending") {
    throw new Error("ORDER_NOT_PENDING");
  }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  await sendOrderEmail(order, items);

  const [updated] = await db.update(ordersTable)
    .set({ status: "fulfilled", paymentStatus: "confirmed", deliveryEmailSent: true, paidAt: new Date() })
    .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "pending")))
    .returning();
  if (!updated) return null;
  return { order: updated, items };
}

export async function deliverOrderEmail(orderId: string): Promise<void> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || order.status !== "paid" || order.deliveryEmailSent) return;
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  await sendOrderEmail(order, items);
  await db.update(ordersTable).set({ deliveryEmailSent: true }).where(eq(ordersTable.id, order.id));
}

async function sendOrderEmail(
  order: typeof ordersTable.$inferSelect,
  items: typeof orderItemsTable.$inferSelect[],
): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM_ADDRESS;
  if (!smtpHost || !smtpUser || !smtpPass || !from) throw new Error("SMTP_NOT_CONFIGURED");
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
  const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true", auth: { user: smtpUser, pass: smtpPass } });
  const bookTitle = items.map((item) => item.title).join(", ");
  const paymentMethod = order.paymentMethod === "paystack" ? "Paystack" : "Payoneer";
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
  await transporter.sendMail({
    from,
    to: order.email,
    subject: "Your book from Whisper 119 is here 📚",
    html,
    attachments,
  });
}

async function downloadEbookContent(fileObjectPath: string, storage: ObjectStorageService): Promise<Buffer> {
  if (fileObjectPath.startsWith("/objects/")) {
    const file = await storage.getObjectEntityFile(fileObjectPath);
    const [content] = await file.download();
    return content;
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