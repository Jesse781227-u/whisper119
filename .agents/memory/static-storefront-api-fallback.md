---
name: Static storefront API fallback
description: Deployment behavior to account for when the storefront is hosted separately from its API
---

When a static storefront and API are deployed separately, an unproxied `/api/*` request can return the SPA HTML shell with a successful `200` instead of JSON. The customer-facing catalogue must therefore prefer valid API data but retain a small local placeholder catalogue for unavailable or malformed API responses.

**Why:** The published storefront served `index.html` for catalogue routes even though the development API and database were healthy, leaving mobile shelves visually empty.

**How to apply:** Treat a non-array or empty catalogue response as unavailable in Home, Shop, category navigation, and direct book-detail routes. Resolve detail IDs from the local catalogue when the item endpoint is unavailable, and keep persistent database seeding for the real API. Redeploy the static frontend plus API routing together when moving beyond placeholders.