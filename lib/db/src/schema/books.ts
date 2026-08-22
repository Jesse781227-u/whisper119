import { createInsertSchema } from "drizzle-zod";
import { boolean, numeric, pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const booksTable = pgTable("books", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  titleGroupId: text("title_group_id").notNull(),
  language: text("language").notNull().default("en"),
  author: text("author").notNull(),
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  priceNgn: numeric("price_ngn", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  isCompleted: boolean("is_completed").notNull().default(false),
  description: text("description").notNull(),
  format: text("format").notNull(),
  paystackLink: text("paystack_link"),
  payoneerLink: text("payoneer_link"),
  coverObjectPath: text("cover_object_path"),
  fileObjectPath: text("file_object_path").notNull(),
  fileName: text("file_name").notNull(),
  featured: boolean("featured").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const languageRequestsTable = pgTable("language_requests", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull().references(() => booksTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  country: text("country").notNull(),
  language: text("language").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLanguageRequestSchema = createInsertSchema(languageRequestsTable).omit({ createdAt: true });
export type InsertLanguageRequest = z.infer<typeof insertLanguageRequestSchema>;
export type LanguageRequest = typeof languageRequestsTable.$inferSelect;

export const categoriesTable = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  featured: boolean("featured").notNull().default(false),
});

export const bookCategoriesTable = pgTable("book_categories", {
  bookId: text("book_id").notNull().references(() => booksTable.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categoriesTable.id, { onDelete: "restrict" }),
}, (table) => [primaryKey({ columns: [table.bookId, table.categoryId] })]);

export const insertBookSchema = createInsertSchema(booksTable).omit({
  createdAt: true,
});
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof booksTable.$inferSelect;
