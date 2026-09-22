export type DeletableService = {
  id?: string
  name?: string
  type?: string
}

/**
 * Guard rails for destructive cleanup. Deleting a Fastly service is irreversible, and the
 * target is chosen by a name computed from a branch, so every assumption is checked explicitly
 * rather than trusted. Any mismatch throws instead of deleting.
 */
export function assertSafeToDelete(service: DeletableService, expectedName: string) {
  if (!expectedName) {
    throw new Error('Refusing to delete: no expected service name was provided.')
  }

  // Exact match, never a prefix or fuzzy match: we only ever delete the one service this PR made.
  if (service.name !== expectedName) {
    throw new Error(`Refusing to delete: service is named "${service.name}", expected "${expectedName}".`)
  }

  // PR preview services are always named mock-<branch>-<hash>.<ci domain>.
  if (!/^mock-/.test(service.name ?? '')) {
    throw new Error(`Refusing to delete "${service.name}": name does not start with "mock-".`)
  }

  // Never touch anything that is not a Compute service.
  if (service.type !== 'wasm') {
    throw new Error(`Refusing to delete "${service.name}": type is "${service.type}", expected "wasm".`)
  }

  if (!service.id) {
    throw new Error(`Refusing to delete "${service.name}": no service id.`)
  }
}

/**
 * A store is only removed when its name embeds the id of the service we just deleted, so a
 * shared or unrelated store can never be caught by the cleanup.
 */
export function assertStoreBelongsToService(storeName: string, serviceId: string, prefix: string) {
  const expected = [`${prefix}_Config_Store_${serviceId}`, `${prefix}_Secret_Store_${serviceId}`]
  if (!expected.includes(storeName)) {
    throw new Error(`Refusing to delete store "${storeName}": it does not belong to service ${serviceId}.`)
  }
}
