export const DEFAULT_AGENT_VERSION = '3'

export function getAgentScriptPath(searchParams: URLSearchParams): string {
  const apiKey = searchParams.get('apiKey')
  const apiVersion = searchParams.get('version') ?? DEFAULT_AGENT_VERSION

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- apiKey validation is handled upstream
  const base = `web/v${apiVersion}/${apiKey}`
  const loaderVersion = searchParams.get('loaderVersion')
  const lv = loaderVersion ? `/loader_v${loaderVersion}.js` : ''

  return `${base}${lv}`
}
