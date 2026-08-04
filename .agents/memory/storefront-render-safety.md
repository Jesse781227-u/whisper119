---
name: Storefront render safety
description: Defensive rendering practices for the API-backed customer storefront.
---

API-backed storefront pages should treat collection responses as untrusted at render time: normalize optional arrays before calling `map`, `filter`, `slice`, or `reduce`, and keep a top-level React recovery boundary so an unexpected response or component error cannot leave customers with a silent white page.

**Why:** A transient or partial response can otherwise throw during rendering after the initial page has loaded, blanking the whole storefront even when the API and other routes remain healthy.

**How to apply:** Use safe collection defaults at every customer-facing data boundary, preserve useful previously loaded data during refetches, and provide a visible reload/recovery action for errors that escape query-level handling.