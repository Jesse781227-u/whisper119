import { createInsertSchema } from "drizzle-zod";
import { boolean, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const booksTable = pgTable("books", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  priceNgn: numeric("price_ngn", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  categories: text("categories").array().notNull().default([]),
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

export const insertBookSchema = createInsertSchema(booksTable).omit({
  createdAt: true,
});
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof booksTable.$inferSelect;