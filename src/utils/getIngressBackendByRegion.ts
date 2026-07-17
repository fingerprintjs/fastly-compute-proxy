import { Backend } from 'fastly:backend'

export function getIngressBackendByRegion(url: URL) {
  if (Backend.exists('fingerprint')) {
    return 'fingerprint'
  }
  // backward compat: region-named backends are deprecated, add a backend named 'fingerprint' instead
  console.warn(
    'Deprecated: region-named backends (api.fpjs.io, eu.api.fpjs.io, ap.api.fpjs.io) are deprecated. ' +
      "Please add a backend named 'fingerprint' pointing to your regional Fingerprint API host."
  )
  const region = url.searchParams.get('region')
  switch (region) {
    case 'eu':
      return 'eu.api.fpjs.io'
    case 'ap':
      return 'ap.api.fpjs.io'
    case null:
    case 'us':
    default:
      return 'api.fpjs.io'
  }
}
