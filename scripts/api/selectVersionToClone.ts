export type ServiceVersion = {
  number: number
  active?: boolean
}

/**
 * Picks the version a new draft should be cloned from.
 *
 * Always returns an existing version. Creating a blank version instead carries over no domains,
 * backends or store links, so the package would be activated into a service that serves nothing.
 *
 * Prefers the active version (what is serving right now) over the highest-numbered one, because a
 * leftover draft from an earlier failed run can sit above the active version.
 */
export function selectVersionToClone(versions: ServiceVersion[] | undefined, serviceId: string): number {
  const all = versions ?? []

  const active = all.find((version) => version.active)
  if (active) {
    return active.number
  }

  const highest = all.reduce<ServiceVersion | undefined>(
    (best, version) => (best === undefined || version.number > best.number ? version : best),
    undefined
  )
  if (!highest) {
    throw new Error(`Service ${serviceId} has no versions to clone from.`)
  }

  console.warn(
    `Service ${serviceId} has no active version; cloning highest version ${highest.number} to preserve its domains, backends and store links.`
  )
  return highest.number
}
