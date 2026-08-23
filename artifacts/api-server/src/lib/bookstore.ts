import { and, desc, eq, ilike, inArray, lte, or } from "drizzle-orm";
import { bookCategoriesTable, booksTable, categoriesTable, db, orderItemsTable, ordersTable, type Book, type Order, type OrderItem } from "@workspace/db";

export function coverUrl(book: Book): string | null {
  if (book.coverObjectPath?.startsWith("http://") || book.coverObjectPath?.startsWith("https://")) {
    return book.coverObjectPath;
  }
  if (book.coverObjectPath?.startsWith("/covers/")) {
    return book.coverObjectPath;
  }
  if (!book.coverObjectPath) return null;
  const publicUrl = process.env.R2_PUBLIC_URL?.trim();
  if (publicUrl && book.coverObjectPath.startsWith("/objects/")) {
    return `${publicUrl.replace(/\/+$/, "")}/${book.coverObjectPath.slice("/objects/".length)}`;
  }
  return `/api/storage${book.coverObjectPath}`;
}

export function publicBook(book: Book, categories: string[] = []) {
  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    titleGroupId: book.titleGroupId,
    language: book.language,
    author: book.author,
    price: book.price,
    priceNgn: book.priceNgn,
    currency: book.currency,
    categories,
    isCompleted: book.isCompleted,
    description: book.description,
    format: book.format,
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
    filters.format ? eq(booksTable.format, filters.format) : undefined,
    filters.maxPrice !== undefined ? lte(booksTable.price, filters.maxPrice) : undefined,
    filters.search ? or(ilike(booksTable.title, `%${filters.search}%`), ilike(booksTable.author, `%${filters.search}%`)) : undefined,
  ].filter(Boolean);
  if (filters.category) {
    return db.select({ book: booksTable }).from(booksTable)
      .innerJoin(bookCategoriesTable, eq(bookCategoriesTable.bookId, booksTable.id))
      .innerJoin(categoriesTable, eq(categoriesTable.id, bookCategoriesTable.categoryId))
      .where(and(eq(categoriesTable.name, filters.category), ...conditions))
      .orderBy(desc(booksTable.publishedAt))
      .then(rows => rows.map(row => row.book));
  }
  return db.select().from(booksTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(booksTable.publishedAt));
}

export async function categoryNamesForBooks(bookIds: string[]) {
  if (!bookIds.length) return new Map<string, string[]>();
  const rows = await db.select({ bookId: bookCategoriesTable.bookId, name: categoriesTable.name })
    .from(bookCategoriesTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, bookCategoriesTable.categoryId))
    .where(inArray(bookCategoriesTable.bookId, bookIds));
  const result = new Map<string, string[]>();
  for (const row of rows) result.set(row.bookId, [...(result.get(row.bookId) ?? []), row.name]);
  return result;
}

export async function publicBooks(books: Book[]) {
  const names = await categoryNamesForBooks(books.map(book => book.id));
  return books.map(book => publicBook(book, names.get(book.id) ?? []));
}

export async function replaceBookCategories(bookId: string, names: string[]) {
  const categories = await db.select({ id: categoriesTable.id, name: categoriesTable.name })
    .from(categoriesTable).where(inArray(categoriesTable.name, names));
  if (categories.length !== new Set(names).size) throw new Error("One or more selected categories no longer exists.");
  await db.delete(bookCategoriesTable).where(eq(bookCategoriesTable.bookId, bookId));
  await db.insert(bookCategoriesTable).values(categories.map(category => ({ bookId, categoryId: category.id })));
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
    paymentMethod: order.paymentMethod,
    paymentReference: order.paymentReference,
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
