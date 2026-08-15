import nodemailer from "nodemailer";
import { eq, inArray } from "drizzle-orm";
import { db, booksTable, orderItemsTable, ordersTable } from "@workspace/db";
import { ObjectStorageService } from "./objectStorage";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export type ReceiptEmailData = {
  customerEmail: string;
  bookTitle: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  purchaseDate: Date | string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export function buildReceiptEmailHtml({
  customerEmail,
  bookTitle,
  orderId,
  amount,
  currency,
  paymentMethod,
  purchaseDate,
}: ReceiptEmailData): string {
  const date = purchaseDate instanceof Date ? purchaseDate.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : purchaseDate;
  return `
    <p>Hi there,</p>
    <p>Thank you for your purchase! Your copy of <strong>&ldquo;${escapeHtml(bookTitle)}&rdquo;</strong> is attached to this email.</p>
    <p>If you run into any trouble opening the file, just reply to this email and I&rsquo;ll sort it out.</p>
    <p>&mdash; Whisper 119</p>
    <hr>
    <p><strong>RECEIPT</strong></p>
    <p>
      <strong>Order #:</strong> ${escapeHtml(orderId)}<br>
      <strong>Book:</strong> ${escapeHtml(bookTitle)}<br>
      <strong>Amount paid:</strong> ${escapeHtml(currency)} ${amount.toFixed(2)}<br>
      <strong>Payment method:</strong> ${escapeHtml(paymentMethod)}<br>
      <strong>Date:</strong> ${escapeHtml(date)}<br>
      <strong>Buyer email:</strong> ${escapeHtml(customerEmail)}
    </p>
    <p>This receipt confirms your purchase of a digital copy for personal use.</p>
    <hr>
  `.trim();
}

export async function deliverOrderEmail(orderId: string): Promise<void> {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order || !["paid", "processing"].includes(order.status) || order.deliveryEmailSent) return;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM_ADDRESS ?? process.env.SMTP_FROM;
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
  const bookTitle = items.map((item) => item.title).join(", ");
  const paymentMethod = order.paymentMethod === "payoneer" ? "Payoneer" : "Paystack";
  await transporter.sendMail({
    from,
    to: order.email,
    subject: "Your book from Whisper 119 is here 📚",
    html: buildReceiptEmailHtml({
      customerEmail: order.email,
      bookTitle,
      orderId: order.reference,
      amount: order.subtotal,
      currency: order.currency,
      paymentMethod,
      purchaseDate: order.createdAt,
    }),
    text: `Hi there,\n\nThank you for your purchase! Your copy of "${bookTitle}" is attached to this email.\n\nIf you run into any trouble opening the file, just reply to this email and I'll sort it out.\n\n— Whisper 119\n\nRECEIPT\n\nOrder #: ${order.reference}\nBook: ${bookTitle}\nAmount paid: ${order.currency} ${order.subtotal.toFixed(2)}\nPayment method: ${paymentMethod}\nDate: ${order.createdAt.toISOString()}\nBuyer email: ${order.email}\n\nThis receipt confirms your purchase of a digital copy for personal use.`,
    attachments,
  });
  await db.update(ordersTable).set({ deliveryEmailSent: true }).where(eq(ordersTable.id, order.id));
}