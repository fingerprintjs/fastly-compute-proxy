---
"fastly-compute-proxy": minor
---

Add support for [JavaScript agent v4](https://docs.fingerprint.com/docs/install-the-javascript-agent). All requests are now forwarded to the Fingerprint API origin, so the v4 agent works out of the box without any path configuration. Compatibility with JavaScript agent v3 is maintained.

See the [migration guide](https://docs.fingerprint.com/docs/fastly-compute-v3-to-v4-migration-guide) for upgrade instructions.
