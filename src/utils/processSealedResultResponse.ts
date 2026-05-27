import { plugins } from './registerPlugin'
import { unsealData } from './unsealData'
import { cloneFastlyResponse } from './cloneFastlyResponse'
import { getDecryptionKey, IntegrationEnv } from '../env'

type FingerprintSealedIngressResponseBody = {
  sealedResult?: string | null
  sealed_result?: string | null
}

export async function processSealedResultResponse(
  parsedBody: Record<string, unknown>,
  bodyBytes: ArrayBuffer,
  response: Response,
  env: IntegrationEnv
): Promise<void> {
  const typedBody = parsedBody as unknown as FingerprintSealedIngressResponseBody
  const sealedResult = typedBody.sealedResult ?? typedBody.sealed_result
  if (!sealedResult) {
    throw new Error('Sealed result is not enabled for this subscription')
  }

  const decryptionKey = getDecryptionKey(env)
  if (!decryptionKey) {
    throw new Error('Decryption key not found in secret store')
  }
  const event = unsealData(sealedResult, decryptionKey)
  const filteredPlugins = plugins.filter((t) => t.type === 'processSealedResult')
  for (const filteredPlugin of filteredPlugins) {
    try {
      const clonedHttpResponse = cloneFastlyResponse(bodyBytes, response)
      await filteredPlugin.callback({ event, httpResponse: clonedHttpResponse })
    } catch (e: unknown) {
      console.error(`Plugin[${filteredPlugin.name}]`, e)
    }
  }
}
