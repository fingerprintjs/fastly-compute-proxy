import { inflate, inflateRaw } from 'pako'

export function decompressBody(bodyBytes: ArrayBuffer, contentEncoding: string | null): string {
  if (!contentEncoding) {
    return new TextDecoder('utf-8').decode(bodyBytes)
  }

  const encoding = contentEncoding.trim().toLowerCase()

  if (encoding === 'gzip' || encoding === 'x-gzip') {
    const decompressed = inflate(new Uint8Array(bodyBytes))
    return new TextDecoder('utf-8').decode(decompressed)
  }

  if (encoding === 'deflate') {
    const decompressed = inflateRaw(new Uint8Array(bodyBytes))
    return new TextDecoder('utf-8').decode(decompressed)
  }

  if (encoding === 'identity') {
    return new TextDecoder('utf-8').decode(bodyBytes)
  }

  throw new Error(`Unsupported Content-Encoding: ${encoding}`)
}
