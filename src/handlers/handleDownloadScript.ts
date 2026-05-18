import { createFallbackErrorResponse, getAgentScriptPath } from '../utils'
import { CacheOverride } from 'fastly:cache-override'
import { getIngressBackendByRegion } from '../utils/getIngressBackendByRegion'

function makeDownloadScriptRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  url.pathname = getAgentScriptPath(url.searchParams)

  const newRequest = new Request(url.toString(), request as RequestInit)
  newRequest.headers.delete('Cookie')

  const backend = getIngressBackendByRegion(url)
  console.log(`Downloading script from ${backend} ${url.toString()}...`)
  const cache = new CacheOverride('override', { ttl: 60 })
  return fetch(newRequest, { backend, cacheOverride: cache })
}

export async function handleDownloadScript(request: Request): Promise<Response> {
  try {
    return await makeDownloadScriptRequest(request)
  } catch (e) {
    return createFallbackErrorResponse(request, e)
  }
}
