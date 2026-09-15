import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { Webhook } from "svix";
import { db, emailEvents, messages, subscribers } from "@workspace/db";
import { getResendWebhookSecret } from "../lib/resend";

type ResendEvent = {
  type?: string;
  created_at?: string;
  data?: {
    to?: string | string[];
    tags?: Record<string, string>;
    bounce?: { type?: string };
  };
};

const eventTypes = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
} as const;

const router: IRouter = Router();

function firstRecipient(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

router.post("/webhooks/resend", async (req, res): Promise<void> => {
  const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody?.toString("utf8");
  if (!rawBody) {
    res.status(400).json({ error: "Webhook body is required." });
    return;
  }

  try {
    const secret = getResendWebhookSecret();
    const webhook = new Webhook(secret);
    const event = webhook.verify(rawBody, {
      "svix-id": req.header("svix-id") ?? "",
      "svix-timestamp": req.header("svix-timestamp") ?? "",
      "svix-signature": req.header("svix-signature") ?? "",
    }) as unknown as ResendEvent;
    const eventType = event.type ? eventTypes[event.type as keyof typeof eventTypes] : undefined;
    if (!eventType) {
      res.json({ received: true });
      return;
    }

    const email = firstRecipient(event.data?.to).trim().toLowerCase();
    if (!email) {
      res.json({ received: true });
      return;
    }
    const [subscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email));
    if (!subscriber) {
      res.json({ received: true });
      return;
    }

    const messageTag = event.data?.tags?.newsletter_message_id;
    const [message] = messageTag
      ? await db.select({ id: messages.id }).from(messages).where(eq(messages.id, messageTag))
      : [];
    const occurredAt = event.created_at ? new Date(event.created_at) : new Date();
    await db.insert(emailEvents).values({
      subscriberId: subscriber.id,
      messageId: message?.id ?? null,
      eventType,
      rawPayload: event,
      occurredAt: Number.isNaN(occurredAt.getTime()) ? new Date() : occurredAt,
    });

    const bounceType = event.data?.bounce?.type;
    const hardBounce = eventType === "bounced" && (!bounceType || /permanent/i.test(bounceType));
    if (hardBounce || eventType === "complained") {
      await db.update(subscribers).set({ subscribed: false }).where(and(eq(subscribers.id, subscriber.id), eq(subscribers.subscribed, true)));
    }
    res.json({ received: true });
  } catch (error) {
    req.log.warn({ err: error }, "Invalid Resend webhook");
    res.status(400).json({ error: "Invalid webhook signature or payload." });
  }
});

export default router;