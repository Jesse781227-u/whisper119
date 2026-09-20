import { createInsertSchema } from "drizzle-zod";
import { boolean, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const newsletterAudienceValues = ["all_subscribers", "verified_purchasers", "new_subscribers"] as const;
export type NewsletterAudience = typeof newsletterAudienceValues[number];

export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  source: text("source", { enum: ["signup_form", "purchase", "both"] }).notNull(),
  subscribed: boolean("subscribed").notNull().default(true),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull().default(""),
  audience: text("audience", { enum: newsletterAudienceValues }).notNull().default("all_subscribers"),
  status: text("status", { enum: ["draft", "scheduled", "sent"] }).notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newsletterTemplates = pgTable("newsletter_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailEvents = pgTable("email_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").references(() => messages.id),
  subscriberId: uuid("subscriber_id").notNull().references(() => subscribers.id),
  providerEmailId: text("provider_email_id"),
  eventType: text("event_type", {
    enum: ["sent", "delivered", "opened", "clicked", "bounced", "complained"],
  }).notNull(),
  rawPayload: jsonb("raw_payload"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubscriberSchema = createInsertSchema(subscribers).omit({
  id: true,
  createdAt: true,
});
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type NewsletterTemplate = typeof newsletterTemplates.$inferSelect;
export type EmailEvent = typeof emailEvents.$inferSelect;
