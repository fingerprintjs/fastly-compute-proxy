import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { processIdentificationResponse } from '../../src/utils/processIdentificationResponse'
import { cloneFastlyResponse } from '../../src/utils/cloneFastlyResponse'
import { plugins } from '../../src/utils/registerPlugin'

jest.mock('../../src/utils/cloneFastlyResponse')
jest.mock('../../src/utils/registerPlugin', () => ({
  plugins: [
    {
      name: 'identificationPlugin1',
      type: 'processIdentificationResponse',
      callback: jest.fn(),
    },
    {
      name: 'identificationPlugin2',
      type: 'processIdentificationResponse',
      callback: jest.fn(),
    },
    {
      name: 'sealedResultPlugin',
      type: 'processSealedResult',
      callback: jest.fn(),
    },
  ],
}))

describe('processIdentificationResponse', () => {
  const mockResponse = new Response('test')
  const mockBodyBytes = new ArrayBuffer(0)
  const mockIdentificationResponse = {
    requestId: 'mock-request-id',
    visitorId: 'mockVisitorId123456789',
    visitorFound: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(cloneFastlyResponse).mockReturnValue(new Response('cloned'))
  })

  it('should process valid response and call processIdentificationResponse plugins', async () => {
    await processIdentificationResponse(mockIdentificationResponse, mockBodyBytes, mockResponse)

    expect(cloneFastlyResponse).toHaveBeenCalledTimes(2)
    expect(plugins[0].callback).toHaveBeenCalledWith({
      response: mockIdentificationResponse,
      httpResponse: expect.any(Response),
    })
    expect(plugins[1].callback).toHaveBeenCalledWith({
      response: mockIdentificationResponse,
      httpResponse: expect.any(Response),
    })
    expect(plugins[2].callback).not.toHaveBeenCalled()
  })

  it('should handle plugin errors without throwing', async () => {
    jest.mocked(plugins[0].callback).mockRejectedValue(new Error('Plugin error'))
    console.error = jest.fn()

    await processIdentificationResponse(mockIdentificationResponse, mockBodyBytes, mockResponse)

    expect(console.error).toHaveBeenCalledWith('Plugin[identificationPlugin1]', expect.any(Error))
    expect(plugins[1].callback).toHaveBeenCalled()
  })
})
