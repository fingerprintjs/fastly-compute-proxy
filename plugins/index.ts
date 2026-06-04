import { saveFingerprintResultToKVStore } from './saveToKVStore'
import { Plugin } from '../src/utils/registerPlugin'

export default [
  {
    name: 'Save Fingerprint Result to KV Store',
    callback: saveFingerprintResultToKVStore,
    type: 'processOpenClientResponse',
  },
] satisfies Plugin[]
