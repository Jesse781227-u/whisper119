import { eq, sql } from "drizzle-orm";
import { db, subscribers, type Subscriber } from "@workspace/db";
import { buildWelcomeEmailHtml, sendEmail } from "./mailer";

export type SubscriberSource = "signup_form" | "purchase";

export async function upsertSubscriber(input: {
  email: string;
  name?: string | null;
  source: SubscriberSource;
}): Promise<Subscriber> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("SUBSCRIBER_EMAIL_REQUIRED");

  const [createdSubscriber] = await db.insert(subscribers)
    .values({
      email,
      name: input.name ?? null,
      source: input.source,
      unsubscribeToken: crypto.randomUUID(),
    })
    .onConflictDoNothing({ target: subscribers.email })
    .returning();

  if (createdSubscriber) {
    const unsubscribeUrl = `https://whisper119.com/unsubscribe/${createdSubscriber.unsubscribeToken}`;
    await sendEmail({
      to: createdSubscriber.email,
      subject: "Welcome to Whisper 119 📚",
      html: buildWelcomeEmailHtml({ subscriberName: createdSubscriber.name, unsubscribeUrl }),
    });
    return createdSubscriber;
  }

  const [existingSubscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email));
  if (!existingSubscriber) throw new Error("SUBSCRIBER_UPSERT_FAILED");

  const [subscriber] = await db.update(subscribers)
    .set({
      source: sql`CASE WHEN ${subscribers.source} = ${input.source} THEN ${subscribers.source} ELSE 'both' END`,
    })
    .where(eq(subscribers.id, existingSubscriber.id))
    .returning();

  return subscriber ?? existingSubscriber;
}