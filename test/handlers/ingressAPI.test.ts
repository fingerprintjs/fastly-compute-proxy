import { beforeAll, beforeEach, describe, expect, jest } from '@jest/globals'
import { ConfigStore } from 'fastly:config-store'
import { makeRequest } from '../utils/makeRequest'
import { handleRequest } from '../../src'
import cookie from 'cookie'
import { SecretStore } from 'fastly:secret-store'
import { env } from 'fastly:env'
import packageJson from '../../package.json'

describe('Browser Cache', () => {
  let requestHeaders: Headers
  let receivedUrl: string
  let storeName: string

  beforeAll(() => {
    jest.spyOn(globalThis, 'fetch').mockImplementation((request, init) => {
      if (request instanceof Request) {
        receivedUrl = request.url.toString()
        requestHeaders = request.headers
      }
      return globalThis.fetch(request, init)
    })

    const serviceId = env('FASTLY_SERVICE_ID')
    const storeNamePrefix = process.env.STORE_NAME_PREFIX
    storeName = `${storeNamePrefix}_${serviceId}`
  })
  beforeEach(() => {
    const config = new ConfigStore(storeName)
    // @ts-ignore
    config.set('GET_RESULT_PATH', 'result')
    // Reset fetch spy calls between tests if needed
    jest.clearAllMocks()
    receivedUrl = ''
    requestHeaders = new Headers()
  })

  it('should send request to backend fpjs with GET method', async () => {
    const request = makeRequest(new URL('https://test/result'))
    await handleRequest(request)

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET' }),
      expect.objectContaining({ backend: 'api.fpjs.io', cacheOverride: expect.objectContaining({ mode: 'pass' }) })
    )
  })

  it('should not include ii parameter', async () => {
    const request = makeRequest(new URL('https://test/result'))
    await handleRequest(request)

    const url = new URL(receivedUrl)
    expect(url.searchParams.has('ii')).toBe(false)
  })

  it('should delete cookie header', async () => {
    const request = makeRequest(new URL('https://test/result'), { headers: {} })
    await handleRequest(request)

    expect(requestHeaders.has('Cookie')).toBe(false)
  })
})

describe('Ingress', () => {
  let requestHeaders: Headers
  let receivedUrl: string
  let storeName: string

  beforeAll(() => {
    jest.spyOn(globalThis, 'fetch').mockImplementation((request, init) => {
      if (request instanceof Request) {
        receivedUrl = request.url.toString()
        requestHeaders = request.headers
      }
      return globalThis.fetch(request, init)
    })
    const serviceId = env('FASTLY_SERVICE_ID')
    const storeNamePrefix = process.env.STORE_NAME_PREFIX
    storeName = `${storeNamePrefix}_${serviceId}`
  })
  beforeEach(() => {
    const config = new ConfigStore(storeName)
    // @ts-ignore
    config.set('GET_RESULT_PATH', 'result')
    // Reset fetch spy calls between tests if needed
    jest.clearAllMocks()
    receivedUrl = ''
    requestHeaders = new Headers()
  })

  it('should call fpjs with method POST', async () => {
    const request = makeRequest(new URL('https://test/result'), { method: 'POST' })
    await handleRequest(request)

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST' }),
      expect.objectContaining({ backend: 'api.fpjs.io' })
    )
  })

  it('should include ii parameter', async () => {
    const request = makeRequest(new URL('https://test/result'), { method: 'POST' })
    await handleRequest(request)

    const url = new URL(receivedUrl)
    expect(url.searchParams.get('ii')).toBe(`fingerprint-pro-fastly-compute/${packageJson.version}/ingress`)
  })

  it('should remove cookies if iidt not present', async () => {
    const request = makeRequest(new URL('https://test/result'), { method: 'POST', headers: { Cookie: 'hello=world' } })
    await handleRequest(request)

    expect(requestHeaders.has('Cookie')).toBe(false)
  })

  it('should filter cookies except iidt', async () => {
    const request = makeRequest(new URL('https://test/result'), {
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

  it('should add all proxy integration headers if PROXY_SECRET is present, preserving existing headers', async () => {
    const existingHeaderValue = 'testValue'
    const secret = '42'
    const secretStore = new SecretStore('Fingerprint')
    // @ts-ignore
    secretStore.set('PROXY_SECRET', secret)

    const request = makeRequest(new URL('https://test/result'), {
      method: 'POST',
      headers: { 'X-Test': existingHeaderValue },
    })
    await handleRequest(request)

    expect(requestHeaders.has('FPJS-Proxy-Secret')).toBe(true)
    expect(requestHeaders.has('FPJS-Proxy-Client-IP')).toBe(true)
    expect(requestHeaders.has('FPJS-Proxy-Forwarded-Host')).toBe(true)

    expect(requestHeaders.get('X-Test')).toBe(existingHeaderValue)
    expect(requestHeaders.get('FPJS-Proxy-Secret')).toBe(secret)
  })

  // So Fingerprint server can know the request is coming from a proxy integration, even if the proxy secret is missing
  it('should add the other proxy integration headers even if PROXY_SECRET is not set, preserving existing headers', async () => {
    const existingHeaderValue = 'testValue'
    const secretStore = new SecretStore('Fingerprint')
    // @ts-ignore
    // Reset the secret to undefined in case a previous test defined it
    secretStore.set('PROXY_SECRET', undefined)

    const request = makeRequest(new URL('https://test/result'), {
      method: 'POST',
      headers: { 'X-Test': existingHeaderValue },
    })
    await handleRequest(request)

    expect(requestHeaders.has('FPJS-Proxy-Secret')).toBe(false)
    expect(requestHeaders.has('FPJS-Proxy-Client-IP')).toBe(true)
    expect(requestHeaders.has('FPJS-Proxy-Forwarded-Host')).toBe(true)

    expect(requestHeaders.get('X-Test')).toBe(existingHeaderValue)
  })

  it('should set client ip if request has header Fastly-Client-IP', async () => {
    const secretStore = new SecretStore('Fingerprint')
    // @ts-ignore
    secretStore.set('PROXY_SECRET', 'secret')

    const request = makeRequest(new URL('https://test/result'), {
      method: 'POST',
    })
    await handleRequest(request)

    expect(requestHeaders.get('FPJS-Proxy-Client-IP')).toBe('test')
  })
})

describe('Ingress Errors', () => {
  beforeAll(() => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      return new Promise<Response>((_, reject) => {
        reject('Test Error')
      })
    })
  })

  it.each(['GET', 'POST'])('should return CORS Headers when method is %s', async (method) => {
    const request = makeRequest(new URL('https://test/result'), { method, headers: { Origin: 'test.origin' } })
    const response = await handleRequest(request)

    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(true)
    expect(response.headers.has('Access-Control-Allow-Credentials')).toBe(true)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('test.origin')
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })
})
