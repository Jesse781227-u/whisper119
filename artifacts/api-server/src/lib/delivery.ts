import nodemailer from "nodemailer";
import { eq, inArray } from "drizzle-orm";
import { db, booksTable, orderItemsTable, ordersTable } from "@workspace/db";
import { ObjectStorageService } from "./objectStorage";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export async function confirmManualOrder(orderId: string): Promise<{ order: typeof ordersTable.$inferSelect; items: typeof orderItemsTable.$inferSelect[] } | null> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;
  if (order.status === "fulfilled") {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    return { order, items };
  }
  if (order.status !== "pending") {
    throw new Error("ORDER_NOT_PENDING");
  }

  const [updated] = await db.update(ordersTable)
    .set({
      status: "fulfilled",
      paymentStatus: "confirmed",
      paidAt: new Date(),
    })
    .where(eq(ordersTable.id, order.id))
    .returning();
  if (!updated) return null;
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, updated.id));
  return { order: updated, items };
}

export async function deliverOrderEmail(orderId: string): Promise<void> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || order.status !== "paid" || order.deliveryEmailSent) return;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  if (!smtpHost || !smtpUser || !smtpPass || !from) throw new Error("SMTP_NOT_CONFIGURED");

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const books = await db.select().from(booksTable).where(inArray(booksTable.id, items.map((item) => item.bookId)));
  const storage = new ObjectStorageService();
  const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
  let totalBytes = 0;
  for (const item of items) {
    const book = books.find((candidate) => candidate.id === item.bookId);
    if (!book) throw new Error(`Missing book for order item ${item.bookId}`);
    const file = await storage.getObjectEntityFile(book.fileObjectPath);
    const [content] = await file.download();
    totalBytes += content.byteLength;
    if (totalBytes > MAX_ATTACHMENT_BYTES) throw new Error("EMAIL_ATTACHMENT_LIMIT_EXCEEDED");
    attachments.push({
      filename: book.fileName,
      content,
      contentType: book.format === "PDF" ? "application/pdf" : "application/epub+zip",
    });
  }
  const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true", auth: { user: smtpUser, pass: smtpPass } });
  await transporter.sendMail({
    from,
    to: order.email,
    subject: `Your Whisper 119 order ${order.reference}`,
    text: `Thank you for your order.\n\nOrder ${order.reference}\nTotal: ${order.currency} ${order.subtotal.toFixed(2)}\n\nYour  ebook files are attached, along with your receipt details.`,
    attachments,
  });
  await db.update(ordersTable).set({ deliveryEmailSent: true }).where(eq(ordersTable.id, order.id));
}