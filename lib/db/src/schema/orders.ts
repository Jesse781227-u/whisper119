import { createInsertSchema } from "drizzle-zod";
import { boolean, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  email: text("email").notNull(),
  country: text("country").notNull(),
  currency: text("currency").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2, mode: "number" }).notNull(),
  status: text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull().default("flutterwave"),
  paymentReference: text("payment_reference"),
  deliveryEmailSent: boolean("delivery_email_sent").notNull().default(false),
  downloaded: boolean("downloaded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const orderItemsTable = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  bookId: text("book_id").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  format: text("format").notNull(),
  downloaded: boolean("downloaded").notNull().default(false),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
  createdAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
