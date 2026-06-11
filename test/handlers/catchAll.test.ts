import { beforeAll, beforeEach, describe, expect } from '@jest/globals'
import { ConfigStore } from 'fastly:config-store'
import { SecretStore } from 'fastly:secret-store'
import { makeRequest } from '../utils/makeRequest'
import { handleRequest } from '../../src'
import cookie from 'cookie'
import packageJson from '../../package.json'

describe('Catch-all (V4)', () => {
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
    config.set('GET_RESULT_PATH', 'result')
    // @ts-ignore
    config.set('AGENT_SCRIPT_DOWNLOAD_PATH', 'agent')
    jest.clearAllMocks()
    receivedUrl = ''
    requestHeaders = new Headers()
  })

  describe('GET (unauthorized)', () => {
    it('should forward unmatched GET requests to API backend', async () => {
      const request = makeRequest(new URL('https://test/web/v4/abc123'))
      await handleRequest(request)

      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET' }),
        expect.objectContaining({ backend: 'fingerprint', cacheOverride: expect.objectContaining({ mode: 'pass' }) })
      )
    })

    it('should preserve the request pathname', async () => {
      const request = makeRequest(new URL('https://test/web/v4/abc123'))
      await handleRequest(request)

      const url = new URL(receivedUrl)
      expect(url.pathname).toBe('/web/v4/abc123')
    })

    it('should remove all cookies', async () => {
      const request = makeRequest(new URL('https://test/web/v4/abc123'), {
        headers: { Cookie: 'hello=world; _iidt=test' },
      })
      await handleRequest(request)

      expect(requestHeaders.has('Cookie')).toBe(false)
    })

    it('should not include ii parameter', async () => {
      const request = makeRequest(new URL('https://test/web/v4/abc123'))
      await handleRequest(request)

      const url = new URL(receivedUrl)
      expect(url.searchParams.has('ii')).toBe(false)
    })
  })

  describe('POST (authorized)', () => {
    it('should forward unmatched POST requests to API backend', async () => {
      const request = makeRequest(new URL('https://test/some/path'), { method: 'POST' })
      await handleRequest(request)

      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST' }),
        expect.objectContaining({ backend: 'fingerprint' })
      )
    })

    it('should preserve the request pathname', async () => {
      const request = makeRequest(new URL('https://test/some/path'), { method: 'POST' })
      await handleRequest(request)

      const url = new URL(receivedUrl)
      expect(url.pathname).toBe('/some/path')
    })

    it('should filter cookies to _iidt only', async () => {
      const request = makeRequest(new URL('https://test/some/path'), {
        method: 'POST',
        headers: { Cookie: 'hello=world; _iidt=test' },
      })
      await handleRequest(request)

      const cookiesHeader = requestHeaders.get('Cookie')
      const cookieValue = cookie.parse(cookiesHeader ?? '')

      expect(requestHeaders.has('Cookie')).toBe(true)
      expect(cookieValue['hello']).toBe(undefined)
      expect(cookieValue['_iidt']).toBe('test')
    })

    it('should include ii parameter', async () => {
      const request = makeRequest(new URL('https://test/some/path'), { method: 'POST' })
      await handleRequest(request)

      const url = new URL(receivedUrl)
      expect(url.searchParams.get('ii')).toBe(`fingerprint-pro-fastly-compute/${packageJson.version}/ingress`)
    })

    it('should add proxy integration headers', async () => {
      const secret = '42'
      const secretStore = new SecretStore('Fingerprint')
      // @ts-ignore
      secretStore.set('PROXY_SECRET', secret)

      const request = makeRequest(new URL('https://test/some/path'), { method: 'POST' })
      await handleRequest(request)

      expect(requestHeaders.has('FPJS-Proxy-Secret')).toBe(true)
      expect(requestHeaders.has('FPJS-Proxy-Client-IP')).toBe(true)
      expect(requestHeaders.has('FPJS-Proxy-Forwarded-Host')).toBe(true)
    })
  })

  describe('V3 route priority', () => {
    it('should match V3 download script route before catch-all', async () => {
      const request = makeRequest(new URL('https://test/agent?apiKey=abc123'))
      await handleRequest(request)

      const url = new URL(receivedUrl)
      expect(url.pathname).toBe('/web/v3/abc123')
    })

    it('should match V3 ingress route before catch-all', async () => {
      const request = makeRequest(new URL('https://test/result'), { method: 'POST' })
      await handleRequest(request)

      const url = new URL(receivedUrl)
      expect(url.pathname).toBe('/')
    })
  })
})
