import { saveSealedResultToKVStore } from './saveSealedResultToKVStore'
import { saveEventToKVStore } from './saveEventToKVStore'
import { Plugin } from '../src/utils/registerPlugin'

export default [
  {
    name: 'Save Fingerprint Sealed Result to KV Store',
    callback: saveSealedResultToKVStore,
    type: 'processSealedResult',
  },
  {
    name: 'Save Event to KV Store',
    callback: saveEventToKVStore,
    type: 'processIdentificationResponse',
  },
] satisfies Plugin[]
