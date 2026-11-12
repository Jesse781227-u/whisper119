import { inArray, or } from "drizzle-orm";
import { db, ordersTable, type NewsletterAudience, type Subscriber } from "@workspace/db";

export const NEW_SUBSCRIBER_WINDOW_DAYS = 30;

export const newsletterAudienceLabels: Record<NewsletterAudience, string> = {
  all_subscribers: "All active subscribers",
  verified_purchasers: "Verified purchasers",
  new_subscribers: "New subscribers (last 30 days)",
};

function normalizedEmail(email: string): string {
  return email.normalize("NFKC").trim().toLowerCase();
}

export async function getVerifiedPurchaserEmails(): Promise<Set<string>> {
  const rows = await db.select({ email: ordersTable.email }).from(ordersTable).where(or(
    inArray(ordersTable.paymentStatus, ["success", "confirmed"]),
    inArray(ordersTable.status, ["paid", "fulfilled"]),
  ));
  return new Set(rows.map((row) => normalizedEmail(row.email)));
}

export async function filterSubscribersByAudience(
  activeSubscribers: Subscriber[],
  audience: NewsletterAudience,
  verifiedPurchaserEmails?: Set<string>,
): Promise<Subscriber[]> {
  if (audience === "all_subscribers") return activeSubscribers;
  if (audience === "new_subscribers") {
    const cutoff = Date.now() - NEW_SUBSCRIBER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return activeSubscribers.filter((subscriber) => subscriber.createdAt.getTime() >= cutoff);
  }

  const purchaserEmails = verifiedPurchaserEmails ?? await getVerifiedPurchaserEmails();
  return activeSubscribers.filter((subscriber) => purchaserEmails.has(normalizedEmail(subscriber.email)));
}

export async function getNewsletterAudienceCounts(activeSubscribers: Subscriber[]): Promise<Record<NewsletterAudience, number>> {
  const verifiedPurchaserEmails = await getVerifiedPurchaserEmails();
  const [all, purchasers, newSubscribers] = await Promise.all([
    filterSubscribersByAudience(activeSubscribers, "all_subscribers", verifiedPurchaserEmails),
    filterSubscribersByAudience(activeSubscribers, "verified_purchasers", verifiedPurchaserEmails),
    filterSubscribersByAudience(activeSubscribers, "new_subscribers", verifiedPurchaserEmails),
  ]);
  return {
    all_subscribers: all.length,
    verified_purchasers: purchasers.length,
    new_subscribers: newSubscribers.length,
  };
}