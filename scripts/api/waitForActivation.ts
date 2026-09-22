const VERSION_PATTERN = /Fastly Compute Service version:\s*<strong>(\d+)<\/strong>/

export type WaitForActivationOptions = {
  statusUrl: string
  expectedVersion: number
  timeoutMs?: number
  pollIntervalMs?: number
  /**
   * Fastly rolls a new version out POP by POP, and each poll can land on a different POP.
   * Requiring several consecutive sightings makes it much less likely we declare success
   * while some POPs are still serving the old version.
   */
  requiredConsecutiveHits?: number
}

/**
 * Polls the integration's own status page until it reports `expectedVersion` (or newer).
 * The page renders `FASTLY_SERVICE_VERSION` from the running service, so this confirms the
 * activated version is actually serving traffic rather than just being marked active in the API.
 */
export async function waitForActivation({
  statusUrl,
  expectedVersion,
  timeoutMs = 5 * 60_000,
  pollIntervalMs = 5_000,
  requiredConsecutiveHits = 3,
}: WaitForActivationOptions) {
  const deadline = Date.now() + timeoutMs
  let consecutiveHits = 0
  let lastSeen: number | undefined
  let attempt = 0

  while (Date.now() < deadline) {
    attempt++
    const reported = await readReportedVersion(statusUrl)

    if (reported === undefined) {
      consecutiveHits = 0
    } else {
      lastSeen = reported
      if (reported >= expectedVersion) {
        consecutiveHits++
        console.log(
          `Status page reports version ${reported} (want >= ${expectedVersion}) [${consecutiveHits}/${requiredConsecutiveHits}]`
        )
        if (consecutiveHits >= requiredConsecutiveHits) {
          console.log(`Version ${reported} is live.`)
          return reported
        }
      } else {
        if (consecutiveHits > 0) {
          console.log(`Version went back to ${reported}, resetting confirmation streak.`)
        }
        consecutiveHits = 0
        console.log(`Attempt ${attempt}: status page still reports version ${reported}, waiting...`)
      }
    }

    await sleep(pollIntervalMs)
  }

  throw new Error(
    `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for ${statusUrl} to report version ${expectedVersion}. Last seen: ${lastSeen ?? 'no readable version'}.`
  )
}

async function readReportedVersion(statusUrl: string) {
  // Cache-bust: routing matches on pathname only, so the query string is ignored by the service
  // but keeps us from reading a cached response.
  const url = new URL(statusUrl)
  url.searchParams.set('_cb', `${Date.now()}`)

  let response: Response
  try {
    response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } })
  } catch (e) {
    console.log(`Status page unreachable (${(e as Error).message}), retrying...`)
    return undefined
  }

  if (!response.ok) {
    console.log(`Status page returned HTTP ${response.status}, retrying...`)
    return undefined
  }

  const match = VERSION_PATTERN.exec(await response.text())
  if (!match) {
    console.log('Could not find a service version on the status page, retrying...')
    return undefined
  }
  return Number(match[1])
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Shared entry point for the deploy scripts: waits when STATUS_URL is configured, and is a
 * no-op otherwise, so callers do not each re-implement the env handling.
 */
export async function waitForActivationIfConfigured(expectedVersion: number) {
  const statusUrl = process.env.STATUS_URL
  if (!statusUrl) {
    console.log('STATUS_URL not set, skipping rollout check.')
    return
  }
  console.log(`Waiting for ${statusUrl} to report version ${expectedVersion}...`)
  await waitForActivation({
    statusUrl,
    expectedVersion,
    timeoutMs: numberFromEnv('ROLLOUT_TIMEOUT_MS', 5 * 60_000),
    pollIntervalMs: numberFromEnv('ROLLOUT_POLL_INTERVAL_MS', 5_000),
    requiredConsecutiveHits: numberFromEnv('ROLLOUT_CONSECUTIVE_HITS', 3),
  })
}

function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name]
  if (!raw) {
    return fallback
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number, got "${raw}"`)
  }
  return parsed
}
