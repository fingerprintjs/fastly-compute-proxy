import { describe, expect, it } from '@jest/globals'
import { decompressBody } from '../../src/utils/decompressBody'
import { deflateRaw, gzip } from 'pako'

describe('decompressBody', () => {
  const testJson = JSON.stringify({ sealedResult: 'mockSealedResult' })

  it('should decode plain text when content-encoding is null', () => {
    const bytes = new TextEncoder().encode(testJson)
    const result = decompressBody(bytes.buffer, null)
    expect(result).toBe(testJson)
  })

  it('should decode plain text when content-encoding is identity', () => {
    const bytes = new TextEncoder().encode(testJson)
    const result = decompressBody(bytes.buffer, 'identity')
    expect(result).toBe(testJson)
  })

  it('should decompress gzip-encoded body', () => {
    const compressed = gzip(testJson)
    const result = decompressBody(compressed.buffer, 'gzip')
    expect(result).toBe(testJson)
  })

  it('should decompress x-gzip-encoded body', () => {
    const compressed = gzip(testJson)
    const result = decompressBody(compressed.buffer, 'x-gzip')
    expect(result).toBe(testJson)
  })

  it('should decompress deflate-encoded body', () => {
    const compressed = deflateRaw(testJson)
    const result = decompressBody(compressed.buffer, 'deflate')
    expect(result).toBe(testJson)
  })

  it('should throw for unsupported encoding', () => {
    const bytes = new TextEncoder().encode(testJson)
    expect(() => decompressBody(bytes.buffer, 'br')).toThrow('Unsupported Content-Encoding: br')
  })

  it('should handle case-insensitive and whitespace in encoding', () => {
    const compressed = gzip(testJson)
    const result = decompressBody(compressed.buffer, '  GZIP  ')
    expect(result).toBe(testJson)
  })
})
