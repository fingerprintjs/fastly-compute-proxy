---
"fastly-compute-proxy": minor
---

The integration now uses a single Fastly backend named `fingerprint` instead of region-specific backend names. Region-specific backend names (`api.fpjs.io`, `eu.api.fpjs.io`, `ap.api.fpjs.io`) are **deprecated** and will be removed in a future release. They are still supported as a fallback to avoid breaking existing deployments.

**What to update in your Fastly Compute service configuration:**

Add a new backend named exactly `fingerprint` pointing to your regional Fingerprint API host:

| Region | Backend name | Address |
|--------|-------------|---------|
| US (default) | `fingerprint` | `api.fpjs.io` |
| EU | `fingerprint` | `eu.api.fpjs.io` |
| AP | `fingerprint` | `ap.api.fpjs.io` |

Once the `fingerprint` backend is added, the deprecated region-named backends (`api.fpjs.io`, `eu.api.fpjs.io`, `ap.api.fpjs.io`) are no longer used and can be safely removed from your service.
