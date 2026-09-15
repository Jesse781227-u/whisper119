import cron from "node-cron";
import { and, eq, lte } from "drizzle-orm";
import { db, messages } from "@workspace/db";
import { logger } from "./logger";
import { sendMessageToAllSubscribers } from "./newsletter-sender";

export function startNewsletterScheduler(): void {
  cron.schedule("*/5 * * * *", async () => {
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
  });
  logger.info("Newsletter scheduler started; checking every five minutes");
}