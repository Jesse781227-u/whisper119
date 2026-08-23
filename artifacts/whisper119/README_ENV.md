This repository requires a local `.env` file for Firebase during development.

Do NOT commit `.env` to version control. The project `.gitignore` already excludes `*.env`.

Files added:
- `scripts/generate-env.js` — interactive helper to create `artifacts/whisper119/.env`.

Usage (from repo root):

1. Change to the app folder:

```bash
cd artifacts/whisper119
```

2. Run the helper (it will use existing environment variables if present, otherwise prompt):

```bash
node scripts/generate-env.js
```

3. Start the dev server:

```bash
pnpm install
pnpm dev
```

Set these values in the interactive prompt or in your shell environment before running the helper:

- `VITE_API_BASE_URL` — the public URL of the API service, without `/api`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

The API server uses Cloudflare R2 through its S3-compatible API. Configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, and `R2_PUBLIC_URL` in the API server environment. The R2 token needs object read/write access to the `whisper` bucket. Keep these values server-side; do not add them to the Vite app environment.

Because the admin browser uploads directly to the presigned R2 URL, configure the bucket CORS policy to allow `PUT` from the deployed storefront origin and expose `ETag` if your frontend needs it. The public bucket URL must also be enabled for cover objects, or the API proxy fallback will be used.

If you prefer CI builds to include Firebase configuration, set the corresponding repository secrets in GitHub and the provided CI workflow will pick them up at build time.
