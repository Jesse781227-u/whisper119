import { eq, sql } from "drizzle-orm";
import { db, subscribers, type Subscriber } from "@workspace/db";
import { buildWelcomeEmailHtml, sendEmail } from "./mailer";
import { htmlToText } from "./newsletter-content";

export type SubscriberSource = "signup_form" | "purchase";

export async function upsertSubscriber(input: {
  email: string;
  name?: string | null;
  source: SubscriberSource;
  sendWelcome?: boolean;
}): Promise<Subscriber> {
  const email = input.email.normalize("NFKC").trim().toLowerCase();
  if (!email) throw new Error("SUBSCRIBER_EMAIL_REQUIRED");

  const [existingSubscriber] = await db.select().from(subscribers)
    .where(sql`lower(trim(${subscribers.email})) = ${email}`);
  if (existingSubscriber) {
    const [subscriber] = await db.update(subscribers)
      .set({
        email,
        source: sql`CASE WHEN ${subscribers.source} = ${input.source} THEN ${subscribers.source} ELSE 'both' END`,
      })
      .where(eq(subscribers.id, existingSubscriber.id))
      .returning();
    return subscriber ?? existingSubscriber;
  }

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
    if (input.sendWelcome === false) return createdSubscriber;
    const unsubscribeUrl = `https://whisper119.com/unsubscribe/${createdSubscriber.unsubscribeToken}`;
    const html = buildWelcomeEmailHtml({ subscriberName: createdSubscriber.name, unsubscribeUrl });
    await sendEmail({
      to: createdSubscriber.email,
      subject: "Welcome to Whisper 119 📚",
      html,
      text: htmlToText(html),
    });
    return createdSubscriber;
  }

  const [conflictedSubscriber] = await db.select().from(subscribers).where(eq(subscribers.email, email));
  if (!conflictedSubscriber) throw new Error("SUBSCRIBER_UPSERT_FAILED");

  const [subscriber] = await db.update(subscribers)
    .set({
      source: sql`CASE WHEN ${subscribers.source} = ${input.source} THEN ${subscribers.source} ELSE 'both' END`,
    })
    .where(eq(subscribers.id, conflictedSubscriber.id))
    .returning();

  return subscriber ?? conflictedSubscriber;
}
