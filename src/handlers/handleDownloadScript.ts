import { createFallbackErrorResponse, getAgentScriptPath } from '../utils'
import { CacheOverride } from 'fastly:cache-override'
import { getIngressBackendByRegion } from '../utils/getIngressBackendByRegion'
import { applyAgentCacheHeaders } from '../utils/agentCacheHeaders'

async function makeDownloadScriptRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  url.pathname = getAgentScriptPath(url.searchParams)

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Fastly Request/RequestInit type mismatch with exactOptionalPropertyTypes
  const newRequest = new Request(url.toString(), request as RequestInit)
  newRequest.headers.delete('Cookie')

  const backend = getIngressBackendByRegion(url)
  console.log(`Downloading script from ${backend} ${url.toString()}...`)
  const cache = new CacheOverride('override', { ttl: 60 })
  const response = await fetch(newRequest, { backend, cacheOverride: cache })

  return applyAgentCacheHeaders(request, response)
}

export async function handleDownloadScript(request: Request): Promise<Response> {
  try {
    return await makeDownloadScriptRequest(request)
  } catch (e) {
    return createFallbackErrorResponse(request, e)
  }
}
