function isSharedMaxAge(directive: string): boolean {
  return directive.trim().toLowerCase().startsWith('s-maxage')
}

function removeWeakPrefix(tag: string): string {
  const trimmedTag = tag.trim()
  return trimmedTag.startsWith('W/') ? trimmedTag.slice(2) : trimmedTag
}

// Weak comparison, as required for If-None-Match (RFC 9110)
function matchesIfNoneMatch(ifNoneMatch: string, etag: string): boolean {
  if (ifNoneMatch.trim() === '*') {
    return true
  }

  const expectedTag = removeWeakPrefix(etag)
  return ifNoneMatch.split(',').some((tag) => removeWeakPrefix(tag) === expectedTag)
}

/**
 * - `s-maxage` only drives the Fastly edge TTL, so it is not passed on to browsers.
 * - On a cache hit, `age` is reset to 0 and the upstream `cache-tag` is removed. The edge keeps the object for
 *   `s-maxage`, far longer than the browser `max-age`, so the real age would make hits arrive already stale.
 * - On a cache miss, the upstream CDN's `age` is removed and `cache-tag` is kept.
 * - The Compute cache serves hits as-is, so `If-None-Match` is evaluated here.
 *
 * `response.cached` requires building with `--enable-http-cache`.
 */
export function applyAgentCacheHeaders(request: Request, response: Response): Response {
  const cacheControl = response.headers.get('cache-control')
  if (cacheControl !== null) {
    const directives = cacheControl.split(',').filter((directive) => !isSharedMaxAge(directive))
    response.headers.set('cache-control', directives.join(',').trim())
  }

  if (response.cached === true) {
    response.headers.set('age', '0')
    response.headers.delete('cache-tag')
  } else {
    response.headers.delete('age')
  }

  const etag = response.headers.get('etag')
  const ifNoneMatch = request.headers.get('if-none-match')
  if (response.ok && etag !== null && ifNoneMatch !== null && matchesIfNoneMatch(ifNoneMatch, etag)) {
    const status = request.method === 'GET' || request.method === 'HEAD' ? 304 : 412
    return new Response(null, { status, headers: response.headers })
  }

  return response
}
