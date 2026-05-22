import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { processOpenClientResponse } from '../../src/utils/processOpenClientResponse'
import * as envModule from '../../src/env'
import { unsealData } from '../../src/utils/unsealData'
import { cloneFastlyResponse } from '../../src/utils/cloneFastlyResponse'
import { EventResponse } from '@fingerprintjs/fingerprintjs-pro-server-api'
import { plugins } from '../../src/utils/registerPlugin'

jest.mock('../../src/env')
jest.mock('../../src/utils/unsealData')
jest.mock('../../src/utils/cloneFastlyResponse')
jest.mock('../../src/utils/registerPlugin', () => ({
  plugins: [
    {
      name: 'testPlugin1',
      type: 'processOpenClientResponse',
      callback: jest.fn(),
    },
    {
      name: 'testPlugin2',
      type: 'processOpenClientResponse',
      callback: jest.fn(),
    },
    {
      name: 'otherPlugin',
      type: 'otherType',
      callback: jest.fn(),
    },
  ],
}))

describe('processOpenClientResponse', () => {
  const mockEnv = {} as envModule.IntegrationEnv
  const mockResponse = new Response('test')
  const mockDecryptionKey = 'mockDecryptionKey'
  const mockEvent: EventResponse = {
    products: {
      identification: {
        data: {
          requestId: 'mock-request-id',
          browserDetails: {
            browserName: 'Chrome',
            browserMajorVersion: '91',
            browserFullVersion: '91.0.4472.124',
            os: 'Windows',
            osVersion: '10',
            device: 'Other',
            userAgent:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
          incognito: false,
          ip: '127.0.0.1',
          timestamp: 1654815516086,
          time: '2022-06-09T22:58:36Z',
          url: 'https://example.com',
          tag: {},
          visitorFound: true,
          visitorId: 'mockVisitorId123456789',
          firstSeenAt: {
            global: '2022-06-09T22:58:36.086Z',
            subscription: '2022-06-09T22:58:36.086Z',
          },
          lastSeenAt: {
            global: '2022-06-09T22:58:36.086Z',
            subscription: '2022-06-09T22:58:36.086Z',
          },
        },
      },
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(envModule.getDecryptionKey).mockReturnValue(mockDecryptionKey)
    jest.mocked(unsealData).mockReturnValue(mockEvent)
    jest.mocked(cloneFastlyResponse).mockReturnValue(new Response('cloned'))
  })

  it('should process valid response with sealedResult and call plugins', async () => {
    const bodyBytes = new TextEncoder().encode(JSON.stringify({ sealedResult: 'mockSealedResult' }))

    await processOpenClientResponse(bodyBytes, mockResponse, mockEnv)

    expect(envModule.getDecryptionKey).toHaveBeenCalledWith(mockEnv)
    expect(unsealData).toHaveBeenCalledWith('mockSealedResult', mockDecryptionKey)
    expect(cloneFastlyResponse).toHaveBeenCalledTimes(2)
    expect(plugins[0].callback).toHaveBeenCalledWith({ event: mockEvent, httpResponse: expect.any(Response) })
    expect(plugins[1].callback).toHaveBeenCalledWith({ event: mockEvent, httpResponse: expect.any(Response) })
    expect(plugins[2].callback).not.toHaveBeenCalled()
  })

  it('should process valid response with sealed_result (snake_case) and call plugins', async () => {
    const bodyBytes = new TextEncoder().encode(JSON.stringify({ sealed_result: 'mockSealedResult' }))

    await processOpenClientResponse(bodyBytes, mockResponse, mockEnv)

    expect(unsealData).toHaveBeenCalledWith('mockSealedResult', mockDecryptionKey)
    expect(plugins[0].callback).toHaveBeenCalled()
    expect(plugins[1].callback).toHaveBeenCalled()
  })

  it('should throw error when sealed_result is null', async () => {
    const bodyBytes = new TextEncoder().encode(JSON.stringify({ sealed_result: null }))

    await expect(processOpenClientResponse(bodyBytes, mockResponse, mockEnv)).rejects.toThrow(
      'Sealed result is not enabled for this subscription'
    )
  })

  it('should throw error when sealed result key is missing', async () => {
    const bodyBytes = new TextEncoder().encode(JSON.stringify({ otherField: 'value' }))

    await expect(processOpenClientResponse(bodyBytes, mockResponse, mockEnv)).rejects.toThrow(
      'Sealed result is not enabled for this subscription'
    )
  })

  it('should handle invalid JSON in response body', async () => {
    const invalidJsonBytes = new TextEncoder().encode('invalid JSON')
    console.log = jest.fn()

    await processOpenClientResponse(invalidJsonBytes, mockResponse, mockEnv)

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Error parsing response body as JSON'))
    expect(unsealData).not.toHaveBeenCalled()
  })

  it('should throw error if decryption key is not found', async () => {
    const bodyBytes = new TextEncoder().encode(JSON.stringify({ sealedResult: 'mockSealedResult' }))
    jest.mocked(envModule.getDecryptionKey).mockReturnValue(null)

    await expect(processOpenClientResponse(bodyBytes, mockResponse, mockEnv)).rejects.toThrow(
      'Decryption key not found in secret store'
    )
  })

  it('should handle plugin errors without throwing', async () => {
    const bodyBytes = new TextEncoder().encode(JSON.stringify({ sealedResult: 'mockSealedResult' }))
    jest.mocked(plugins[0].callback).mockRejectedValue(new Error('Plugin error'))
    console.error = jest.fn()

    await processOpenClientResponse(bodyBytes, mockResponse, mockEnv)

    expect(console.error).toHaveBeenCalledWith('Plugin[testPlugin1]', expect.any(Error))
    expect(plugins[1].callback).toHaveBeenCalled()
  })
})
