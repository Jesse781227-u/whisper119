---
name: Firebase auth foundation
description: Constraints around the prepared Firebase reader authentication and Firestore security model
---

Firebase reader authentication can be safely enabled from public `VITE_FIREBASE_*` web configuration, but Firestore books, orders, and subscriber writes must remain server-owned. The browser Firebase config is not a server credential.

**Why:** The Firebase connector was unavailable and no server credential exists in the workspace. Enabling privileged Firestore operations without one would create an insecure or split-brain data path.

**How to apply:** Keep PostgreSQL/Paystack authoritative until a secure Firebase Admin/service-account setup is authorized. When adding Firestore server access, preserve the deny-by-default rules and update indexes with any new user-owned queries.

The current generated Zod toolchain does not support OpenAPI `format: email` output as `zod.email()`, so newsletter input contracts should use compatible string constraints plus explicit server-side validation if stricter email validation is required.