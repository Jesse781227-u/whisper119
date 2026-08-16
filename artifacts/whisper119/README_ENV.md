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

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

The API server uses the same Firebase Storage bucket through Google Cloud Storage. Configure `GCS_BUCKET_NAME` (or `FIREBASE_STORAGE_BUCKET`) and Google Cloud credentials using `GOOGLE_APPLICATION_CREDENTIALS`, or `GCS_CLIENT_EMAIL` and `GCS_PRIVATE_KEY`. The service account must be allowed to create signed URLs and read/write objects in that bucket.

If you prefer CI builds to include Firebase configuration, set the corresponding repository secrets in GitHub and the provided CI workflow will pick them up at build time.
