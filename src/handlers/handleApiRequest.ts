import { IntegrationEnv, isOpenClientResponseEnabled, isProxySecretSet } from '../env'
import {
  addProxyIntegrationHeaders,
  addTrafficMonitoringSearchParamsForVisitorIdRequest,
  createErrorResponseForIngress,
  createFallbackErrorResponse,
} from '../utils'
import { getFilteredCookies } from '../utils/cookie'
import { processOpenClientResponse } from '../utils/processOpenClientResponse'
import { cloneFastlyResponse } from '../utils/cloneFastlyResponse'
import { getIngressBackendByRegion } from '../utils/getIngressBackendByRegion'
import { CacheOverride } from 'fastly:cache-override'
import { getCacheControlHeaderWithMaxAgeIfLower } from '../utils/getCacheControlHeaderWithMaxAgeIfLower'

function isMethodAuthorized(method: string): boolean {
  return method === 'POST'
}

function modifyResponseIfNecessary(originResponse: Response): Response {
  const contentType = originResponse.headers.get('Content-Type')
  if (contentType == null || !contentType.trimStart().startsWith('text/javascript')) {
    return originResponse
  }

  const oldCacheControlHeader = originResponse.headers.get('cache-control')
  if (!oldCacheControlHeader) {
    return originResponse
  }

  const maxMaxAge = 60 * 60 // 1 hour for browsers
  const maxSMaxAge = 60 // 1 minute for edge
  const response = new Response(originResponse.body, originResponse)
  response.headers.set(
    'cache-control',
    getCacheControlHeaderWithMaxAgeIfLower(oldCacheControlHeader, maxMaxAge, maxSMaxAge)
  )
  return response
}

async function makeAuthorizedRequest(receivedRequest: Request, env: IntegrationEnv, url: URL): Promise<Response> {
  if (!isProxySecretSet(env)) {
    console.log("PROXY_SECRET is not set in the integration's Secret store, your integration is not working correctly.")
  }

  addTrafficMonitoringSearchParamsForVisitorIdRequest(url)

  const oldCookieValue = receivedRequest.headers.get('cookie')
  const newCookieValue = getFilteredCookies(oldCookieValue, (key) => key === '_iidt')
  const request = new Request(url, receivedRequest as RequestInit)
  if (newCookieValue) {
    request.headers.set('cookie', newCookieValue)
  } else {
    request.headers.delete('cookie')
  }
  addProxyIntegrationHeaders(request.headers, receivedRequest.url, env)

  console.log(`sending ingress request to ${url.toString()}...`)
  const response = await fetch(request, { backend: getIngressBackendByRegion(url) })

  if (!isOpenClientResponseEnabled(env)) {
    return response
  }

  console.log('Plugin system for Open Client Response is enabled')
  if (response.status < 200 || response.status > 299) {
    console.log(
      `Response status is non-successful (HTTP ${response.status}). Skipping plugins and returning the response.`
    )
    return response
  }

  const bodyBytes = await response.arrayBuffer()
  Promise.resolve().then(() => {
    processOpenClientResponse(bodyBytes, response, env).catch((e) =>
      console.error(
        'Failed to parse identification response. Make sure Open Client Response is enabled for your Fingerprint workspace: ',
        e
      )
    )
  })

  return cloneFastlyResponse(bodyBytes, response)
}

function makeUnauthorizedRequest(receivedRequest: Request, url: URL): Promise<Response> {
  const request = new Request(url, receivedRequest as RequestInit)
  request.headers.delete('Cookie')

  console.log(`sending cache request to ${url}...`)
  return fetch(request, { backend: getIngressBackendByRegion(url), cacheOverride: new CacheOverride('pass') }).then(
    modifyResponseIfNecessary
  )
}

export async function handleApiRequest(request: Request, env: IntegrationEnv, pathname: string): Promise<Response> {
  const url = new URL(request.url)
  url.pathname = pathname

  if (isMethodAuthorized(request.method)) {
    try {
      return await makeAuthorizedRequest(request, env, url)
    } catch (e) {
      return createErrorResponseForIngress(request, e)
    }
  }

  try {
    return await makeUnauthorizedRequest(request, url)
  } catch (e) {
    return createFallbackErrorResponse(request, e)
  }
}
