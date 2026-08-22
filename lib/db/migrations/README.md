# Production database migration

The category migration is a data migration, not a Drizzle schema push. Run it
once against the production PostgreSQL database before deploying the API that
reads `categories` and `book_categories`:

```sh
psql "$DATABASE_URL" --single-transaction --file lib/db/migrations/0001_dynamic_categories.sql
```

It creates and seeds the category tables, maps legacy book categories, moves
`Completed Series` to `books.is_completed`, and removes only the obsolete
`books.categories` column. It does not delete book rows or storage objects.

The script is safe to rerun after a failed or interrupted deployment.
