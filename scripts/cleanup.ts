import { createClient } from './utils/createClient.ts'
import { assertSafeToDelete, assertStoreBelongsToService } from './api/assertSafeToDelete.ts'

const STORE_NAME_PREFIX = process.env.STORE_NAME_PREFIX ?? 'E2ETest'
const DRY_RUN = process.env.DRY_RUN === 'true'

/**
 * Deletes the ephemeral Fastly service a pull request created, plus the config and secret
 * stores that were created alongside it. Safe to run more than once: a service that is already
 * gone is not an error.
 */
async function main() {
  const serviceName = requireEnv('SERVICE_NAME')
  requireEnv('FASTLY_API_TOKEN')

  if (DRY_RUN) {
    console.log('DRY_RUN=true - nothing will actually be deleted.')
  }

  const service = await findService(serviceName)
  if (!service) {
    console.log(`No service named "${serviceName}" found; nothing to clean up.`)
    return
  }

  // Throws unless every guard passes.
  assertSafeToDelete(service, serviceName)
  const serviceId = service.id as string
  console.log(`Target: "${service.name}" (${serviceId}), type: ${service.type}`)

  await deactivateActiveVersion(serviceId)
  await deleteService(serviceId, service.name as string)
  await deleteStores(serviceId)
}

async function findService(name: string) {
  try {
    const found = await createClient('service').searchService({ name })
    if (!found?.id) {
      return undefined
    }
    return createClient('service').getServiceDetail({ service_id: found.id })
  } catch (e) {
    const status = (e as { status?: number }).status
    if (status === 404) {
      return undefined
    }
    throw e
  }
}

/** A service cannot be deleted while a version is active. */
async function deactivateActiveVersion(serviceId: string) {
  const detail = await createClient('service').getServiceDetail({ service_id: serviceId })
  const active = (detail.versions ?? []).find((version: { active?: boolean }) => version.active)
  if (!active) {
    console.log('No active version to deactivate.')
    return
  }
  console.log(`Deactivating version ${active.number}...`)
  if (DRY_RUN) {
    return
  }
  await createClient('version').deactivateServiceVersion({ service_id: serviceId, version_id: active.number })
}

async function deleteService(serviceId: string, serviceName: string) {
  console.log(`Deleting service "${serviceName}" (${serviceId})...`)
  if (DRY_RUN) {
    return
  }
  await createClient('service').deleteService({ service_id: serviceId })
  console.log('Service deleted.')
}

/** Stores outlive their service, and count against account limits, so they go too. */
async function deleteStores(serviceId: string) {
  const configName = `${STORE_NAME_PREFIX}_Config_Store_${serviceId}`
  const secretName = `${STORE_NAME_PREFIX}_Secret_Store_${serviceId}`

  const configStores = await createClient('configStore').listConfigStores()
  const configStore = (configStores ?? []).find((store: { name?: string }) => store.name === configName)
  if (configStore) {
    assertStoreBelongsToService(configStore.name, serviceId, STORE_NAME_PREFIX)
    console.log(`Deleting config store "${configStore.name}"...`)
    if (!DRY_RUN) {
      await createClient('configStore').deleteConfigStore({ config_store_id: configStore.id })
    }
  } else {
    console.log(`No config store named "${configName}".`)
  }

  const secretStoresResponse = await createClient('secretStore').getSecretStores()
  const secretStores = secretStoresResponse?.data ?? secretStoresResponse ?? []
  const secretStore = secretStores.find((store: { name?: string }) => store.name === secretName)
  if (secretStore) {
    assertStoreBelongsToService(secretStore.name, serviceId, STORE_NAME_PREFIX)
    console.log(`Deleting secret store "${secretStore.name}"...`)
    if (!DRY_RUN) {
      await createClient('secretStore').deleteSecretStore({ store_id: secretStore.id })
    }
  } else {
    console.log(`No secret store named "${secretName}".`)
  }
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
    console.log(DRY_RUN ? 'Dry run complete.' : 'Cleanup complete!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Cleanup failed', err)
    process.exit(1)
  })
