# Whisper 119

Whisper 119 is a boutique, single-seller digital bookstore for international readers buying DRM-free PDF and EPUB ebooks.

## Run & Operate

- `pnpm --filter @workspace/whisper119 run dev` — run the storefront
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`
- Required for checkout: `PAYSTACK_SECRET_KEY`
- Required for admin login: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- Required for attachment delivery: `SMTP_HOST`, `SMTP_PORT` (optional, defaults to 587), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Object Storage values are provisioned by Replit: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, and `PUBLIC_OBJECT_SEARCH_PATHS`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite + Tailwind CSS + Wouter + TanStack Query
- Build: esbuild for the API and Vite for web artifacts

## Where things live

- `artifacts/whisper119/src/` — storefront, checkout, confirmation, admin shell, theme, and cart
- `artifacts/api-server/src/routes/` — Express routes for catalogue, orders/Paystack, admin, and storage
- `artifacts/api-server/src/lib/` — signed admin sessions, object storage, payment verification, and email delivery
- `scripts/data/demo-books.json` — fictional development catalogue fixture
- `pnpm --filter @workspace/scripts run seed:demo-books` — idempotently seed the development catalogue and private sample attachments
- `lib/api-spec/openapi.yaml` — API source of truth
- `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` — generated clients and validation schemas
- `lib/db/src/schema/` — Drizzle tables for books, orders, and order items
- `attached_assets/whisper119-build_1785743700173.zip` — recovered compiled design reference, not application source

## Architecture decisions

- Paystack payment initialization and confirmation are server-owned. A client redirect never marks an order paid.
- The Paystack webhook verifies the `x-paystack-signature`, calls Paystack's verify endpoint, then marks the order paid.
- Ebook files remain private in Object Storage and are attached to the delivery email; the confirmation page deliberately has no download button.
- Cover objects can be served publicly, but ebook object paths are rejected by the HTTP storage route.
- Cart and light/dark theme preferences are local browser state; catalogue, orders, and admin data are database-backed.

## Product

Customers can browse featured titles and categories, filter the catalogue, view a book detail, keep one copy of each title in a cart, choose a country/currency context, and start a dynamic Paystack transaction. After server-side payment confirmation, the API sends the purchased PDF/EPUB files as actual attachments with receipt details. Failed international card payments remain retryable.

The private admin desk provides cookie-backed login, dashboard totals, catalogue creation with cover/ebook uploads, and order/payment/delivery-status views. There is no stock quantity or physical shipping workflow.

## User preferences

- Keep the current cover-heavy bookstore direction: mobile-first app chrome, rounded cards and pills, bold sans-serif typography, a dark romance palette, and restrained motion. Use moonlit plum, wine, rose, silver, and antique-gold cues with subtle night-forest atmosphere; do not use a light theme. Do not copy chapter-reading, fake ratings/views, or customer download-link behavior from the reference.
- Customer-facing copy should sound casual and personal, as if the author is speaking directly to visitors. Prefer first-person language about the author's books and avoid generic bookstore filler, curation disclaimers, and decorative sparkle icons.
- Push commits to the connected GitHub repository after meaningful changes and report push failures explicitly.
- For visual redesign work, implement and push each meaningful page or section as its own segment before moving to the next.

## Gotchas

- Direct email attachments are capped conservatively at 20 MB combined because many recipient providers cap attachments around 10–25 MB. Oversized delivery fails closed and leaves `deliveryEmailSent` false for inspection.
- `PAYSTACK_SECRET_KEY` and SMTP credentials are intentionally fail-closed; do not create fake payment or delivery behavior.
- Run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`, then run `pnpm --filter @workspace/db run push` after schema changes.
- Vite configs use build-safe defaults for `PORT` and `BASE_PATH`, because Render/build environments do not always provide runtime workflow variables.
- Development includes 51 clearly fictional demo books across fiction, science fiction, adventure, poetry, mystery, travel, wellbeing, business, technology, history, biography, and cooking. They use local cover artwork and tiny private sample attachments for testing. Replace or remove these records before treating the catalogue as production inventory.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
