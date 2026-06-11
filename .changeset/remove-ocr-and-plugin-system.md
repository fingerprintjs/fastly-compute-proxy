---
"fastly-compute-proxy": minor
---

Remove the Open Client Response (OCR) plugin system, sealed result decryption, and KV store saving.

The proxy is now a pure passthrough - it forwards identification requests and returns the API response directly without any post-processing.

**What to remove from your Fastly Compute service configuration:**

- Remove the `OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED` item from your Config Store. It is no longer read.
- Remove the `DECRYPTION_KEY` item from your Config Store. Sealed result decryption is no longer performed.
- Remove the `SAVE_TO_KV_STORE_PLUGIN_ENABLED` item from your Config Store. KV store saving is no longer performed.
- Remove the KV Store resource linked to your service. It is no longer used.

No changes are required to your JavaScript agent configuration.
