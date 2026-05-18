---
"fingerprint-pro-fastly-compute-proxy-integration": minor
---

Add JS Agent V4 support via a catch-all default route. All unmatched requests are now forwarded to the API origin instead of returning 404. V3 routes are now conditionally registered and take priority over the catch-all.
