ALTER TABLE books ADD COLUMN IF NOT EXISTS title_group_id text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';
UPDATE books SET title_group_id = id WHERE title_group_id IS NULL;
ALTER TABLE books ALTER COLUMN title_group_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS language_requests (
  id text PRIMARY KEY,
  book_id text NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  name text NOT NULL,
  country text NOT NULL,
  language text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS language_requests_book_id_idx ON language_requests(book_id);
