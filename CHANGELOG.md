## 0.4.1

### Patch Changes

- Upgrade esbuild from 0.24 to 0.28 and @fastly/js-compute from 3.42 to 3.43. Both changes affect the built WASM artifact. ([09a16c1](https://github.com/fingerprintjs/fastly-compute-proxy/commit/09a16c19cf28954e72fd84d54e9516303ece0d23))

## 0.4.0

### Minor Changes

- Add support for [JavaScript agent v4](https://docs.fingerprint.com/docs/install-the-javascript-agent). All requests are now forwarded to the Fingerprint API origin, so the v4 agent works out of the box without any path configuration. Compatibility with JavaScript agent v3 is maintained.

  See the [migration guide](https://docs.fingerprint.com/docs/fastly-compute-v3-to-v4-migration-guide) for upgrade instructions. ([28e0bd6](https://github.com/fingerprintjs/fastly-compute-proxy/commit/28e0bd633f06d12fca45479d9b4a0c942eba9c31))

- Remove the Open Client Response (OCR) plugin system, sealed result decryption, and KV store saving. ([8f1ec53](https://github.com/fingerprintjs/fastly-compute-proxy/commit/8f1ec530753207d7a4acb452c4fdb7eced30b801))
- The integration now requires a single Fastly backend named `fingerprint` instead of region-specific backends (`api.fpjs.io`, `eu.api.fpjs.io`, `ap.api.fpjs.io`). The `fpcdn.io` CDN backend has also been removed. Region-specific backends are still supported as a fallback but are deprecated. ([8f1ec53](https://github.com/fingerprintjs/fastly-compute-proxy/commit/8f1ec530753207d7a4acb452c4fdb7eced30b801))

## 0.4.0-rc.0

### Minor Changes

- Add `@fingerprint/node-sdk` support to the plugin system. Plugins now receive either a V3 `EventResponse` or V4 `Event` depending on the API response format. Use the exported `isV4Event` type guard and `getEventId` helper to work with both versions. ([1f75fcf](https://github.com/fingerprintjs/fastly-compute-proxy/commit/1f75fcfb5a72ec06f26a0ddd4104e0854b36d788))
- Add JS Agent V4 support via a catch-all default route. All unmatched requests are now forwarded to the API origin instead of returning 404. V3 routes are now conditionally registered and take priority over the catch-all.

  > [!NOTE] This change adds support for Fingerprint [JavaScript agent v4](https://docs.fingerprint.com/reference/js-agent-v4). Compatibility with JavaScript agent v3 is maintained, you can upgrade to the latest JavaScript agent at your convenience.
  >
  > When upgrading to the JavaScript agent v4, remove the `scriptUrlPattern` and `endpoint` options. Replace them with a single `endpoints` option pointing to your Fastly Compute proxy integration domain:
  >
  > ```diff
  > - const fpPromise = FingerprintJS.load({
  > -   apiKey: PUBLIC_API_KEY,
  > -   scriptUrlPattern: "https://yourwebsite.com/AGENT_SCRIPT_DOWNLOAD_PATH?apiKey=<apiKey>&version=<version>&loaderVersion=<loaderVersion>",
  > -   endpoint: "https://yourwebsite.com/GET_RESULT_PATH?region=eu",
  > - });
  >
  > + const fpPromise = Fingerprint.start({
  > +   apiKey: PUBLIC_API_KEY,
  > +   endpoints: "https://yourwebsite.com/?region=eu",
  > + });
  > ```
  >
  > See [Migrating the JavaScript agent from v3 to v4](https://docs.fingerprint.com/reference/migrating-from-v3-to-v4) for more details. ([28e0bd6](https://github.com/fingerprintjs/fastly-compute-proxy/commit/28e0bd633f06d12fca45479d9b4a0c942eba9c31))

- Migrate V3 agent download from `fpcdn.io` to the regional API origin. The `fpcdn.io` backend is no longer used and can be safely removed from the Fastly Compute service dashboard.

  > [!TIP] The `fpcdn.io` backend is no longer used. You can safely remove it from your Fastly Compute service dashboard. ([585cfc9](https://github.com/fingerprintjs/fastly-compute-proxy/commit/585cfc9c69e56fed10368de0305c705991643506))

### Patch Changes

- Support compressed (gzip, deflate) API responses in the Open Client Response plugin system. ([1dec352](https://github.com/fingerprintjs/fastly-compute-proxy/commit/1dec352522ec36b25ad15e0988557615b48d7269))

## 0.3.1

### Patch Changes

- send other proxy headers even if proxy secret is undefined ([5597be5](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/5597be5fd8b78251853fc8d4a4bd566699bcc830))

## 0.3.0

### Minor Changes

- add backend checks to status page ([62260ae](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/62260aeb5f5fa7c10aabb7729cf4d09f5c55f087))
- add fastly compute service version to status page ([b7cd7b1](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/b7cd7b15dfd60708452f0ccef8d138387655ddbb))
- add links to the status page ([bed4323](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/bed4323b666ff30cc2451eda6dfb27d139fa1421))
- improve status page ([d1733b5](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/d1733b5768f8c1eaf95f041c2c92ff24b019c36b))
- restructure status page ([b8ead8f](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/b8ead8f28f10384ff9bff0484bae0cd6cdfe2563))
- status page shows save_to_kvstore_plugin value ([4eb3aaa](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/4eb3aaae7fd0fb39119456830f06219f4a585c98))

### Patch Changes

- add cors headers for error response ([0c9a721](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/0c9a721e4be67676505b09f14e36fb482d6f91d5))
- build command missing metadata ([3d77697](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/3d776976c72b3490b90aff4729f56170fbe2f9a7))
- create artifact via metadata ([ba22a53](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/ba22a538130c75d22aa119aeb403390ca35f9426))
- enable metadata on pack step ([565affd](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/565affd396c42b5ee7bb2a332a33b5a2dd0331c5))
- github ci not running prebuild ([9957582](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/9957582dc9ec64781ea718b3946fa9c7e34ccb9b))
- more clear error message ([74a1a34](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/74a1a347f8d3ae423b74eed9007d54150a927635))
- show status page correct store name for kv storage ([5df22d3](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/5df22d368c5a7f38b46ffbc7e71a65d8d0d6cb08))
- status page wording ([468fd54](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/468fd54f1e786c1d2177e827e526059eda9b9b37))
- undefined message for status page ([ef643f4](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/ef643f429427f452424a427a53a849e227dcc12e))
- update fastly cli version to fix metadata bug ([95b2d60](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/95b2d60ad5bbe5c85a4c7075827cc69ad775122e))
- when open client response is enabled, non utf body throws an error ([d88dc2b](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/d88dc2bb6ee36df4a3098ef390c3afd1ed151c2b))

## 0.2.1

### Patch Changes

- change release artifact name ([a3d44da](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/a3d44da4628930f73f5d0d87d3f64ee0d20b8ca4))
- move plugins to the next tick of event loop ([6a3d554](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/6a3d5547ad9c928b436431c5b4212abf473f4c1b))

## 0.2.0

### Minor Changes

- add prefix to config store name ([3838318](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/38383186439c5b1f7362b7462ea1a578287a59e3))
- move proxy secret to secret store ([b943878](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/b94387882bd4d485733faa6cc712ee6e298d6e58))
- show all configurations on status page ([e996354](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/e9963545ae6be1fa44e2fa41ef74306067e6a75e))

## 0.1.0

### Minor Changes

- initial version ([df2f710](https://github.com/fingerprintjs/fingerprint-pro-fastly-compute-proxy-integration/commit/df2f710261c5100796d4d9a7702c51596f4c3232))
