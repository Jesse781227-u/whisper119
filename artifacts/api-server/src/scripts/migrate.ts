/**
 * Applies the idempotent runtime migrations against DATABASE_URL and exits.
 * The Node server runs these on startup; the Cloudflare Worker does not, so
 * run this before each deploy that changes the schema:
 *
 *   DATABASE_URL=postgres://... pnpm --filter @workspace/api-server run migrate
 */
import { pool } from "@workspace/db";
import { applyRuntimeMigrations } from "../lib/migrations";

applyRuntimeMigrations()
  .then(() => console.log("Migrations applied."))
  .catch((error) => {
    console.error("Migrations failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
