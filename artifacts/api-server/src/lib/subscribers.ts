import { sql } from "drizzle-orm";
import { db, subscribers, type Subscriber } from "@workspace/db";

export type SubscriberSource = "signup_form" | "purchase";

export async function upsertSubscriber(input: {
  email: string;
  name?: string | null;
  source: SubscriberSource;
}): Promise<Subscriber> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("SUBSCRIBER_EMAIL_REQUIRED");

  const [subscriber] = await db.insert(subscribers)
    .values({
      email,
      name: input.name ?? null,
      source: input.source,
      unsubscribeToken: crypto.randomUUID(),
    })
    .onConflictDoUpdate({
      target: subscribers.email,
      set: {
        source: sql`CASE WHEN ${subscribers.source} = ${input.source} THEN ${subscribers.source} ELSE 'both' END`,
      },
    })
    .returning();

  return subscriber;
}