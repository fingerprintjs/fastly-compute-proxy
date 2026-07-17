import packageJson from '../../package.json' with { type: 'json' }
const INT_VERSION = packageJson.version
const PARAM_NAME = 'ii'

function getTrafficMonitoringValue(): string {
  return `fingerprint-pro-fastly-compute/${INT_VERSION}/ingress`
}

export function addTrafficMonitoringSearchParamsForVisitorIdRequest(url: URL) {
  url.searchParams.append(PARAM_NAME, getTrafficMonitoringValue())
}
