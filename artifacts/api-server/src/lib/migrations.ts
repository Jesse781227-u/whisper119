import { pool } from "@workspace/db";

/**
 * Applies small, idempotent compatibility migrations before the API accepts
 * traffic. This keeps managed/free deployments usable when no shell or
 * pre-deploy command is available.
 */
export async function applyRuntimeMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("ALTER TABLE books ADD COLUMN IF NOT EXISTS title_group_id text");
    await client.query("ALTER TABLE books ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en'");
    await client.query("UPDATE books SET title_group_id = id WHERE title_group_id IS NULL");
    await client.query("ALTER TABLE books ALTER COLUMN title_group_id SET NOT NULL");
    await client.query(`
      CREATE TABLE IF NOT EXISTS language_requests (
        id text PRIMARY KEY,
        book_id text NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        name text NOT NULL,
        country text NOT NULL,
        language text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query("CREATE INDEX IF NOT EXISTS language_requests_book_id_idx ON language_requests(book_id)");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
