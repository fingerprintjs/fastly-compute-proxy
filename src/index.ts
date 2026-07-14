/// <reference types="@fastly/js-compute" />
import { handleReq } from './handler'
import { getEnvObject } from './env'
import { returnHttpResponse } from './utils/returnHttpResponse'
import { createFallbackErrorResponse } from './utils'
import { setClientIp } from './utils/clientIp'

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event))
})

export async function handleRequest(event: FetchEvent): Promise<Response> {
  setClientIp(event.client.address)
  try {
    const request = event.request
    const envObj = await getEnvObject()
    return await handleReq(request, envObj).then(returnHttpResponse)
  } catch (e) {
    console.error(e)
    return createFallbackErrorResponse(event.request, 'something went wrong')
  }
}
