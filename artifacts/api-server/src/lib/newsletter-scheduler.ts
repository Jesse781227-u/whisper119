import { and, eq, lte } from "drizzle-orm";
import { db, messages } from "@workspace/db";
import { logger } from "./logger";
import { sendMessageToAllSubscribers } from "./newsletter-sender";

/** Sends every scheduled newsletter whose send time has passed. */
export async function sendDueNewsletters(): Promise<void> {
  const due = await db.select().from(messages).where(and(
    eq(messages.status, "scheduled"),
    lte(messages.scheduledAt, new Date()),
  ));

  for (const message of due) {
    try {
      await sendMessageToAllSubscribers(message.id);
    } catch (error) {
      logger.error({ err: error, messageId: message.id }, "Scheduled newsletter send failed");
    }
  }
}

/**
 * Long-running Node server only. On Cloudflare the same check runs from the
 * Worker's Cron Trigger (see src/worker.ts and wrangler.jsonc).
 */
export async function startNewsletterScheduler(): Promise<void> {
  const { default: cron } = await import("node-cron");
  cron.schedule("*/5 * * * *", sendDueNewsletters);
  logger.info("Newsletter scheduler started; checking every five minutes");
}
