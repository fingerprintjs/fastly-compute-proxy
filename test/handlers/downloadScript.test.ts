import { beforeAll, beforeEach, describe, expect } from '@jest/globals'
import { ConfigStore } from 'fastly:config-store'
import { makeRequest } from '../utils/makeRequest'
import { handleRequest } from '../../src'

describe('Download Script', () => {
  let receivedUrl: string
  let requestHeaders: Headers

  beforeAll(() => {
    jest.spyOn(globalThis, 'fetch').mockImplementation((request, init) => {
      if (request instanceof Request) {
        receivedUrl = request.url.toString()
        requestHeaders = request.headers
      }
      return globalThis.fetch(request, init)
    })
  })
  beforeEach(() => {
    const config = new ConfigStore('Fingerprint')
    // @ts-ignore
    config.set('AGENT_SCRIPT_DOWNLOAD_PATH', 'download')
    // Reset fetch spy calls between tests if needed
    jest.clearAllMocks()
    receivedUrl = ''
    requestHeaders = new Headers()
  })

  it('should set pathname to agentScriptPath', async () => {
    const request = makeRequest(new URL('https://test/download?apiKey=apiKey'))
    await handleRequest(request)

    const url = new URL(receivedUrl)
    expect(url.pathname).toBe('/web/v3/apiKey')
  })

  it('should set pathname to agentScriptPath with loaderVersion', async () => {
    const request = makeRequest(new URL('https://test/download?apiKey=apiKey&loaderVersion=3.2.1'))
    await handleRequest(request)

    const url = new URL(receivedUrl)
    expect(url.pathname).toBe('/web/v3/apiKey/loader_v3.2.1.js')
  })

  it('should not add traffic monitoring', async () => {
    const request = makeRequest(new URL('https://test/download?apiKey=apiKey'))
    await handleRequest(request)

    const url = new URL(receivedUrl)
    expect(url.searchParams.has('ii')).toBe(false)
  })

  it('should delete cookie header', async () => {
    const request = makeRequest(new URL('https://test/download'), { headers: { Cookie: 'hello=world' } })
    await handleRequest(request)

    expect(requestHeaders.has('Cookie')).toBe(false)
  })

  it('should send request to API backend', async () => {
    const request = makeRequest(new URL('https://test/download'))
    await handleRequest(request)

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        backend: 'api.fpjs.io',
        cacheOverride: expect.objectContaining({ mode: 'override', options: { ttl: 60 } }),
      })
    )
  })

  it('should send request to EU backend when region=eu', async () => {
    const request = makeRequest(new URL('https://test/download?region=eu'))
    await handleRequest(request)

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        backend: 'eu.api.fpjs.io',
      })
    )
  })

  it('should send request to AP backend when region=ap', async () => {
    const request = makeRequest(new URL('https://test/download?region=ap'))
    await handleRequest(request)

    expect(fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        backend: 'ap.api.fpjs.io',
      })
    )
  })
})
