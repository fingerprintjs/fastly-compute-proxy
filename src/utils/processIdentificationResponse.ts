import { plugins } from './registerPlugin'
import { cloneFastlyResponse } from './cloneFastlyResponse'

export async function processIdentificationResponse(
  parsedBody: Record<string, unknown>,
  bodyBytes: ArrayBuffer,
  response: Response
): Promise<void> {
  const filteredPlugins = plugins.filter((t) => t.type === 'processIdentificationResponse')
  for (const filteredPlugin of filteredPlugins) {
    try {
      const clonedHttpResponse = cloneFastlyResponse(bodyBytes, response)
      await filteredPlugin.callback({ response: parsedBody, httpResponse: clonedHttpResponse })
    } catch (e: unknown) {
      console.error(`Plugin[${filteredPlugin.name}]`, e)
    }
  }
}
