import { saveSealedResultToKVStore } from './saveSealedResultToKVStore'
import { Plugin } from '../src/utils/registerPlugin'

export default [
  {
    name: 'Save Fingerprint Sealed Result to KV Store',
    callback: saveSealedResultToKVStore,
    type: 'processSealedResult',
  },
] satisfies Plugin[]
