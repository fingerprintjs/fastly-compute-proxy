import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { handleApiRequest } from '../../src/handlers'
import * as envModule from '../../src/env'
import * as processSealedResultModule from '../../src/utils/processSealedResultResponse'
import * as processOpenClientResponseModule from '../../src/utils/processOpenClientResponse'
import * as processIdentificationResponseModule from '../../src/utils/processIdentificationResponse'

jest.mock('../../src/utils/processSealedResultResponse')
jest.mock('../../src/utils/processOpenClientResponse')
jest.mock('../../src/utils/processIdentificationResponse')

describe('handleApiRequest plugin invocation', () => {
  const mockEnv: envModule.IntegrationEnv = {
    AGENT_SCRIPT_DOWNLOAD_PATH: 'agent',
    GET_RESULT_PATH: 'result',
    PROXY_SECRET: 'secret',
    DECRYPTION_KEY: null,
    OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED: null,
    SAVE_SEALED_RESULT_TO_KV_STORE_PLUGIN_ENABLED: null,
    SAVE_EVENT_TO_KV_STORE_PLUGIN_ENABLED: null,
  }

  const fetchSpy = jest.spyOn(globalThis, 'fetch')

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(processSealedResultModule.processSealedResultResponse).mockResolvedValue(undefined)
    jest.mocked(processOpenClientResponseModule.processOpenClientResponse).mockResolvedValue(undefined)
    jest.mocked(processIdentificationResponseModule.processIdentificationResponse).mockResolvedValue(undefined)

    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ requestId: 'test' }), { status: 200 }))
  })

  it('should not call processSealedResultResponse when DECRYPTION_KEY is not set', async () => {
    const env = { ...mockEnv, DECRYPTION_KEY: null }

    const request = new Request('https://test/result', { method: 'POST' })
    await handleApiRequest(request, env, '/result')

    expect(processSealedResultModule.processSealedResultResponse).not.toHaveBeenCalled()
  })

  it('should not call processSealedResultResponse when DECRYPTION_KEY is empty string', async () => {
    const env = { ...mockEnv, DECRYPTION_KEY: '' }

    const request = new Request('https://test/result', { method: 'POST' })
    await handleApiRequest(request, env, '/result')

    expect(processSealedResultModule.processSealedResultResponse).not.toHaveBeenCalled()
  })

  it('should not call processSealedResultResponse when DECRYPTION_KEY is whitespace only', async () => {
    const env = { ...mockEnv, DECRYPTION_KEY: '   ' }

    const request = new Request('https://test/result', { method: 'POST' })
    await handleApiRequest(request, env, '/result')

    expect(processSealedResultModule.processSealedResultResponse).not.toHaveBeenCalled()
  })

  it('should call processSealedResultResponse when DECRYPTION_KEY is set', async () => {
    const env = { ...mockEnv, DECRYPTION_KEY: 'some-decryption-key' }

    const request = new Request('https://test/result', { method: 'POST' })
    await handleApiRequest(request, env, '/result')

    expect(processSealedResultModule.processSealedResultResponse).toHaveBeenCalledTimes(1)
  })

  it('should log error when processSealedResultResponse rejects', async () => {
    const env = { ...mockEnv, DECRYPTION_KEY: 'some-decryption-key' }
    const error = new Error('Sealed result is not enabled for this subscription')
    jest.mocked(processSealedResultModule.processSealedResultResponse).mockRejectedValue(error)
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const request = new Request('https://test/result', { method: 'POST' })
    await handleApiRequest(request, env, '/result')

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Make sure Decryption Key is activated from Fingerprint workspace: '),
      error
    )

    consoleErrorSpy.mockRestore()
  })

  it('should always call processIdentificationResponse', async () => {
    const env = { ...mockEnv, DECRYPTION_KEY: null }

    const request = new Request('https://test/result', { method: 'POST' })
    await handleApiRequest(request, env, '/result')

    expect(processIdentificationResponseModule.processIdentificationResponse).toHaveBeenCalledTimes(1)
  })
})
