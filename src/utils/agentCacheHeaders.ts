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
 * - On a cache hit, `age` is reset to 0 so browsers keep the agent for the full `max-age`, and the upstream
 *   `cache-tag` is removed.
 * - On a cache miss, the upstream CDN's `age` is removed and `cache-tag` is kept.
 * - With the HTTP cache API on, the Compute cache serves hits as-is, so `If-None-Match` is evaluated here.
 *
 * `response.cached` requires building with `--enable-http-cache`.
 */
export function applyAgentCacheHeaders(request: Request, response: Response): Response {
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
