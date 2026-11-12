/**
 * Lists every book with more than 6 tags so they can be trimmed by hand in
 * the admin. Read-only: it never removes tags.
 *
 *   DATABASE_URL=postgres://... pnpm --filter @workspace/api-server run tags:report
 */
import { pool } from "@workspace/db";

const MAX_TAGS = 6;

const { rows } = await pool.query<{ title: string; language: string; primary_category: string | null; tags: string[] }>(`
  SELECT b.title, b.language, b.primary_category, array_agg(c.name ORDER BY c.name) AS tags
  FROM books b
  JOIN book_categories bc ON bc.book_id = b.id
  JOIN categories c ON c.id = bc.category_id
  GROUP BY b.id
  HAVING count(*) > $1
  ORDER BY count(*) DESC, b.title`, [MAX_TAGS]);

if (!rows.length) {
  console.log(`Every book has ${MAX_TAGS} tags or fewer.`);
} else {
  console.log(`${rows.length} book(s) have more than ${MAX_TAGS} tags:\n`);
  for (const book of rows) {
    console.log(`• ${book.title} [${book.language}] — ${book.tags.length} tags (primary: ${book.primary_category ?? "none"})`);
    console.log(`  ${book.tags.join(", ")}\n`);
  }
}
await pool.end();
