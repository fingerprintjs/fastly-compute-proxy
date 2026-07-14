# Contributing to Fingerprint Pro Fastly Compute Proxy Integration

## Requirements

- Node 24+
- TypeScript 6+
- [Fastly CLI](https://developer.fastly.com/learning/compute/#install-the-fastly-cli)

## Working with the Code

We prefer using [pnpm](https://pnpm.io/) for managing dependencies and running scripts.

- The `main` branch is locked for direct pushes.
- Releases are created from the `main` branch.

For proposing changes, use the standard [pull request approach](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request). It’s recommended to discuss fixes or new features in the Issues first.

### How to publish

We use [changesets](https://github.com/changesets/changesets) for handling release notes. If there are relevant changes, please add them to a changeset via `pnpm exec changeset`. You need to run `pnpm install` before doing so.

### How to Build

1. After cloning the repository, run `pnpm install` to install dependencies.
2. Run `pnpm build` to compile the project and assemble the WebAssembly output.
3. The build artifact is located in the `bin/main.wasm` file, which will be deployed to Fastly.

### Using custom store names

By default, the service package provided in releases assumes the following names for the Config store and Secret Store:

* `Fingerprint_Compute_Config_Store_<SERVICE_ID>`
* `Fingerprint_Compute_Secret_Store_<SERVICE_ID>`

To use a custom name prefix for both(Secret and Config) stores, use the `STORE_NAME_PREFIX` environment variable to build a custom service package:

```shell=
STORE_NAME_PREFIX=CustomName fastly compute build
```

Your custom built package in `pkg/fingerprint-fastly-compute-proxy-integration.tar.gz` will use your custom prefix in store names like:

* `CustomName_Config_Store_<SERVICE_ID>`
* `CustomName_Secret_Store_<SERVICE_ID>`


### Code Style

We enforce code quality using [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/). To check code style:

```shell
pnpm lint
```

You aren't required to run these checks manually, as the CI pipeline will handle it. However, to fix code style issues locally:

```shell
pnpm lint:fix
```

### Commit Style

We follow [conventional commits](https://www.conventionalcommits.org) for commit messages.

### How to Test

#### Unit Tests

To run unit tests:

```shell
pnpm test
```

#### End-to-End (e2e) Tests

End-to-end tests are run automatically for every pull request using our CI workflows.
