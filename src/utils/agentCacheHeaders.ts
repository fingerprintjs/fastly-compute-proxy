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

// A 304/412 has no body, so these headers describing one are dropped from it.
const BODY_HEADERS = ['content-length', 'content-type', 'content-encoding', 'content-language']

/**
 * Cache hit: reset `age`/`date` (Fastly serves hits frozen) so browsers get the full `max-age`, drop
 * upstream `cache-tag`. Cache miss: drop upstream `age`. Hits are served as-is, so `If-None-Match` is
 * evaluated here. Requires `--enable-http-cache` for `response.cached`.
 */
export function applyAgentCacheHeaders(request: Request, response: Response): Response {
  if (response.cached === true) {
    response.headers.set('age', '0')
    response.headers.set('date', new Date().toUTCString())
    response.headers.delete('cache-tag')
  } else {
    response.headers.delete('age')
  }

  const etag = response.headers.get('etag')
  const ifNoneMatch = request.headers.get('if-none-match')
  if (response.ok && etag !== null && ifNoneMatch !== null && matchesIfNoneMatch(ifNoneMatch, etag)) {
    const status = request.method === 'GET' || request.method === 'HEAD' ? 304 : 412
    const headers = new Headers(response.headers)
    BODY_HEADERS.forEach((name) => {
      headers.delete(name)
    })
    return new Response(null, { status, headers })
  }

  return response
}
