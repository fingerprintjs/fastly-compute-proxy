import { createClient } from '../utils/createClient.ts'

export async function createVersion(service_id: string, versionToClone?: number) {
  if (!versionToClone) {
    return createClient('version').createServiceVersion({
      service_id,
    })
  }
  return createClient('version').cloneServiceVersion({
    service_id,
    version_id: versionToClone,
  })
}
