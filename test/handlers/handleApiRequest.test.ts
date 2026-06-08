import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { handleApiRequest } from '../../src/handlers'
import * as envModule from '../../src/env'
import * as processOpenClientResponseModule from '../../src/utils/processOpenClientResponse'

jest.mock('../../src/utils/processOpenClientResponse')

describe('handleApiRequest plugin invocation', () => {
  const mockEnv: envModule.IntegrationEnv = {
    AGENT_SCRIPT_DOWNLOAD_PATH: 'agent',
    GET_RESULT_PATH: 'result',
    PROXY_SECRET: 'secret',
    DECRYPTION_KEY: null,
    OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED: null,
    SAVE_TO_KV_STORE_PLUGIN_ENABLED: null,
  }

  const fetchSpy = jest.spyOn(globalThis, 'fetch')

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(processOpenClientResponseModule.processOpenClientResponse).mockResolvedValue(undefined)
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ requestId: 'test' }), { status: 200 }))
  })

  it('should not call processOpenClientResponse when OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED is not set', async () => {
    const env = { ...mockEnv, OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED: null }

    const request = new Request('https://test/result', { method: 'POST' })
    await handleApiRequest(request, env, '/result')

    expect(processOpenClientResponseModule.processOpenClientResponse).not.toHaveBeenCalled()
  })

  it('should not call processOpenClientResponse when OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED is false', async () => {
    const env = { ...mockEnv, OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED: 'false' }

    const request = new Request('https://test/result', { method: 'POST' })
    await handleApiRequest(request, env, '/result')

    expect(processOpenClientResponseModule.processOpenClientResponse).not.toHaveBeenCalled()
  })

  it('should call processOpenClientResponse when OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED is true', async () => {
    const env = { ...mockEnv, OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED: 'true' }

    const request = new Request('https://test/result', { method: 'POST' })
    await handleApiRequest(request, env, '/result')

    expect(processOpenClientResponseModule.processOpenClientResponse).toHaveBeenCalledTimes(1)
  })

  it('should log error when processOpenClientResponse rejects', async () => {
    const env = { ...mockEnv, OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED: 'true' }
    const error = new Error('Decryption key not found in secret store')
    jest.mocked(processOpenClientResponseModule.processOpenClientResponse).mockRejectedValue(error)
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const request = new Request('https://test/result', { method: 'POST' })
    await handleApiRequest(request, env, '/result')

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Make sure OPEN_CLIENT_RESPONSE_PLUGINS_ENABLED is set to true'),
      error
    )

    consoleErrorSpy.mockRestore()
  })
})
