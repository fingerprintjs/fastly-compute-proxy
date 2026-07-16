import { createClient } from '../utils/createClient.ts'
import * as fs from 'fs'

export async function deployPackage(service_id: string, versionId: number) {
  return createClient('package').putPackage({
    version_id: versionId,
    service_id,
    _package: fs.createReadStream(__dirname + '/../../pkg/fingerprint-fastly-compute-proxy-integration.tar.gz'),
  })
}
