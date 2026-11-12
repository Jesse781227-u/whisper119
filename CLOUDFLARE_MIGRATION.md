# Moving whisper119.com's backend from Render to Cloudflare

## Decisions
- **Postgres stays on Render.** Only the API (and the storefront) move.
- **DNS is already on Cloudflare** (nameservers `emerie`/`matt.ns.cloudflare.com`).
- Deploy into the Cloudflare account that owns the whisper119.com zone.

## Why
On Render's free tier the API sleeps when idle. The first visitor after a quiet
spell waits 30–60 s for it to wake, and admin requests time out while it boots.
Cloudflare Workers have no sleep or cold boot.

## Target architecture

```
                    whisper119.com (Cloudflare zone)
                               │  zone routes whisper119.com/* , www/*
                  ┌────────────┴─────────────┐
                  │   Worker "whisper119"    │  Smart Placement: runs near the DB
  /, /shop, ...  ─┤ static assets (edge CDN) │  ← never runs code, never sleeps
  /api/*         ─┤ Express app (nodejs_compat)
  /unsubscribe/* ─┤                          │
  cron */5       ─┤ scheduled newsletters    │
                  └──┬──────────┬────────┬───┘
                     │          │        │
                Hyperdrive     R2     Resend / Flutterwave / Firebase
                     │
           Render Postgres (unchanged, external URL + SSL)
```

Storefront and API share one origin, so the
`whisper119back.onrender.com` URL and cross-origin CORS go away.
`VITE_API_BASE_URL` defaults to same-origin, so leave it unset.

## What changed in the code

| Area | Before (Render web service) | Now |
|---|---|---|
| Entry point | `src/index.ts` (`app.listen`) | `src/worker.ts` for Cloudflare; `index.ts` still works for Node |
| DB connection | one global `pg.Pool` | pool per request via `runWithDatabase` (Workers can't share sockets across requests); Hyperdrive does the real pooling |
| Migrations | ran at every boot | `pnpm --filter @workspace/api-server run migrate` before deploying (Node still runs them at boot) |
| Scheduler | `node-cron` | Cron Trigger in `wrangler.jsonc` → `sendDueNewsletters()` |
| Request logging | `pino-http` | `src/lib/request-logger.ts` (same `req.log` API) |
| Firestore admin lookup | `google-auth-library` | Web Crypto service-account JWT in `src/lib/auth.ts` |
| SMTP (`nodemailer`) | always loaded | loaded only when SMTP is used; on Workers mail goes through Resend |
| R2 client | built at import (crashes boot if misconfigured) | built on first use |

Checked locally with `wrangler dev`: assets and SPA routes, `/api/exchange-rates`
(200), admin auth (401 without a token), and the cron handler. **Not tested
yet:** real DB queries, R2, Resend and Flutterwave. Test them on the
`workers.dev` URL (step 5).

## Step-by-step

### 0. Fix DNS records that didn't come across (do this now)
Checked on 2026-11-12. Present: MX (`mx1`/`mx2.privateemail.com`), SPF,
`_dmarc`, `resend._domainkey`.
**Missing.** Add them in Cloudflare → DNS, all **DNS only** (grey cloud):
- Resend: the `send` MX record (`feedback-smtp.<region>.amazonses.com`,
  priority 10) and the `send` TXT record (`v=spf1 include:amazonses.com ~all`).
  Copy the exact values from Resend → Domains → whisper119.com. Without these,
  Resend marks the domain unverified and order emails may stop.
- Private Email: `autodiscover` and `autoconfig` CNAME → `privateemail.com`.
  These are only needed for automatic mail-client setup.

### 1. Log Wrangler into the right Cloudflare account
```bash
npx wrangler logout
npx wrangler login      # pick the account that owns the whisper119.com zone
npx wrangler whoami     # confirm before going further
```

### 2. Point Hyperdrive at the Render Postgres
From the Render account that holds the database, copy the **External Database
URL**, then:
```bash
cd artifacts/api-server
npx wrangler hyperdrive create whisper119-db \
  --connection-string='postgres://USER:PASS@HOST.render.com/DB?sslmode=require'
```
Paste the returned id into `wrangler.jsonc` → `hyperdrive[0].id`.
- Render's free Postgres **expires 30 days after creation**. Check the
  database's plan and expiry date in Render. If it's on the free plan, upgrade
  it or keep regular `pg_dump` backups.
- If the database has an IP allow-list ("Access Control"), allow `0.0.0.0/0`.
  Hyperdrive connects from Cloudflare IPs, and the password + SSL still guard
  it.

Take a backup before the first deploy, then apply migrations:
```bash
pg_dump --format=custom --no-owner --file=db-backups/pre-cloudflare.dump "$RENDER_EXTERNAL_URL"
DATABASE_URL="$RENDER_EXTERNAL_URL" pnpm --filter @workspace/api-server run migrate
```

### 3. Config and secrets
In `wrangler.jsonc` → `vars`, fill in `R2_ACCOUNT_ID`, `R2_ENDPOINT` and
`R2_PUBLIC_URL`. Then set each secret:
```bash
for s in R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY RESEND_API_KEY RESEND_WEBHOOK_SECRET \
         FLW_SECRET_KEY FLW_PUBLIC_KEY FLW_ENCRYPTION_KEY FLW_SECRET_HASH \
         FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY; do npx wrangler secret put $s; done
```
> The R2 keys were once committed to git (commit `729a9c1`). Make **new** R2
> API tokens and revoke the old ones.

### 4. Deploy to workers.dev
Pick one option:

- **Workers Builds (recommended):** Dashboard → Workers → Create → Import a
  repository.
  - Root directory: `/`
  - Build command: `pnpm --filter @workspace/whisper119 run build`
  - Deploy command: `npx wrangler deploy --config artifacts/api-server/wrangler.jsonc`
  - Build variables: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
    `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
    `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- **From WSL/Linux/macOS:** `pnpm --filter @workspace/api-server run deploy`.
  Plain Windows can't build because `pnpm-workspace.yaml` strips esbuild's
  Windows binary. Work around it by setting `ESBUILD_BINARY_PATH`.

Add the `workers.dev` hostname to Firebase → Authentication → Authorized
domains.

### 5. Test on workers.dev
`/api/healthz` (should show `database: ok` with book counts), the shop, a cover
image, admin login and orders, a newsletter test send, and an NGN test payment.

### 6. Cut over (no DNS change needed)
Uncomment `routes` in `wrangler.jsonc` and deploy again. The Worker takes over
`whisper119.com/*` and `www.whisper119.com/*` through the existing proxied
records. Webhook URLs stay `https://whisper119.com/api/...`: check that
Flutterwave and Resend point there and not at `whisper119back.onrender.com`.

### 7. Clean up (after a week of stable traffic)
- Delete `.github/workflows/render-health-monitor.yml`.
- Retire the Render **web services** only. Keep the Postgres.
- Remove the GitHub token from the `origin` remote URL and revoke it.

## Rollback
Comment `routes` out again and redeploy, or delete the routes in the dashboard.
Traffic falls back to whatever the DNS records point at. The database is
shared, so there's no data to reconcile.

## Costs
- Workers Free: 100k requests/day, 10 ms CPU per request. Upgrade to Workers
  Paid ($5/mo) if the dashboard shows "exceeded CPU" errors.
- Hyperdrive and R2 fit within the free tiers at this traffic.
