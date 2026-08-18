---
name: Firebase upload progress
description: Progress UI behavior and infrastructure checks for browser uploads to Firebase Storage
---

Treat the initial Firebase upload snapshot as indeterminate until a positive byte count and usable total are reported; do not render a determinate 0% bar while the browser is waiting on transfer events.

**Why:** A resumable upload can be pending, rejected, or running in a browser environment that does not expose granular progress. A frozen 0% display makes all three cases look like a broken React state update.

**How to apply:** Keep the upload task's visible error path intact, switch to determinate percentages only from real byte snapshots, and verify the configured Firebase bucket itself responds before attributing failures to UI wiring.