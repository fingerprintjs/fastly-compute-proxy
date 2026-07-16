import { createService } from './api/createService.ts'
import { createVersion } from './api/createVersion.ts'
import { deployPackage } from './api/deployPackage.ts'
import { activateVersion } from './api/activateVersion.ts'

async function main() {
  const SERVICE_NAME = process.env.SERVICE_NAME as string
  const service = await createService(SERVICE_NAME)
  const versionsSorted = service.versions.sort((a: any, b: any) => b.number - a.number)
  const lastVersion = versionsSorted.length > 0 ? versionsSorted[0] : undefined
  let versionNumber
  if (lastVersion?.active) {
    console.log('active version found', lastVersion.number)
    const version = await createVersion(service.id, lastVersion.number)
    versionNumber = version.number
    console.log('created draft version', versionNumber)
  }
  if (!versionNumber) {
    console.log('version not found, creating...')
    const version = await createVersion(service.id)
    versionNumber = version.number
    console.log('version created', versionNumber)
  }
  console.log('deploying package...')
  await deployPackage(service.id, versionNumber)
  console.log('package deployed!')
  await activateVersion(service.id, versionNumber)
  console.log('activated version', versionNumber)
}

main()
  .then(() => {
    console.log('CI Deploy completed!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('CI Deploy failed', err)
    process.exit(1)
  })
