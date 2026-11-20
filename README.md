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

* **Limited to Enterprise customers**: At this point, this proxy integration is accessible and exclusively supported for customers on the  **Enterprise** Plan. Other customers are encouraged to use [Custom subdomain setup](https://docs.fingerprint.com/docs/custom-subdomain-setup) or [Cloudflare Proxy Integration](https://docs.fingerprint.com/docs/cloudflare-integration).

* **Manual updates occasionally required**: The underlying data contract in the identification logic can change to keep up with browser updates. Using the Fastly Compute Proxy Integration might require occasional manual updates on your side. Ignoring these updates will lead to lower accuracy or service disruption.

## Getting started

This is a quick overview of the installation setup. For detailed step-by-step instructions, see the [Fastly Compute proxy integration guide in our documentation](https://docs.fingerprint.com/docs/fastly-compute-proxy-integration).

1. Go to the Fingerprint Dashboard > [**API Keys**](https://dashboard.fingerprint.com/api-keys) and click **Create Proxy Key** to create a proxy secret. You will use it later to authenticate your requests to Fingerprint APIs.

2. [Create an empty Compute Service](https://docs.fastly.com/en/guides/working-with-compute-services#creating-a-new-compute-service) in your Fastly account.

3. Add a backend named `fingerprint` to your Compute service, pointing to the [regional Fingerprint API host](https://docs.fingerprint.com/docs/regions) for your workspace:

   | Region       | Host              |
   | ------------ | ----------------- |
   | Global (US)  | `api.fpjs.io`     |
   | EU           | `eu.api.fpjs.io`  |
   | Asia         | `ap.api.fpjs.io`  |

   The proxy integration expects the backend to be named exactly `fingerprint`.

4. [Create a Secret store](https://docs.fastly.com/en/guides/working-with-secret-stores#creating-a-secret-store) named `Fingerprint_Compute_Secret_Store_<SERVICE_ID>`, where the suffix is your proxy integration's [Compute Service ID](https://docs.fastly.com/en/guides/about-services). Add your proxy secret:

   | Key          | Example Value        | Description                                   |
   | ------------ | -------------------- | --------------------------------------------- |
   | PROXY_SECRET | 6XI9CLf3C9oHSB12TTaI | Fingerprint proxy secret generated in Step 1. |

5. Go to [Releases](https://github.com/fingerprintjs/fastly-compute-proxy/releases) to download the latest `fingerprint-fastly-compute-proxy-integration.tar.gz` package file.
6. Upload package to your Fastly Compute Service's **Package**.
7. Configure the Fingerprint [JavaScript Agent](https://docs.fingerprint.com/docs/install-the-javascript-agent#configuring-the-agent) on your website:
   ```javascript
   import * as Fingerprint from '@fingerprint/agent';

   const fp = Fingerprint.start({
     apiKey: 'PUBLIC_API_KEY',
     endpoints: 'https://metrics.yourwebsite.com/',
     region: 'us',
   });
   ```

   > **JavaScript agent v3**: If you are still using the v3 agent (`@fingerprintjs/fingerprintjs-pro`), you need to also [create a Config store](https://docs.fastly.com/en/guides/working-with-config-stores#creating-a-config-store) named `Fingerprint_Compute_Config_Store_<SERVICE_ID>` with `AGENT_SCRIPT_DOWNLOAD_PATH` and `GET_RESULT_PATH` entries, and configure `scriptUrlPattern` and `endpoint` accordingly. See the [v3 to v4 migration guide](https://docs.fingerprint.com/docs/fastly-compute-v3-to-v4-migration-guide) for details.

See the [Fastly Compute proxy integration guide](https://docs.fingerprint.com/docs/fastly-compute-proxy-integration#step-3-configure-the-fingerprint-client-agent-to-use-your-service) in our documentation for more details.

## Deploying with Terraform

You can also deploy the integration with the [Fingerprint Fastly Compute Terraform module](https://github.com/fingerprintjs/terraform-fastly-compute-fingerprint-proxy-integration). The module uploads the package from the releases of this repository to your empty Compute service, adds the `fingerprint` backend, and creates the Secret store. You still need to create the empty Compute service first and add `PROXY_SECRET` to the Secret store after the first deploy. Each `terraform apply` updates the service to the newest release within the version line the module supports, currently v0.4.x.

The module uses the `fastly` provider from your configuration, so configure the provider with your Fastly API token:

```terraform
terraform {
  required_version = ">=1.5"
  required_providers {
    fastly = {
      source  = "fastly/fastly"
      version = ">= 7.1.0"
    }
  }
}

provider "fastly" {
  # To use the FASTLY_API_KEY environment variable instead, leave out api_key.
  api_key = "FASTLY_API_TOKEN"
}

module "fingerprint_fastly_compute_integration" {
  source             = "fingerprintjs/compute-fingerprint-proxy-integration/fastly"
  version            = "~> 2.0"
  integration_domain = "metrics.yourwebsite.com"
  service_id         = "EMPTY_FASTLY_COMPUTE_SERVICE_ID"
  region             = "us"
}
```

For step-by-step instructions and the full list of variables, see [Deploy Fastly Compute Proxy Integration with Terraform](https://docs.fingerprint.com/docs/deploy-fastly-compute-using-terraform). If you use v1 of the module, see [Migrate the Fastly Compute Terraform module from v1 to v2](https://docs.fingerprint.com/docs/fastly-compute-terraform-module-v1-to-v2-migration-guide).

## Feedback and support

Please reach out to our [Customer Success team](https://fingerprint.com/support/) if run into any issues with the integration.

## License

This project is licensed under the [MIT license](./LICENSE).
