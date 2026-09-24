import { beforeAll, beforeEach, describe, expect } from '@jest/globals'
import { ConfigStore } from 'fastly:config-store'
import { makeRequest } from '../utils/makeRequest'
import { handleRequest } from '../../src'
import { readFileSync } from 'fs'
import { join } from 'path'

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
        backend: 'fingerprint',
        cacheOverride: expect.objectContaining({ mode: 'none' }),
      })
    )
  })

  describe('cache headers', () => {
    const upstreamHeaders = {
      'cache-control': 'public, max-age=3742, s-maxage=629157',
      'cache-tag': 'procdn',
      etag: 'W/"abc"',
      age: '2',
    }

    function mockBackendResponse(cached: boolean, headers: Record<string, string> = {}, status = 200) {
      const response = new Response('agent', { status, headers: { ...upstreamHeaders, ...headers } })
      Object.defineProperty(response, 'cached', { value: cached })
      jest.mocked(fetch).mockResolvedValueOnce(response)
    }

    it('on miss: removes s-maxage and age, keeps cache-tag', async () => {
      mockBackendResponse(false)
      const response = await handleRequest(makeRequest(new URL('https://test/download?apiKey=apiKey')))

      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('public, max-age=3742')
      expect(response.headers.has('age')).toBe(false)
      expect(response.headers.get('cache-tag')).toBe('procdn')
    })

    it('on hit: removes s-maxage and cache-tag, sets age to 0', async () => {
      mockBackendResponse(true)
      const response = await handleRequest(makeRequest(new URL('https://test/download?apiKey=apiKey')))

      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('public, max-age=3742')
      expect(response.headers.get('age')).toBe('0')
      expect(response.headers.has('cache-tag')).toBe(false)
    })

    it('on hit with matching If-None-Match: returns 304 with the same cache headers', async () => {
      mockBackendResponse(true)
      const response = await handleRequest(
        makeRequest(new URL('https://test/download?apiKey=apiKey'), { headers: { 'If-None-Match': '"abc"' } })
      )

      expect(response.status).toBe(304)
      expect(await response.text()).toBe('')
      expect(response.headers.get('cache-control')).toBe('public, max-age=3742')
      expect(response.headers.get('age')).toBe('0')
      expect(response.headers.get('etag')).toBe('W/"abc"')
      expect(response.headers.has('cache-tag')).toBe(false)
    })

    it.each(['"other", W/"abc"', '*'])('with If-None-Match %s: returns 304', async (ifNoneMatch) => {
      mockBackendResponse(true)
      const response = await handleRequest(
        makeRequest(new URL('https://test/download?apiKey=apiKey'), { headers: { 'If-None-Match': ifNoneMatch } })
      )

      expect(response.status).toBe(304)
    })

    it('with If-None-Match tag containing a comma: returns 304', async () => {
      mockBackendResponse(true, { etag: 'W/"build,123"' })
      const response = await handleRequest(
        makeRequest(new URL('https://test/download?apiKey=apiKey'), { headers: { 'If-None-Match': '"build,123"' } })
      )

      expect(response.status).toBe(304)
    })

    it('with matching If-None-Match on other methods: returns 412', async () => {
      mockBackendResponse(true)
      const response = await handleRequest(
        makeRequest(new URL('https://test/download?apiKey=apiKey'), {
          method: 'POST',
          headers: { 'If-None-Match': '"abc"' },
        })
      )

      expect(response.status).toBe(412)
    })

    it('with matching If-None-Match on upstream error: keeps the error', async () => {
      mockBackendResponse(true, {}, 404)
      const response = await handleRequest(
        makeRequest(new URL('https://test/download?apiKey=apiKey'), { headers: { 'If-None-Match': '"abc"' } })
      )

      expect(response.status).toBe(404)
    })

    it('keeps directives that only start with s-maxage', async () => {
      mockBackendResponse(false, { 'cache-control': 'public, s-maxage=10, s-maxage-policy=private' })
      const response = await handleRequest(makeRequest(new URL('https://test/download?apiKey=apiKey')))

      expect(response.headers.get('cache-control')).toBe('public, s-maxage-policy=private')
    })

    it('with non-matching If-None-Match: returns 200', async () => {
      mockBackendResponse(true)
      const response = await handleRequest(
        makeRequest(new URL('https://test/download?apiKey=apiKey'), { headers: { 'If-None-Match': '"other"' } })
      )

      expect(response.status).toBe(200)
    })

    it('build enables the HTTP cache API, which response.cached depends on', () => {
      const packageJson = readFileSync(join(__dirname, '../../package.json'), 'utf8')

      expect(packageJson).toContain('--enable-http-cache')
    })
  })
})
