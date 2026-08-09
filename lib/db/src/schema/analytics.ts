import { createInsertSchema } from "drizzle-zod";
import { text, timestamp, uuid, pgTable } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const analyticsEventsTable = pgTable("analytics_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventType: text("event_type").notNull(),
  path: text("path").notNull(),
  visitorId: text("visitor_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEventsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;