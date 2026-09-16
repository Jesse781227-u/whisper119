import { and, eq, inArray } from "drizzle-orm";
import { db, emailEvents, messages, subscribers } from "@workspace/db";
import { getMailFromAddress, resend } from "./resend";
import { htmlToText } from "./newsletter-content";

const RESEND_BATCH_SIZE = 100;
const inFlight = new Set<string>();

function withUnsubscribeFooter(bodyHtml: string, token: string): string {
  const unsubscribeUrl = `https://whisper119.com/unsubscribe/${token}`;
  return `${bodyHtml}<hr style="border:0;border-top:1px solid #ddd;margin:24px 0" /><p style="font-size:12px;color:#666">Unsubscribe: <a href="${unsubscribeUrl}">${unsubscribeUrl}</a></p>`;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMessageToAllSubscribers(messageId: string): Promise<{ sent: number; failed: string[] }> {
  if (inFlight.has(messageId)) throw new Error("NEWSLETTER_SEND_ALREADY_IN_PROGRESS");
  inFlight.add(messageId);
  try {
    if (!resend) throw new Error("RESEND_API_KEY_NOT_CONFIGURED");
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message) throw new Error("NEWSLETTER_MESSAGE_NOT_FOUND");
    if (message.status === "sent") return { sent: 0, failed: [] };

    const [activeSubscribers, existingEvents] = await Promise.all([
      db.select().from(subscribers).where(eq(subscribers.subscribed, true)),
      db.select({ subscriberId: emailEvents.subscriberId }).from(emailEvents).where(and(eq(emailEvents.messageId, messageId), eq(emailEvents.eventType, "sent"))),
    ]);
    const alreadySent = new Set(existingEvents.map((event) => event.subscriberId));
    const invalid = activeSubscribers.filter((subscriber) => !emailPattern.test(subscriber.email.trim().toLowerCase()));
    const pending = activeSubscribers.filter((subscriber) => emailPattern.test(subscriber.email.trim().toLowerCase()) && !alreadySent.has(subscriber.id));
    const failed: string[] = invalid.map((subscriber) => subscriber.email);
    let sent = 0;

    for (let offset = 0; offset < pending.length; offset += RESEND_BATCH_SIZE) {
      const batch = pending.slice(offset, offset + RESEND_BATCH_SIZE);
      for (const subscriber of batch) {
        const payload = {
          from: getMailFromAddress(), to: subscriber.email.trim().toLowerCase(), subject: message.subject,
          html: withUnsubscribeFooter(message.bodyHtml, subscriber.unsubscribeToken),
          text: `${message.bodyText || htmlToText(message.bodyHtml)}\n\nUnsubscribe: https://whisper119.com/unsubscribe/${subscriber.unsubscribeToken}`,
          tags: [{ name: "newsletter_message_id", value: messageId }],
        };
        try {
          const result = await resend.emails.send(payload);
          console.info("Resend newsletter send response", { recipient: subscriber.email, result });
          if (result.error) throw new Error(result.error.message);
          await db.insert(emailEvents).values({ messageId, subscriberId: subscriber.id, eventType: "sent" });
          sent += 1;
        } catch (error) {
          console.error("Resend newsletter send failed", { recipient: subscriber.email, error });
          failed.push(subscriber.email);
        }
      }
    }

    if (failed.length > 0) throw new Error(`NEWSLETTER_SEND_PARTIAL_FAILURE: sent=${sent}; failed=${failed.join(", ")}`);
    await db.update(messages).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(messages.id, messageId));
    return { sent, failed };
  } finally {
    inFlight.delete(messageId);
  }
}
