import { getBuiltinKVStore, getConfigStore, getSecretStore } from './utils/getStore'

export type IntegrationEnv = {
  AGENT_SCRIPT_DOWNLOAD_PATH: string | null
  GET_RESULT_PATH: string | null
  PROXY_SECRET: string | null
  OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED: string | null
  DECRYPTION_KEY: string | null
  SAVE_TO_KV_STORE_PLUGIN_ENABLED: string | null
}

const Defaults: IntegrationEnv = {
  AGENT_SCRIPT_DOWNLOAD_PATH: 'agent',
  GET_RESULT_PATH: 'result',
  PROXY_SECRET: null,
  OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED: 'false',
  DECRYPTION_KEY: null,
  SAVE_TO_KV_STORE_PLUGIN_ENABLED: 'false',
}

function getVarOrDefault(
  variable: keyof IntegrationEnv,
  defaults: IntegrationEnv
): (env: IntegrationEnv) => string | null {
  return function (env: IntegrationEnv): string | null {
    return (env[variable] || defaults[variable]) as string | null
  }
}

function isVarSet(variable: keyof IntegrationEnv): (env: IntegrationEnv) => boolean {
  return function (env: IntegrationEnv): boolean {
    return Boolean(env[variable]?.trim())
  }
}

export const agentScriptDownloadPathVarName = 'AGENT_SCRIPT_DOWNLOAD_PATH'
const getAgentPathVar = getVarOrDefault(agentScriptDownloadPathVarName, Defaults)
export const isScriptDownloadPathSet = isVarSet(agentScriptDownloadPathVarName)

export function getScriptDownloadPath(env: IntegrationEnv): string {
  const agentPathVar = getAgentPathVar(env)
  return `/${agentPathVar}`
}

export const getResultPathVarName = 'GET_RESULT_PATH'
const getGetResultPathVar = getVarOrDefault(getResultPathVarName, Defaults)
export const isGetResultPathSet = isVarSet(getResultPathVarName)

export function getGetResultPath(env: IntegrationEnv): string {
  const getResultPathVar = getGetResultPathVar(env)
  return `/${getResultPathVar}(/.*)?`
}

export const proxySecretVarName = 'PROXY_SECRET'
const getProxySecretVar = getVarOrDefault(proxySecretVarName, Defaults)
export const isProxySecretSet = isVarSet(proxySecretVarName)

export const decryptionKeyVarName = 'DECRYPTION_KEY'
const getDecryptionKeyVar = getVarOrDefault(decryptionKeyVarName, Defaults)
export const isDecryptionKeySet = isVarSet(decryptionKeyVarName)

export const openClientResponseVarName = 'OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED'
export const isOpenClientResponseSet = (env: IntegrationEnv) =>
  env.OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED === 'true' || env.OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED === 'false'

export const isOpenClientResponseEnabled = (env: IntegrationEnv) =>
  env[openClientResponseVarName]?.toLowerCase() === 'true'

export const saveToKvStorePluginEnabledVarName = 'SAVE_TO_KV_STORE_PLUGIN_ENABLED'
export const isSaveToKvStorePluginEnabledSet = (env: IntegrationEnv) =>
  env.SAVE_TO_KV_STORE_PLUGIN_ENABLED === 'true' || env.SAVE_TO_KV_STORE_PLUGIN_ENABLED === 'false'

export const isSaveToKvStorePluginEnabled = (env: IntegrationEnv) =>
  env[saveToKvStorePluginEnabledVarName]?.toLowerCase() === 'true'

export function getProxySecret(env: IntegrationEnv): string | null {
  return getProxySecretVar(env)
}

export function getDecryptionKey(env: IntegrationEnv): string | null {
  return getDecryptionKeyVar(env)
}

export function getStatusPagePath(): string {
  return `/status`
}

export async function checkKVStoreAvailability() {
  try {
    const kvStore = getBuiltinKVStore()
    const testKeyName = 'kvStoreCheck'
    await kvStore.put(testKeyName, 'true')
    const entry = await kvStore.get(testKeyName)
    const value = await entry?.text()
    await kvStore.delete(testKeyName)
    return value === 'true'
  } catch (e) {
    console.error('Error checking KV store availability:')
    console.error(e)
    return false
  }
}

export async function getEnvObject(): Promise<IntegrationEnv> {
  let configStore
  try {
    configStore = getConfigStore()
  } catch (e) {
    console.error(e)
  }

  let secretStore
  try {
    secretStore = getSecretStore()
  } catch (e) {
    console.error(e)
  }

  return {
    AGENT_SCRIPT_DOWNLOAD_PATH: configStore?.get(agentScriptDownloadPathVarName) ?? null,
    GET_RESULT_PATH: configStore?.get(getResultPathVarName) ?? null,
    OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED: configStore?.get(openClientResponseVarName) ?? null,
    SAVE_TO_KV_STORE_PLUGIN_ENABLED: configStore?.get(saveToKvStorePluginEnabledVarName) ?? null,
    PROXY_SECRET: (await secretStore?.get(proxySecretVarName))?.plaintext() ?? null,
    DECRYPTION_KEY: (await secretStore?.get(decryptionKeyVarName))?.plaintext() ?? null,
  }
}
