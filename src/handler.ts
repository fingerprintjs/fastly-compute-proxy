import {
  getScriptDownloadPath,
  getGetResultPath,
  IntegrationEnv,
  getStatusPagePath,
  isScriptDownloadPathSet,
  isGetResultPathSet,
} from './env'

import { handleDownloadScript, handleIngressAPI, handleStatusPage } from './handlers'
import { handleApiRequest } from './handlers/handleApiRequest'
import { createRoute } from './utils'

export type Route = {
  pathPattern: RegExp
  handler: (
    request: Request,
    env: IntegrationEnv,
    routeMatchArray: RegExpMatchArray | undefined
  ) => Response | Promise<Response>
}

function createRoutes(env: IntegrationEnv): Route[] {
  const routes: Route[] = []

  if (isScriptDownloadPathSet(env)) {
    routes.push({
      pathPattern: createRoute(getScriptDownloadPath(env)),
      handler: handleDownloadScript,
    })
  }

  if (isGetResultPathSet(env)) {
    routes.push({
      pathPattern: createRoute(getGetResultPath(env)),
      handler: handleIngressAPI,
    })
  }

  routes.push({
    pathPattern: createRoute(getStatusPagePath()),
    handler: (request, env) => handleStatusPage(request, env),
  })

  return routes
}

export function handleRequestWithRoutes(
  request: Request,
  env: IntegrationEnv,
  routes: Route[]
): Promise<Response> | Response {
  const url = new URL(request.url)
  for (const route of routes) {
    const matches = url.pathname.match(route.pathPattern)
    if (matches) {
      return route.handler(request, env, matches)
    }
  }

  return handleApiRequest(request, env, url.pathname)
}

export async function handleReq(request: Request, env: IntegrationEnv): Promise<Response> {
  const routes = createRoutes(env)
  return handleRequestWithRoutes(request, env, routes)
}
