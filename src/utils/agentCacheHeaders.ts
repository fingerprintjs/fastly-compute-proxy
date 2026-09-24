const removeWeakPrefix = (tag: string) => tag.trim().replace(/^W\//, '')

/**
 * `s-maxage` only drives the Fastly edge TTL, so it is not passed on to browsers.
 * The edge keeps the object for `s-maxage`, far longer than the browser `max-age`, so hits are served as fresh
 * (`age: 0`) instead of arriving already stale. The upstream CDN's `age` and `cache-tag` are not exposed.
 * The Compute cache serves hits as-is, so `If-None-Match` is evaluated here.
 *
 * `response.cached` requires building with `--enable-http-cache`.
 */
export function applyAgentCacheHeaders(request: Request, response: Response): Response {
  const cacheControl = response.headers.get('cache-control')
  if (cacheControl !== null) {
    const directives = cacheControl.split(',').filter((directive) => !/^\s*s-maxage\s*=/i.test(directive))
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
  if (etag !== null && ifNoneMatch !== null && removeWeakPrefix(etag) === removeWeakPrefix(ifNoneMatch)) {
    return new Response(null, { status: 304, headers: response.headers })
  }

  return response
}
