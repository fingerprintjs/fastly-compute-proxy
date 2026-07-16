import { createClient } from '../utils/createClient.ts'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function deployPackage(service_id: string, versionId: number) {
  return createClient('package').putPackage({
    version_id: versionId,
    service_id,
    _package: fs.createReadStream(path.join(__dirname, '../../pkg/fingerprint-fastly-compute-proxy-integration.tar.gz')),
  })
}
