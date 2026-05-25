import { IntegrationEnv, isOpenClientResponseEnabled, isProxySecretSet } from '../env'
import {
  addProxyIntegrationHeaders,
  addTrafficMonitoringSearchParamsForVisitorIdRequest,
  createErrorResponseForIngress,
  createFallbackErrorResponse,
} from '../utils'
import { getFilteredCookies } from '../utils/cookie'
import { processOpenClientResponse } from '../utils/processOpenClientResponse'
import { processSealedResultResponse } from '../utils/processSealedResultResponse'
import { processIdentificationResponse } from '../utils/processIdentificationResponse'
import { cloneFastlyResponse } from '../utils/cloneFastlyResponse'
import { getIngressBackendByRegion } from '../utils/getIngressBackendByRegion'
import { decompressBody } from '../utils/decompressBody'
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
  const request = new Request(url, receivedRequest as RequestInit)
  if (newCookieValue) {
    request.headers.set('cookie', newCookieValue)
  } else {
    request.headers.delete('cookie')
  }
  addProxyIntegrationHeaders(request.headers, receivedRequest.url, env)

  console.log(`sending ingress request to ${url.toString()}...`)
  const response = await fetch(request, { backend: getIngressBackendByRegion(url) })

  if (response.status < 200 || response.status > 299) {
    console.log(
      `Response status is non-successful (HTTP ${response.status}). Skipping plugins and returning the response.`
    )
    return response
  }

  const bodyBytes = await response.arrayBuffer()

  let parsedBody: Record<string, unknown> | null = null
  try {
    const contentEncoding = response.headers.get('content-encoding')
    const responseBody = decompressBody(bodyBytes, contentEncoding)
    parsedBody = JSON.parse(responseBody)
  } catch (e) {
    console.log(`Error occurred when parsing response body: ${e}. Skipping plugins.`)
  }

  if (parsedBody) {
    Promise.resolve().then(() => {
      processIdentificationResponse(parsedBody, bodyBytes, response).catch((e) =>
        console.error('Failed to process identification response plugins: ', e)
      )
      processSealedResultResponse(parsedBody, bodyBytes, response, env).catch((e) =>
        console.error(
          'Make sure Decryption Key is added to Secret Store and its activated from Fingerprint workspace: ',
          e
        )
      )
      if (isOpenClientResponseEnabled(env)) {
        processOpenClientResponse(parsedBody, bodyBytes, response, env).catch((e) =>
          console.error(
            'Make sure OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED is set to true in Config Store, Decryption Key is added to Secret Store, and Open Client Response is enabled for your Fingerprint workspace: ',
            e
          )
        )
      }
    })
  }

  return cloneFastlyResponse(bodyBytes, response)
}

function makeUnauthorizedRequest(receivedRequest: Request, url: URL): Promise<Response> {
  const request = new Request(url, receivedRequest as RequestInit)
  request.headers.delete('Cookie')

  console.log(`sending cache request to ${url}...`)
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
