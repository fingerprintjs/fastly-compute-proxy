---
"fingerprint-fastly-compute-proxy-integration": minor
---

Add JS Agent V4 support via a catch-all default route. All unmatched requests are now forwarded to the API origin instead of returning 404. V3 routes are now conditionally registered and take priority over the catch-all.

> [!NOTE]
> This change adds support for Fingerprint [JavaScript agent v4](https://docs.fingerprint.com/reference/js-agent-v4). Compatibility with JavaScript agent v3 is maintained, you can upgrade to the latest JavaScript agent at your convenience.
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
> See [Migrating the JavaScript agent from v3 to v4](https://docs.fingerprint.com/reference/migrating-from-v3-to-v4) for more details.
