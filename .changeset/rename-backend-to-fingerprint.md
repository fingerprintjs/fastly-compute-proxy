---
"fastly-compute-proxy": minor
---

The integration now requires a single Fastly backend named `fingerprint` instead of region-specific backends (`api.fpjs.io`, `eu.api.fpjs.io`, `ap.api.fpjs.io`). The `fpcdn.io` CDN backend has also been removed. Region-specific backends are still supported as a fallback but are deprecated.
