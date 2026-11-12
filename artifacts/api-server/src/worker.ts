/**
 * Cloudflare Workers entry point.
 *
 * One Worker serves the whole site:
 *   - static storefront files (artifacts/whisper119/dist/public) come straight
 *     from Cloudflare's edge via the `assets` binding, without running code;
 *   - /api/* and /unsubscribe/* are routed to the existing Express app, which
 *     runs on Workers' Node.js HTTP compatibility layer;
 *   - the Cron Trigger replaces node-cron for scheduled newsletters.
 *
 * Postgres is reached through Hyperdrive (pooled, cached connections to Neon).
 * Workers cannot share sockets between requests, so each request gets its own
 * short-lived pool via `runWithDatabase`.
 *
 * Schema migrations do NOT run here; run `pnpm --filter @workspace/api-server
 * run migrate` against the database before deploying (see CLOUDFLARE_MIGRATION.md).
 */
import { httpServerHandler } from "cloudflare:node";
import { runWithDatabase } from "@workspace/db";
import app from "./app";
import { sendDueNewsletters } from "./lib/newsletter-scheduler";

interface Env {
  HYPERDRIVE: { connectionString: string };
  ASSETS: { fetch(request: Request): Promise<Response> };
}

interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

const PORT = 8787;
app.listen(PORT);
const expressHandler = httpServerHandler({ port: PORT });

function connectionString(env: Env): string {
  return env.HYPERDRIVE?.connectionString || process.env.DATABASE_URL || "";
}

export default {
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    // Visitor country from Cloudflare's edge, used to decide whether to show
    // NGN alongside USD prices. Never cached: it differs per visitor.
    if (pathname === "/api/geo") {
      const country = (request as Request & { cf?: { country?: string } }).cf?.country ?? null;
      return Response.json({ country }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (!pathname.startsWith("/api/") && pathname !== "/api" && !pathname.startsWith("/unsubscribe/")) {
      return env.ASSETS.fetch(request);
    }
    return runWithDatabase(
      connectionString(env),
      () => expressHandler.fetch!(request as never, env as never, ctx as never) as Promise<Response>,
      (promise) => ctx.waitUntil(promise),
    );
  },

  async scheduled(_controller: unknown, env: Env, ctx: WorkerContext): Promise<void> {
    await runWithDatabase(connectionString(env), sendDueNewsletters, (promise) => ctx.waitUntil(promise));
  },
};
