import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    const bookCounts = await db.execute(sql`select count(*)::int as count from books`);
    const categoryCounts = await db.execute(sql`select count(*)::int as count from categories`);
    const bookCount = bookCounts.rows[0];
    const categoryCount = categoryCounts.rows[0];
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json({ ...data, database: "ok", bookCount: Number(bookCount?.count ?? 0), categoryCount: Number(categoryCount?.count ?? 0) });
  } catch (error) {
    res.status(503).json({ status: "error", database: "unavailable" });
    _req.log?.error?.({ err: error }, "Database health check failed");
  }
});

export default router;
