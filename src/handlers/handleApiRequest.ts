import { IntegrationEnv, isProxySecretSet } from '../env'
import {
  addProxyIntegrationHeaders,
  addTrafficMonitoringSearchParamsForVisitorIdRequest,
  createErrorResponseForIngress,
  createFallbackErrorResponse,
} from '../utils'
import { getFilteredCookies } from '../utils/cookie'
import { getIngressBackendByRegion } from '../utils/getIngressBackendByRegion'
import { CacheOverride } from 'fastly:cache-override'

function isMethodAuthorized(method: string): boolean {
  return method === 'POST'
}

async function makeAuthorizedRequest(receivedRequest: Request, env: IntegrationEnv, url: URL): Promise<Response> {
  if (!isProxySecretSet(env)) {
    console.warn(
      "PROXY_SECRET is not set in the integration's Secret store, your integration is not working correctly."
    )
  }

  addTrafficMonitoringSearchParamsForVisitorIdRequest(url)

  const oldCookieValue = receivedRequest.headers.get('cookie')
  const newCookieValue = getFilteredCookies(oldCookieValue, (key) => key === '_iidt')
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Fastly Request/RequestInit type mismatch with exactOptionalPropertyTypes
  const request = new Request(url, receivedRequest as RequestInit)
  if (newCookieValue) {
    request.headers.set('cookie', newCookieValue)
  } else {
    request.headers.delete('cookie')
  }
  addProxyIntegrationHeaders(request.headers, receivedRequest.url, env)

  console.log(`sending ingress request to ${url.toString()}...`)
  return await fetch(request, { backend: getIngressBackendByRegion(url) })
}

function makeUnauthorizedRequest(receivedRequest: Request, url: URL): Promise<Response> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Fastly Request/RequestInit type mismatch with exactOptionalPropertyTypes
  const request = new Request(url, receivedRequest as RequestInit)
  request.headers.delete('Cookie')

  console.log(`sending cache request to ${url.toString()}...`)
  return fetch(request, { backend: getIngressBackendByRegion(url), cacheOverride: new CacheOverride('pass') })
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
