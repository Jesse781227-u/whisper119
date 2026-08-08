---
name: Firebase auth foundation
description: Constraints around the prepared Firebase reader authentication and Firestore security model
---

Firebase reader authentication is enabled from public `VITE_FIREBASE_*` web configuration and uses the Firebase Web SDK directly; it does not require a Replit connector. Firestore books, orders, and subscriber writes remain server-owned; the browser Firebase config is not a server credential.

**Why:** Public Firebase settings are sufficient for reader authentication and user-owned profile reads/writes, but privileged catalogue, order, and subscriber synchronization still needs server authorization.

**How to apply:** Keep PostgreSQL/Paystack authoritative for catalogue and payment data. When adding Firestore server access, preserve the deny-by-default rules and update indexes with any new user-owned queries.

The current generated Zod toolchain does not support OpenAPI `format: email` output as `zod.email()`, so newsletter input contracts should use compatible string constraints plus explicit server-side validation if stricter email validation is required.

Replit's managed GitHub push uses the account-level GitHub source-control connection, not a project secret named `GITHUB_PERSONAL_ACCESS_TOKEN`.

**Why:** The project secret was present, but the managed push operation still returned `NO_CREDENTIALS` until the separate GitHub connector authorization was available.

**How to apply:** If a push is blocked by `NO_CREDENTIALS`, use the GitHub source-control connection flow rather than reading, copying, or embedding the project secret.