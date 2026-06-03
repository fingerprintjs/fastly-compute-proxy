import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { makeRequest } from '../utils/makeRequest'
import { handleRequest } from '../../src'
import { ConfigStore } from 'fastly:config-store'
import { SecretStore } from 'fastly:secret-store'
import packageJson from '../../package.json'
import {
  agentScriptDownloadPathVarName,
  decryptionKeyVarName,
  getResultPathVarName,
  proxySecretVarName,
  saveToKvStorePluginEnabledVarName,
} from '../../src/env'
import * as envFunctions from '../../src/env'
import { Backend } from 'fastly:backend'
import { getBackendsInformation } from '../../src/handlers/handleStatusPage'

describe('Status Page', () => {
  let config: ConfigStore
  let secret: SecretStore

  beforeAll(() => {
    config = new ConfigStore('Fingerprint')
    secret = new SecretStore('Fingerprint')
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // @ts-ignore
    config.set(agentScriptDownloadPathVarName, null)
    // @ts-ignore
    config.set(getResultPathVarName, null)
    // @ts-ignore
    config.set(saveToKvStorePluginEnabledVarName, null)
    // @ts-ignore
    secret.set(proxySecretVarName, null)
    // @ts-ignore
    secret.set(decryptionKeyVarName, null)
  })

  it('should return text/html with status 200 for GET request', async () => {
    const request = makeRequest(new URL('https://test/status'))
    const response = await handleRequest(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/html')
  })

  it('should return 405 when method is not GET', async () => {
    const request = makeRequest(new URL('https://test/status'), { method: 'POST' })
    const response = await handleRequest(request)

    expect(response.status).toBe(405)
  })

  it('should include style tag with nonce', async () => {
    const request = makeRequest(new URL('https://test/status'))
    const response = await handleRequest(request)

    const responseText = await response.text()

    const styleTagStart = responseText.indexOf('<style nonce=')
    expect(styleTagStart).not.toBe(-1)

    const nonceStart = responseText.indexOf("'", styleTagStart) + 1
    const nonceEnd = responseText.indexOf("'", nonceStart)
    const nonce = responseText.substring(nonceStart, nonceEnd)

    expect(nonce.length).toBe(32)
    expect(/^[a-zA-Z0-9+/=]+$/.test(nonce)).toBe(true)
  })

  it('should show correct integration version', async () => {
    const request = makeRequest(new URL('https://test/status'))
    const response = await handleRequest(request)

    const responseText = await response.text()
    expect(responseText).toContain(`Integration version: <strong>${packageJson.version}</strong>`)
  })

  it('should show errors for undefined required configurations', async () => {
    const request = makeRequest(new URL('https://test/status'))
    const response = await handleRequest(request)

    const responseText = await response.text()
    expect(responseText).toContain('<li><code>AGENT_SCRIPT_DOWNLOAD_PATH</code> (Optional) is not set ⚠️.</li>')
    expect(responseText).toContain('<li><code>GET_RESULT_PATH</code> (Optional) is not set ⚠️.</li>')
    expect(responseText).toContain(
      '<li><code>PROXY_SECRET</code> (Required) is missing ❌. Your integration is not working correctly.</li>'
    )
    expect(responseText).toContain(
      '<li><code>DECRYPTION_KEY</code> (Optional) is not set ⚠️. Plugins are not working correctly. This is required if you want to use plugins.</li>'
    )
  })

  it('should show correctly setup env when all required configurations are set', async () => {
    // @ts-ignore
    config.set(agentScriptDownloadPathVarName, 'download')
    // @ts-ignore
    config.set(getResultPathVarName, 'result')
    // @ts-ignore
    config.set(saveToKvStorePluginEnabledVarName, 'true')
    // @ts-ignore
    secret.set(proxySecretVarName, 'proxy_secret')
    // @ts-ignore
    secret.set(decryptionKeyVarName, 'ZGVjcnlwdGlvbl9rZXk=')

    const request = makeRequest(new URL('https://test/status'))
    const response = await handleRequest(request)

    const responseText = await response.text()

    expect(responseText).toContain('<li><code>AGENT_SCRIPT_DOWNLOAD_PATH</code> (Optional) is set ✅.</li>')
    expect(responseText).toContain('<li><code>GET_RESULT_PATH</code> (Optional) is set ✅.</li>')
    expect(responseText).toContain('<li><code>PROXY_SECRET</code> (Required) is set ✅.</li>')
    expect(responseText).toContain('<li><code>DECRYPTION_KEY</code> (Optional) is set ✅.</li>')
    expect(responseText).toContain(
      '<li><code>SAVE_TO_KV_STORE_PLUGIN_ENABLED</code> (Optional) is <code>true</code> ✅.</li>'
    )

    expect(responseText).not.toContain('is missing ❌')
    expect(responseText).not.toContain('is not set ⚠️')
    expect(responseText).not.toContain('Your integration is not working correctly')
  })

  it('should include correct Content-Security-Policy header', async () => {
    const request = makeRequest(new URL('https://test/status'))
    const response = await handleRequest(request)

    const cspHeader = response.headers.get('Content-Security-Policy')
    expect(cspHeader).toBeTruthy()

    expect(cspHeader).toMatch(
      /^default-src 'none'; img-src https:\/\/fingerprint\.com; style-src 'nonce-[A-Za-z0-9+/=]+'$/
    )

    const nonceMatch = cspHeader?.match(/style-src 'nonce-([A-Za-z0-9+/=]+)'/)
    expect(nonceMatch).toBeTruthy()
    expect(nonceMatch?.[1]).toBeTruthy()
    expect(nonceMatch?.[1].length).toBe(32)
  })
})

describe('Status Page Error Cases', () => {
  let configStore: ConfigStore
  let secretStore: SecretStore

  beforeEach(() => {
    jest.resetAllMocks()
    configStore = new ConfigStore('Fingerprint')
    secretStore = new SecretStore('Fingerprint')
  })

  it('should show error when config store values are not set', async () => {
    const request = makeRequest(new URL('https://test/status'))
    const response = await handleRequest(request)
    const responseText = await response.text()

    expect(responseText).toContain('Your integration is not working correctly')
    expect(responseText).toContain('<li><code>AGENT_SCRIPT_DOWNLOAD_PATH</code> (Optional) is not set ⚠️')
    expect(responseText).toContain('<li><code>GET_RESULT_PATH</code> (Optional) is not set ⚠️')
  })

  it('should show error when secret store value is not set', async () => {
    const request = makeRequest(new URL('https://test/status'))
    const response = await handleRequest(request)
    const responseText = await response.text()

    expect(responseText).toContain('Your integration is not working correctly')
    expect(responseText).toContain('<li><code>PROXY_SECRET</code> (Required) is missing ❌')
  })

  it('should show error when decryption key is not a valid base64', async () => {
    // @ts-ignore
    configStore.set('DECRYPTION_KEY', 'not-a-valid-base64')

    jest.spyOn(envFunctions, 'isDecryptionKeySet').mockReturnValue(true)

    const request = makeRequest(new URL('https://test/status'))
    const response = await handleRequest(request)
    const responseText = await response.text()

    expect(responseText).toContain(
      '<li><code>DECRYPTION_KEY</code> (Optional) is set ✅. Invalid value provided ⚠️. Please copy and paste the correct value from the dashboard.</li>'
    )
  })

  it('should show error when KV store is not available', async () => {
    // @ts-ignore
    configStore.set('AGENT_SCRIPT_DOWNLOAD_PATH', 'agent')
    // @ts-ignore
    configStore.set('GET_RESULT_PATH', 'result')
    // @ts-ignore
    secretStore.set('PROXY_SECRET', 'test-secret')
    // @ts-ignore
    configStore.set('SAVE_TO_KV_STORE_PLUGIN_ENABLED', 'true')

    jest.spyOn(envFunctions, 'checkKVStoreAvailability').mockResolvedValue(false)

    const request = makeRequest(new URL('https://test/status'))
    const response = await handleRequest(request)
    const responseText = await response.text()

    expect(responseText).toContain(
      "⚠️You have <code>SAVE_TO_KV_STORE_PLUGIN_ENABLED</code> enabled, but we couldn't reach your KVStore"
    )
  })
})

describe('Status page Backend Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should show warning when all region backends are missing', () => {
    jest.spyOn(Backend, 'exists').mockReturnValue(false)

    const result = getBackendsInformation()
    expect(result).toContain(
      '⚠️ Your integration is missing backend hosts for <a href="https://dev.fingerprint.com/docs/regions">region support</a>.'
    )
    expect(result).toContain(
      'Please add at least one of the backends "api.fpjs.io", "eu.api.fpjs.io", or "ap.api.fpjs.io"'
    )
  })

  it('should show US region when only api.fpjs.io backend exists', () => {
    jest.spyOn(Backend, 'exists').mockImplementation((backend) => backend === 'api.fpjs.io')

    const result = getBackendsInformation()
    expect(result).toContain(
      'Integration is configured for these <a href="https://dev.fingerprint.com/docs/regions">regions</a>: <strong>US</strong>'
    )
  })

  it('should show EU region when only eu.api.fpjs.io backend exists', () => {
    jest.spyOn(Backend, 'exists').mockImplementation((backend) => backend === 'eu.api.fpjs.io')

    const result = getBackendsInformation()
    expect(result).toContain(
      'Integration is configured for these <a href="https://dev.fingerprint.com/docs/regions">regions</a>: <strong>EU</strong>'
    )
  })

  it('should show AP region when only ap.api.fpjs.io backend exists', () => {
    jest.spyOn(Backend, 'exists').mockImplementation((backend) => backend === 'ap.api.fpjs.io')

    const result = getBackendsInformation()
    expect(result).toContain(
      'Integration is configured for these <a href="https://dev.fingerprint.com/docs/regions">regions</a>: <strong>AP</strong>'
    )
  })

  it('should show US and EU regions when both backends exist', () => {
    jest
      .spyOn(Backend, 'exists')
      .mockImplementation((backend) => backend === 'api.fpjs.io' || backend === 'eu.api.fpjs.io')

    const result = getBackendsInformation()
    expect(result).toContain(
      'Integration is configured for these <a href="https://dev.fingerprint.com/docs/regions">regions</a>: <strong>US, EU</strong>'
    )
  })

  it('should show US and AP regions when both backends exist', () => {
    jest
      .spyOn(Backend, 'exists')
      .mockImplementation((backend) => backend === 'api.fpjs.io' || backend === 'ap.api.fpjs.io')

    const result = getBackendsInformation()
    expect(result).toContain(
      'Integration is configured for these <a href="https://dev.fingerprint.com/docs/regions">regions</a>: <strong>US, AP</strong>'
    )
  })

  it('should show EU and AP regions when both backends exist', () => {
    jest
      .spyOn(Backend, 'exists')
      .mockImplementation((backend) => backend === 'eu.api.fpjs.io' || backend === 'ap.api.fpjs.io')

    const result = getBackendsInformation()
    expect(result).toContain(
      'Integration is configured for these <a href="https://dev.fingerprint.com/docs/regions">regions</a>: <strong>EU, AP</strong>'
    )
  })

  it('should show all regions when all backends exist', () => {
    jest.spyOn(Backend, 'exists').mockReturnValue(true)

    const result = getBackendsInformation()
    expect(result).toContain(
      'Integration is configured for these <a href="https://dev.fingerprint.com/docs/regions">regions</a>: <strong>US, EU, AP</strong>'
    )
  })
})
