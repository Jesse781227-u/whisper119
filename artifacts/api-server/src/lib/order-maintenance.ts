import { and, eq, lt } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";

/** Pending orders older than this were never paid and are marked abandoned. */
export const ABANDON_AFTER_MS = 48 * 60 * 60 * 1000;

/**
 * Marks stale unpaid checkouts as `abandoned`. Abandoned orders never count as
 * paid; if a late payment still arrives, the payment confirmation treats them
 * like `pending` and completes the order normally.
 */
export async function markAbandonedOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - ABANDON_AFTER_MS);
  const rows = await db.update(ordersTable)
    .set({ status: "abandoned" })
    .where(and(eq(ordersTable.status, "pending"), lt(ordersTable.createdAt, cutoff)))
    .returning({ id: ordersTable.id });
  return rows.length;
}
