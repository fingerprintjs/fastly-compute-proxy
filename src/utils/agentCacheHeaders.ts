function isSharedMaxAge(directive: string): boolean {
  const [name] = directive.split('=')
  return name.trim().toLowerCase() === 's-maxage'
}

// Entity tags are quoted, so every odd part between quotes is an opaque tag, even if it contains commas.
// The weak `W/` prefix stays outside the quotes, which gives the weak comparison If-None-Match requires (RFC 9110).
function getOpaqueTags(header: string): string[] {
  return header.split('"').filter((_, index) => index % 2 === 1)
}

function matchesIfNoneMatch(ifNoneMatch: string, etag: string): boolean {
  if (ifNoneMatch.trim() === '*') {
    return true
  }

  const requestedTags = getOpaqueTags(ifNoneMatch)
  return getOpaqueTags(etag).some((tag) => requestedTags.includes(tag))
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
