import { pool } from "@workspace/db";
// Minimal client surface used by the migrations (avoids a direct pg dependency).
type PoolClient = { query<R = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: R[] }>; release(): void };

/**
 * Schema changes, applied idempotently (IF NOT EXISTS) on every run.
 */
const SCHEMA_STATEMENTS = [
  "ALTER TABLE books ADD COLUMN IF NOT EXISTS title_group_id text",
  "ALTER TABLE books ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en'",
  "ALTER TABLE messages ADD COLUMN IF NOT EXISTS body_text text NOT NULL DEFAULT ''",
  `CREATE TABLE IF NOT EXISTS newsletter_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    subject text NOT NULL,
    body_html text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  "UPDATE subscribers SET email = lower(trim(email)) WHERE email <> lower(trim(email)) AND NOT EXISTS (SELECT 1 FROM subscribers duplicate WHERE duplicate.id <> subscribers.id AND lower(trim(duplicate.email)) = lower(trim(subscribers.email)))",
  "UPDATE books SET title_group_id = id WHERE title_group_id IS NULL",
  "ALTER TABLE books ALTER COLUMN title_group_id SET NOT NULL",
  `CREATE TABLE IF NOT EXISTS language_requests (
    id text PRIMARY KEY,
    book_id text NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    name text NOT NULL,
    country text NOT NULL,
    language text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  "CREATE INDEX IF NOT EXISTS language_requests_book_id_idx ON language_requests(book_id)",
  "ALTER TABLE language_requests ADD COLUMN IF NOT EXISTS email text",
  // Series, formats, page count, primary category, free samples.
  `CREATE TABLE IF NOT EXISTS series (
    id text PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text NOT NULL DEFAULT '',
    cover_object_path text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  "ALTER TABLE books ADD COLUMN IF NOT EXISTS formats text[] NOT NULL DEFAULT ARRAY['PDF']::text[]",
  "ALTER TABLE books ADD COLUMN IF NOT EXISTS series_id text REFERENCES series(id) ON DELETE SET NULL",
  "ALTER TABLE books ADD COLUMN IF NOT EXISTS series_number integer",
  "ALTER TABLE books ADD COLUMN IF NOT EXISTS page_count integer",
  "ALTER TABLE books ADD COLUMN IF NOT EXISTS primary_category text",
  "ALTER TABLE books ADD COLUMN IF NOT EXISTS sample_text text",
  "ALTER TABLE books ADD COLUMN IF NOT EXISTS sample_object_path text",
  "CREATE INDEX IF NOT EXISTS books_series_id_idx ON books(series_id)",
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`,
];

/** Genres preferred as a book's primary category when backfilling. */
const PRIMARY_CATEGORY_PRIORITY = [
  "Werewolf/Lycan romance",
  "Billionaire romance",
  "CEO romance",
  "Mafia romance",
  "Paranormal romance",
  "Fantasy romance (romantasy)",
  "Dark romance",
  "Contract marriage",
  "Enemies to lovers",
];

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "series";
}

/**
 * Series that appear under slightly different titles in the catalogue. The
 * key is a normalised title prefix; the value is the series' display name.
 */
const SERIES_ALIASES: Array<[RegExp, string, string]> = [
  [/^rebirth of the broken luna/i, "Rebirth of the Broken Luna", "Rebirth of the Broken Luna: A Second Chance at Luna's Heart"],
  [/^(the )?alpha('s)? king('s)? pet/i, "The Alpha King's Pet", "The Alpha King's Pet: His Omega Slave"],
];

async function seriesFromBookTitles(client: PoolClient) {
  const { rows } = await client.query<{ id: string; title: string }>(
    "SELECT id, title FROM books WHERE language = 'en' AND series_id IS NULL",
  );
  for (const book of rows) {
    const match = book.title.match(/^(.*?)[\s,;:.-]*\bbook\s+(\d+)\s*$/i);
    if (!match) continue;
    const base = match[1].trim().replace(/\s*;\s*/g, ": ");
    const volume = Number(match[2]);
    const alias = SERIES_ALIASES.find(([pattern]) => pattern.test(base));
    const name = alias?.[1] ?? base;
    const slug = slugify(name);
    await client.query(
      "INSERT INTO series (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING",
      [`series-${slug}`, name, slug],
    );
    const { rows: [series] } = await client.query<{ id: string }>("SELECT id FROM series WHERE slug = $1", [slug]);
    // Drop the redundant "Book N" from the title; the number now lives in series_number.
    await client.query(
      "UPDATE books SET series_id = $1, series_number = $2, title = $3 WHERE id = $4",
      [series.id, volume, alias?.[2] ?? base, book.id],
    );
  }
}

