import { saveFingerprintResultToKVStore } from './saveToKVStore'
import type { Plugin } from '../src/utils/registerPlugin'

export default [
  {
    name: 'Save Fingerprint Result to KV Store',
    callback: saveFingerprintResultToKVStore,
    type: 'processOpenClientResponse',
  },
] satisfies Plugin[]
