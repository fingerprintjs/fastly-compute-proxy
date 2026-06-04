import { env } from 'fastly:env'
import { ConfigStore } from 'fastly:config-store'
import { SecretStore } from 'fastly:secret-store'
import { KVStore } from 'fastly:kv-store'

export function getNamesForStores() {
  const serviceId = env('FASTLY_SERVICE_ID')
  const storeNamePrefix = process.env.STORE_NAME_PREFIX
  const configStoreName = `${storeNamePrefix}_Config_Store_${serviceId}`
  const secretStoreName = `${storeNamePrefix}_Secret_Store_${serviceId}`
  const kvStoreName = `Fingerprint_Results_${serviceId}`

  return {
    configStoreName,
    secretStoreName,
    kvStoreName,
  }
}
export function getConfigStore() {
  const { configStoreName } = getNamesForStores()
  return new ConfigStore(configStoreName)
}

export function getSecretStore() {
  const { secretStoreName } = getNamesForStores()
  return new SecretStore(secretStoreName)
}

export function getBuiltinKVStore() {
  const { kvStoreName } = getNamesForStores()
  return new KVStore(kvStoreName)
}
