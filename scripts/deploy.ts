import { createClient } from './utils/createClient.ts'
import { createVersion } from './api/createVersion.ts'
import { deployPackage } from './api/deployPackage.ts'
import { activateVersion } from './api/activateVersion.ts'
import { waitForActivationIfConfigured } from './api/waitForActivation.ts'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_DIR = path.join(__dirname, '../pkg')

/**
 * Deploys a package to an *existing* Fastly Compute service.
 *
 * Unlike `scripts/ci.ts`, this never creates a service and never creates a blank version:
 * it clones the currently active version so domains, backends and store links are preserved.
 */
async function main() {
  const serviceId = requireEnv('FASTLY_SERVICE_ID')
  requireEnv('FASTLY_API_TOKEN')
  const packagePath = resolvePackagePath()

  const service = await createClient('service').getServiceDetail({ service_id: serviceId })
  console.log(`Service "${service.name}" (${service.id}), type: ${service.type}`)

  const activeVersion = (service.versions ?? []).find((version: { active?: boolean }) => version.active)
  if (!activeVersion) {
    throw new Error(
      `Service ${serviceId} has no active version. Refusing to deploy: a new blank version would drop domains, backends and store links. Activate a version manually first.`
    )
  }
  console.log(`Cloning active version ${activeVersion.number}...`)

  const draft = await createVersion(serviceId, activeVersion.number)
  console.log(`Created draft version ${draft.number}`)

  console.log(`Uploading package ${packagePath}...`)
  await deployPackage(serviceId, draft.number, packagePath)
  console.log('Package uploaded')

  await activateVersion(serviceId, draft.number)
  console.log(`Activated version ${draft.number} (was ${activeVersion.number})`)

  await waitForActivationIfConfigured(draft.number)
}

/**
 * Uses PACKAGE_PATH when the caller knows exactly which artifact to ship (CI passes the path
 * reported by whichever step produced it). Otherwise derives it from the `name` in fastly.toml,
 * so the package name lives in exactly one place.
 *
 * Name-based rather than "the only .tar.gz in pkg/": `fastly compute pack` also leaves a small
 * pkg/package.tar.gz intermediate behind, which contains no wasm and must never be deployed.
 */
function resolvePackagePath() {
  const explicit = process.env.PACKAGE_PATH
  if (explicit) {
    if (!fs.existsSync(explicit)) {
      throw new Error(`PACKAGE_PATH points at ${explicit}, which does not exist.`)
    }
    return explicit
  }

  const expected = path.join(PACKAGE_DIR, `${packageNameFromManifest()}.tar.gz`)
  if (!fs.existsSync(expected)) {
    throw new Error(`No package at ${expected}. Run "pnpm build" first, or set PACKAGE_PATH.`)
  }
  return expected
}

function packageNameFromManifest() {
  const manifestPath = path.join(__dirname, '../fastly.toml')
  const match = /^\s*name\s*=\s*"([^"]+)"/m.exec(fs.readFileSync(manifestPath, 'utf8'))
  if (!match) {
    throw new Error(`Could not read a "name" field from ${manifestPath}`)
  }
  return match[1]
}

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

main()
  .then(() => {
    console.log('Deploy completed!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Deploy failed', err)
    process.exit(1)
  })
