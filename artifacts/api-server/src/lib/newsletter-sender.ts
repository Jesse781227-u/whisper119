import { and, eq, inArray } from "drizzle-orm";
import { db, emailEvents, messages, subscribers } from "@workspace/db";
import { resend } from "./resend";

const RESEND_BATCH_SIZE = 100;
const inFlight = new Set<string>();

function withUnsubscribeFooter(bodyHtml: string, token: string): string {
  const unsubscribeUrl = `https://whisper119.com/unsubscribe/${token}`;
  return `${bodyHtml}<hr style="border:0;border-top:1px solid #ddd;margin:24px 0" /><p style="font-size:12px;color:#666">Unsubscribe: <a href="${unsubscribeUrl}">${unsubscribeUrl}</a></p>`;
}

export async function sendMessageToAllSubscribers(messageId: string): Promise<void> {
  if (inFlight.has(messageId)) throw new Error("NEWSLETTER_SEND_ALREADY_IN_PROGRESS");
  inFlight.add(messageId);
  try {
    if (!resend) throw new Error("RESEND_API_KEY_NOT_CONFIGURED");
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message) throw new Error("NEWSLETTER_MESSAGE_NOT_FOUND");
    if (message.status === "sent") return;

    const [activeSubscribers, existingEvents] = await Promise.all([
      db.select().from(subscribers).where(eq(subscribers.subscribed, true)),
      db.select({ subscriberId: emailEvents.subscriberId }).from(emailEvents).where(and(eq(emailEvents.messageId, messageId), eq(emailEvents.eventType, "sent"))),
    ]);
    const alreadySent = new Set(existingEvents.map((event) => event.subscriberId));
    const pending = activeSubscribers.filter((subscriber) => !alreadySent.has(subscriber.id));

    for (let offset = 0; offset < pending.length; offset += RESEND_BATCH_SIZE) {
      const batch = pending.slice(offset, offset + RESEND_BATCH_SIZE);
      const result = await resend.batch.send(batch.map((subscriber) => ({
        from: process.env.MAIL_FROM_ADDRESS ?? "",
        to: subscriber.email,
        subject: message.subject,
        html: withUnsubscribeFooter(message.bodyHtml, subscriber.unsubscribeToken),
      })));
      if (result.error) {
        console.error("Resend newsletter batch failed:", result.error);
        throw new Error(`Newsletter batch failed: ${result.error.message}`);
      }

      const acceptedCount = Array.isArray(result.data) ? result.data.length : batch.length;
      const accepted = batch.slice(0, acceptedCount);
      if (accepted.length) {
        await db.insert(emailEvents).values(accepted.map((subscriber) => ({
          messageId,
          subscriberId: subscriber.id,
          eventType: "sent" as const,
        })));
      }
    }

    await db.update(messages).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(messages.id, messageId));
  } finally {
    inFlight.delete(messageId);
  }
}