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
      name: 'openClientPlugin1',
      type: 'processOpenClientResponse',
      callback: jest.fn(),
    },
    {
      name: 'openClientPlugin2',
      type: 'processOpenClientResponse',
      callback: jest.fn(),
    },
  ],
}))

describe('processOpenClientResponse', () => {
  const mockEnv = {} as envModule.IntegrationEnv
  const mockResponse = new Response('test')
  const mockBodyBytes = new ArrayBuffer(0)
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

  it('should process valid response with sealedResult and call only processOpenClientResponse plugins', async () => {
    const parsedBody = { sealedResult: 'mockSealedResult' }

    await processOpenClientResponse(parsedBody, mockBodyBytes, mockResponse, mockEnv)

    expect(envModule.getDecryptionKey).toHaveBeenCalledWith(mockEnv)
    expect(unsealData).toHaveBeenCalledWith('mockSealedResult', mockDecryptionKey)
    expect(cloneFastlyResponse).toHaveBeenCalledTimes(2)
    expect(plugins[0].callback).toHaveBeenCalledWith({ event: mockEvent, httpResponse: expect.any(Response) })
    expect(plugins[1].callback).toHaveBeenCalledWith({ event: mockEvent, httpResponse: expect.any(Response) })
  })

  it('should process valid response with sealed_result (snake_case) and call plugins', async () => {
    const parsedBody = { sealed_result: 'mockSealedResult' }

    await processOpenClientResponse(parsedBody, mockBodyBytes, mockResponse, mockEnv)

    expect(unsealData).toHaveBeenCalledWith('mockSealedResult', mockDecryptionKey)
    expect(plugins[0].callback).toHaveBeenCalled()
    expect(plugins[1].callback).toHaveBeenCalled()
  })

  it('should throw error when sealed_result is null', async () => {
    const parsedBody = { sealed_result: null }

    await expect(processOpenClientResponse(parsedBody, mockBodyBytes, mockResponse, mockEnv)).rejects.toThrow(
      'Sealed result is not enabled for this subscription'
    )
  })

  it('should throw error when sealed result key is missing', async () => {
    const parsedBody = { otherField: 'value' }

    await expect(processOpenClientResponse(parsedBody, mockBodyBytes, mockResponse, mockEnv)).rejects.toThrow(
      'Sealed result is not enabled for this subscription'
    )
  })

  it('should throw error if decryption key is not found', async () => {
    const parsedBody = { sealedResult: 'mockSealedResult' }
    jest.mocked(envModule.getDecryptionKey).mockReturnValue(null)

    await expect(processOpenClientResponse(parsedBody, mockBodyBytes, mockResponse, mockEnv)).rejects.toThrow(
      'Decryption key not found in secret store'
    )
  })

  it('should handle plugin errors without throwing', async () => {
    const parsedBody = { sealedResult: 'mockSealedResult' }
    // @ts-ignore
    jest.mocked(plugins[0].callback).mockRejectedValue(new Error('Plugin error'))
    console.error = jest.fn()

    await processOpenClientResponse(parsedBody, mockBodyBytes, mockResponse, mockEnv)

    expect(console.error).toHaveBeenCalledWith('Plugin[openClientPlugin1]', expect.any(Error))
    expect(plugins[1].callback).toHaveBeenCalled()
  })
})