/** One-time data fixes, each recorded in schema_migrations so it runs once. */
const DATA_MIGRATIONS: Array<{ name: string; run: (client: PoolClient) => Promise<void> }> = [
  {
    // Snapshot of the fields the fixes below rewrite, so any of them can be undone.
    name: "2026-11-12-backup-book-fields",
    run: async (client) => {
      await client.query("CREATE TABLE IF NOT EXISTS books_backup_20261112 AS SELECT id, title, author, format, now() AS backed_up_at FROM books");
    },
  },
  {
    name: "2026-11-12-normalize-author",
    run: async (client) => {
      await client.query("UPDATE books SET author = 'Whisper 119' WHERE author <> 'Whisper 119' AND replace(lower(author), ' ', '') LIKE '%whisper119%'");
    },
  },
  {
    name: "2026-11-12-fix-alpha-king-title",
    run: async (client) => {
      await client.query("UPDATE books SET title = replace(title, 'The Alpha''s King Pet', 'The Alpha King''s Pet') WHERE title LIKE 'The Alpha''s King Pet%'");
    },
  },
  {
    name: "2026-11-12-formats-from-format",
    run: async (client) => {
      await client.query("UPDATE books SET formats = ARRAY[upper(format)]::text[] WHERE upper(format) IN ('PDF', 'EPUB')");
    },
  },
  { name: "2026-11-12-series-from-titles", run: seriesFromBookTitles },
  {
    name: "2026-11-12-primary-category",
    run: async (client) => {
      const { rows } = await client.query<{ id: string; names: string[] }>(`
        SELECT b.id, coalesce(array_agg(c.name ORDER BY c.name) FILTER (WHERE c.name IS NOT NULL), '{}') AS names
        FROM books b
        LEFT JOIN book_categories bc ON bc.book_id = b.id
        LEFT JOIN categories c ON c.id = bc.category_id
        WHERE b.primary_category IS NULL
        GROUP BY b.id`);
      for (const book of rows) {
        const primary = PRIMARY_CATEGORY_PRIORITY.find((name) => book.names.includes(name)) ?? book.names[0];
        if (primary) await client.query("UPDATE books SET primary_category = $1 WHERE id = $2", [primary, book.id]);
      }
    },
  },
];

/**
 * Applies schema changes and pending one-time data fixes. Safe to call
 * repeatedly and from several processes at once (serialised by an advisory
 * lock inside one transaction).
 */
export async function applyRuntimeMigrations(): Promise<void> {
  const client = (await pool.connect()) as unknown as PoolClient;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(119119)");
    for (const statement of SCHEMA_STATEMENTS) await client.query(statement);
    const { rows } = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.name));
    for (const migration of DATA_MIGRATIONS) {
      if (applied.has(migration.name)) continue;
      await migration.run(client);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [migration.name]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Latest migration name; the Worker skips work once this is recorded. */
export const LATEST_MIGRATION = DATA_MIGRATIONS[DATA_MIGRATIONS.length - 1].name;

/**
 * Worker helper: checks (once per isolate) whether the latest migration is
 * recorded, and applies migrations if not.
 */
let ensured: Promise<void> | null = null;
export function ensureMigrations(): Promise<void> {
  ensured ??= (async () => {
    try {
      const { rows } = await pool.query("SELECT 1 FROM schema_migrations WHERE name = $1", [LATEST_MIGRATION]);
      if (rows.length) return;
    } catch {
      // schema_migrations does not exist yet.
    }
    await applyRuntimeMigrations();
  })().catch((error) => {
    ensured = null;
    throw error;
  });
  return ensured;
}
