import { createService } from './api/createService.ts'
import { createVersion } from './api/createVersion.ts'
import { selectVersionToClone } from './api/selectVersionToClone.ts'
import { deployPackage } from './api/deployPackage.ts'
import { activateVersion } from './api/activateVersion.ts'
import { waitForActivationIfConfigured } from './api/waitForActivation.ts'

async function main() {
  const SERVICE_NAME = process.env.SERVICE_NAME as string
  const service = await createService(SERVICE_NAME)
  const versionToClone = selectVersionToClone(service.versions, service.id)
  console.log('cloning version', versionToClone)
  const version = await createVersion(service.id, versionToClone)
  const versionNumber = version.number
  console.log('created draft version', versionNumber)
  console.log('deploying package...')
  await deployPackage(service.id, versionNumber)
  console.log('package deployed!')
  await activateVersion(service.id, versionNumber)
  console.log('activated version', versionNumber)

  await waitForActivationIfConfigured(versionNumber)
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
