import { IntegrationEnv } from '../env'
import { handleApiRequest } from './handleApiRequest'

export async function handleIngressAPI(
  request: Request,
  env: IntegrationEnv,
  routeMatches: RegExpMatchArray | undefined
) {
  const pathname = request.method === 'GET' ? routeMatches?.[1] ?? '' : ''
  return handleApiRequest(request, env, pathname)
}
