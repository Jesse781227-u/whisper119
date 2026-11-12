import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type Database = NodePgDatabase<typeof schema>;
type DatabaseScope = { pool: pg.Pool; db: Database };

/**
 * Cloudflare Workers cannot reuse a TCP socket across requests, so the Worker
 * entry opens a short-lived pool per request (through Hyperdrive, which does
 * the real pooling) and runs the request inside `runWithDatabase`. Long-lived
 * Node processes (local dev, scripts) fall back to one lazily created global
 * pool built from DATABASE_URL.
 */
const scope = new AsyncLocalStorage<DatabaseScope>();
let globalScope: DatabaseScope | null = null;

function createScope(connectionString: string, max?: number): DatabaseScope {
  const pool = new Pool({ connectionString, ...(max ? { max } : {}) });
  return { pool, db: drizzle(pool, { schema }) };
}

function currentScope(): DatabaseScope {
  const requestScope = scope.getStore();
  if (requestScope) return requestScope;
  if (!globalScope) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    globalScope = createScope(process.env.DATABASE_URL);
  }
  return globalScope;
}

/**
 * Runs `fn` with a request-scoped pool and closes the pool afterwards. Pass the
 * Worker's `ctx.waitUntil` so closing the pool does not delay the response.
 */
export async function runWithDatabase<T>(
  connectionString: string,
  fn: () => Promise<T>,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<T> {
  const requestScope = createScope(connectionString, 5);
  const close = () => requestScope.pool.end().catch(() => {});
  try {
    return await scope.run(requestScope, fn);
  } finally {
    if (waitUntil) waitUntil(close());
    else await close();
  }
}

function forward<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const target = resolve();
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export const db: Database = forward(() => currentScope().db);
export const pool: pg.Pool = forward(() => currentScope().pool);

export * from "./schema";
