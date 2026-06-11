import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { makeRequest } from '../utils/makeRequest'
import { handleRequest } from '../../src'
import { ConfigStore } from 'fastly:config-store'
import { SecretStore } from 'fastly:secret-store'
import packageJson from '../../package.json'
import { agentScriptDownloadPathVarName, getResultPathVarName, proxySecretVarName } from '../../src/env'
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
    secret.set(proxySecretVarName, null)
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
  })

  it('should show correctly setup env when all required configurations are set', async () => {
    // @ts-ignore
    config.set(agentScriptDownloadPathVarName, 'download')
    // @ts-ignore
    config.set(getResultPathVarName, 'result')
    // @ts-ignore
    secret.set(proxySecretVarName, 'proxy_secret')

    const request = makeRequest(new URL('https://test/status'))
    const response = await handleRequest(request)

    const responseText = await response.text()

    expect(responseText).toContain('<li><code>AGENT_SCRIPT_DOWNLOAD_PATH</code> (Optional) is set ✅.</li>')
    expect(responseText).toContain('<li><code>GET_RESULT_PATH</code> (Optional) is set ✅.</li>')
    expect(responseText).toContain('<li><code>PROXY_SECRET</code> (Required) is set ✅.</li>')

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
  beforeEach(() => {
    jest.resetAllMocks()
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
})

describe('Status page Backend Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should show configured when fingerprint backend exists and no legacy backends exist', () => {
    jest.spyOn(Backend, 'exists').mockImplementation((backend) => backend === 'fingerprint')

    const result = getBackendsInformation()
    expect(result).toContain('ℹ️ Fingerprint backend is configured ✅')
    expect(result).not.toContain('missing')
  })

  it('should show legacy region info when fingerprint backend is missing but old backends exist', () => {
    jest
      .spyOn(Backend, 'exists')
      .mockImplementation((backend) => backend === 'api.fpjs.io' || backend === 'eu.api.fpjs.io')

    const result = getBackendsInformation()
    expect(result).toContain(
      '⚠️ Deprecated: region-named backends are configured for <a href="https://dev.fingerprint.com/docs/regions">regions</a>: <strong>US, EU</strong>. Please migrate to a single backend named "fingerprint".'
    )
  })

  it('should show error when no backends exist', () => {
    jest.spyOn(Backend, 'exists').mockReturnValue(false)

    const result = getBackendsInformation()
    expect(result).toContain('⚠️ Your integration is missing the "fingerprint" backend.')
  })
})
