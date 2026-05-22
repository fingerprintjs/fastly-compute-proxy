---
"fingerprint-pro-fastly-compute-proxy-integration": minor
---

Add `@fingerprint/node-sdk` support to the plugin system. Plugins now receive either a V3 `EventResponse` or V4 `Event` depending on the API response format. Use the exported `isV4Event` type guard and `getEventId` helper to work with both versions.
