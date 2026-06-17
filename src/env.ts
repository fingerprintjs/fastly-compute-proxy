import { getConfigStore, getSecretStore } from './utils/getStore'

export type IntegrationEnv = {
  AGENT_SCRIPT_DOWNLOAD_PATH: string | null
  GET_RESULT_PATH: string | null
  PROXY_SECRET: string | null
}

const Defaults: IntegrationEnv = {
  AGENT_SCRIPT_DOWNLOAD_PATH: 'agent',
  GET_RESULT_PATH: 'result',
  PROXY_SECRET: null,
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

export function getProxySecret(env: IntegrationEnv): string | null {
  return getProxySecretVar(env)
}

export function getStatusPagePath(): string {
  return `/status`
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
    PROXY_SECRET: (await secretStore?.get(proxySecretVarName))?.plaintext() ?? null,
  }
}
