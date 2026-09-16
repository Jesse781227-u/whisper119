import { db, ordersTable, pool } from "@workspace/db";
import { eq } from "drizzle-orm";
import { upsertSubscriber } from "../lib/subscribers";

async function main(): Promise<void> {
  const rows = await db.select({ email: ordersTable.email }).from(ordersTable).where(eq(ordersTable.newsletterOptIn, true));
  const emails = [...new Set(rows.map((row) => row.email.normalize("NFKC").trim().toLowerCase()).filter(Boolean))];
  let processed = 0;

  for (const email of emails) {
    await upsertSubscriber({ email, source: "purchase", sendWelcome: false });
    processed += 1;
    console.log(`Backfilled ${email}`);
  }

  console.log(`Backfilled ${processed} distinct buyer emails.`);
}

main().catch((error) => {
  console.error("Buyer subscriber backfill failed:", error);
  process.exitCode = 1;
}).finally(() => pool.end());
