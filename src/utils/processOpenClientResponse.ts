import { plugins } from './registerPlugin'
import { unsealData } from './unsealData'
import { cloneFastlyResponse } from './cloneFastlyResponse'
import { decompressBody } from './decompressBody'
import { getDecryptionKey, IntegrationEnv } from '../env'

type FingerprintSealedIngressResponseBody = {
  sealedResult?: string | null
  sealed_result?: string | null
}

export async function processOpenClientResponse(
  bodyBytes: ArrayBuffer,
  response: Response,
  env: IntegrationEnv
): Promise<void> {
  let responseBody: string | null = null
  try {
    const contentEncoding = response.headers.get('content-encoding')
    responseBody = decompressBody(bodyBytes, contentEncoding)
  } catch (e) {
    console.log(`Error occurred when decoding response body: ${e}.`)
  }

  if (responseBody == null) {
    console.log('responseBody is null. Skipping plugins and returning the response.')
    return
  }

  const decryptionKey = getDecryptionKey(env)
  if (!decryptionKey) {
    throw new Error('Decryption key not found in secret store')
  }
  let parsedText: FingerprintSealedIngressResponseBody
  try {
    parsedText = JSON.parse(responseBody)
  } catch (e) {
    console.log(`Error parsing response body as JSON: ${e}`)
    return
  }
  const sealedResult = parsedText.sealedResult ?? parsedText.sealed_result
  if (!sealedResult) {
    throw new Error('Sealed result is not enabled for this subscription')
  }
  const event = unsealData(sealedResult, decryptionKey)
  const filteredPlugins = plugins.filter((t) => t.type === 'processOpenClientResponse')
  for (const filteredPlugin of filteredPlugins) {
    try {
      const clonedHttpResponse = cloneFastlyResponse(bodyBytes, response)
      await filteredPlugin.callback({ event, httpResponse: clonedHttpResponse })
    } catch (e: unknown) {
      console.error(`Plugin[${filteredPlugin.name}]`, e)
    }
  }
}
