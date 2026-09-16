import { db, ordersTable, pool } from "@workspace/db";
import { upsertSubscriber } from "../lib/subscribers";

async function main(): Promise<void> {
  const rows = await db.selectDistinct({ email: ordersTable.email }).from(ordersTable);
  const emails = rows.map((row) => row.email.trim().toLowerCase()).filter(Boolean);
  let processed = 0;

  for (const email of emails) {
    await upsertSubscriber({ email, source: "purchase" });
    processed += 1;
    console.log(`Backfilled ${email}`);
  }

  console.log(`Backfilled ${processed} distinct buyer emails.`);
}

main().catch((error) => {
  console.error("Buyer subscriber backfill failed:", error);
  process.exitCode = 1;
}).finally(() => pool.end());