import { and, desc, eq, ilike, inArray, lte, or } from "drizzle-orm";
import { db, booksTable, orderItemsTable, ordersTable, type Book, type Order, type OrderItem } from "@workspace/db";

export function coverUrl(book: Book): string | null {
  if (book.coverObjectPath?.startsWith("http://") || book.coverObjectPath?.startsWith("https://")) {
    return book.coverObjectPath;
  }
  if (book.coverObjectPath?.startsWith("/covers/")) {
    return book.coverObjectPath;
  }
  return book.coverObjectPath ? `/api/storage${book.coverObjectPath}` : null;
}

export function publicBook(book: Book) {
  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    author: book.author,
    price: book.price,
    priceNgn: book.priceNgn,
    currency: book.currency,
    category: book.category,
    description: book.description,
    format: book.format,
    paymentLink: book.paymentLink,
    coverUrl: coverUrl(book),
    fileName: book.fileName,
    featured: book.featured,
    publishedAt: book.publishedAt.toISOString(),
    createdAt: book.createdAt.toISOString(),
  };
}

export async function findBooks(filters: {
  category?: string;
  format?: "PDF" | "EPUB";
  search?: string;
  maxPrice?: number;
}): Promise<Book[]> {
  const conditions = [
    filters.category ? eq(booksTable.category, filters.category) : undefined,
    filters.format ? eq(booksTable.format, filters.format) : undefined,
    filters.maxPrice !== undefined ? lte(booksTable.price, filters.maxPrice) : undefined,
    filters.search ? or(ilike(booksTable.title, `%${filters.search}%`), ilike(booksTable.author, `%${filters.search}%`)) : undefined,
  ].filter(Boolean);
  return db.select().from(booksTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(booksTable.publishedAt));
}

export async function orderWithItems(order: Order) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  return { order, items };
}

export function orderResponse(order: Order, items: OrderItem[]) {
  return {
    id: order.id,
    reference: order.reference,
    email: order.email,
    country: order.country,
    currency: order.currency,
    subtotal: order.subtotal,
    status: order.status,
    paymentStatus: order.paymentStatus,
    deliveryEmailSent: order.deliveryEmailSent,
    downloaded: order.downloaded,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    items: items.map((item) => ({
      bookId: item.bookId,
      title: item.title,
      author: item.author,
      price: item.price,
      format: item.format,
      downloadUrl: null,
      downloaded: item.downloaded,
    })),
  };
}

export async function getOrderById(id: string) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) return null;
  return orderWithItems(order);
}