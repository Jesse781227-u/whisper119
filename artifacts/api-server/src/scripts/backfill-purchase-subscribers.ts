import { db, ordersTable, pool } from "@workspace/db";
import { eq } from "drizzle-orm";
import { upsertSubscriber } from "../lib/subscribers";

async function main(): Promise<void> {
  const rows = await db.select({ email: ordersTable.email }).from(ordersTable).where(eq(ordersTable.newsletterOptIn, true));
  const emails = [...new Set(rows.map((row) => row.email?.normalize("NFKC").trim().toLowerCase()).filter((email): email is string => Boolean(email)))];
  let processed = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      await upsertSubscriber({ email, source: "purchase", sendWelcome: false });
      processed += 1;
      console.log(`Backfilled ${email}`);
    } catch (error) {
      failed += 1;
      console.error(`Could not backfill ${email}:`, error);
    }
  }

  console.log(`Backfill complete: ${processed} succeeded, ${failed} failed, ${emails.length} distinct buyer emails.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Buyer subscriber backfill failed:", error);
  process.exitCode = 1;
}).finally(() => pool.end());
