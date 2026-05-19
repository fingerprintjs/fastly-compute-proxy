<p align="center">
<a href="https://fingerprint.com">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://fingerprintjs.github.io/home/resources/logo_light.svg" />
<source media="(prefers-color-scheme: light)" srcset="https://fingerprintjs.github.io/home/resources/logo_dark.svg" />
<img src="https://fingerprintjs.github.io/home/resources/logo_dark.svg" alt="Fingerprint logo" width="312px" />
</picture>
</a>
</p>
<p align="center">
<a href="https://github.com/fingerprintjs/fastly-compute-proxy"><img src="https://img.shields.io/github/v/release/fingerprintjs/fastly-compute-proxy" alt="Current version"></a>
<a href="https://fingerprintjs.github.io/fastly-compute-proxy/"><img src="https://raw.githubusercontent.com/fingerprintjs/fastly-compute-proxy/gh-pages/badges.svg" alt="coverage"></a>
<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/:license-mit-blue.svg" alt="MIT license"></a>
<a href="https://discord.gg/39EpE2neBg"><img src="https://img.shields.io/discord/852099967190433792?style=logo&label=Discord&logo=Discord&logoColor=white" alt="Discord server"></a>
</p>

# Fingerprint Pro Fastly Compute Proxy Integration

[Fingerprint](https://fingerprint.com) is a device intelligence platform offering highly accurate visitor identification.

The Fastly Compute Proxy Integration is responsible for proxying identification and agent-download requests between your application and Fingerprint through your Fastly infrastructure. This integration uses [Fastly Compute services](https://www.fastly.com/products/compute).

## 🚧 Requirements and expectations

* **Integration in Beta**: Please report any issues to our [support team](https://fingerprint.com/support/).

* **Limited to Enterprise customers**: At this point, this proxy integration is accessible and exclusively supported for customers on the  **Enterprise** Plan. Other customers are encouraged to use [Custom subdomain setup](https://dev.fingerprint.com/docs/custom-subdomain-setup) or [Cloudflare Proxy Integration](https://dev.fingerprint.com/docs/cloudflare-integration).

* **Manual updates occasionally required**: The underlying data contract in the identification logic can change to keep up with browser updates. Using the Fastly Compute Proxy Integration might require occasional manual updates on your side. Ignoring these updates will lead to lower accuracy or service disruption.

## Getting started

This is a quick overview of the installation setup. For detailed step-by-step instructions, see the [Fastly Compute proxy integration guide in our documentation](https://dev.fingerprint.com/docs/fastly-compute-proxy-integration).

1. Go to the Fingerprint Dashboard > [**API Keys**](https://dashboard.fingerprint.com/api-keys) and click **Create Proxy Key** to create a proxy secret. You will use it later to authenticate your requests to Fingerprint APIs.

2. [Create an empty Compute Service](https://docs.fastly.com/en/guides/working-with-compute-services#creating-a-new-compute-service) in your Fastly account.

3. [Create a Config store](https://docs.fastly.com/en/guides/working-with-config-stores#creating-a-config-store) named `Fingerprint_Compute_Config_Store_<SERVICE_ID>`, where the suffix is your proxy integration's [Compute Service ID](https://docs.fastly.com/en/guides/about-services). Add the following values:

   | Key                          | Example Value | Description                                                                                                                                                            |
   | ---------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | AGENT_SCRIPT_DOWNLOAD_PATH   | z5kms2        | Random path segment for downloading the JavaScript agent.                                                                                                              |
   | GET_RESULT_PATH              | nocmjw        | Random path segment for Fingerprint identification requests.                                                                                                           |
   | OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED | false         | Set to `true` if you have [Open client response](https://dev.fingerprint.com/docs/open-client-response) enabled for your Fingerprint workspace. Defaults to `false`. |

4. [Create a Secret store](https://docs.fastly.com/en/guides/working-with-secret-stores#creating-a-secret-store) named `Fingerprint_Compute_Secret_Store_<SERVICE_ID>`, where the suffix is your proxy integration's [Compute Service ID](https://docs.fastly.com/en/guides/about-services). Add your proxy secret:

   | Key          | Example Value        | Description                                   |
   | ------------ | -------------------- | --------------------------------------------- |
   | PROXY_SECRET | 6XI9CLf3C9oHSB12TTaI | Fingerprint proxy secret generated in Step 1. |

5. Go to [Releases](https://github.com/fingerprintjs/fastly-compute-proxy/releases) to download the latest `fingerprint-fastly-compute-proxy-integration.tar.gz` package file.
6. Upload package to your Fastly Compute Service's **Package**.
7. Configure the Fingerprint [JavaScript Agent](https://dev.fingerprint.com/docs/install-the-javascript-agent#configuring-the-agent) on your website using the paths defined in Step 3.
    ```javascript
   import * as FingerprintJS from '@fingerprintjs/fingerprintjs-pro'

   const fpPromise = FingerprintJS.load({
     apiKey: 'PUBLIC_API_KEY',
     scriptUrlPattern: [
       'https://metrics.yourwebsite.com/AGENT_SCRIPT_DOWNLOAD_PATH?apiKey=<apiKey>&version=<version>&loaderVersion=<loaderVersion>',
       FingerprintJS.defaultScriptUrlPattern, // Fallback to default CDN in case of error
     ],
     endpoint: [
       'https://metrics.yourwebsite.com/GET_RESULT_PATH?region=us',
       FingerprintJS.defaultEndpoint // Fallback to default endpoint in case of error
     ],
   });
   ```

See the [Fastly Compute proxy integration guide](https://dev.fingerprint.com/docs/fastly-compute-proxy-integration#step-4-configure-the-fingerprint-client-agent-to-use-your-service) in our documentation for more details.

## Feedback and support

Please reach out to our [Customer Success team](https://fingerprint.com/support/) if run into any issues with the integration.

## License

This project is licensed under the [MIT license](./LICENSE).
