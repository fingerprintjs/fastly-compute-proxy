// To enable this plugin, add an entry to `/plugins/index.ts`

import { KVStore } from 'fastly:kv-store'
import { ProcessSealedResultContext, getEventId } from '../src/utils/registerPlugin'
import { getConfigStore } from '../src/utils/getStore'
import { env } from 'fastly:env'
import { saveSealedResultToKvStorePluginEnabledVarName, saveToKvStorePluginEnabledVarName } from '../src/env'

export async function saveSealedResultToKVStore(context: ProcessSealedResultContext) {
  const configStore = getConfigStore()
  const isPluginEnabled =
    configStore?.get(saveSealedResultToKvStorePluginEnabledVarName) === 'true' ||
    configStore?.get(saveToKvStorePluginEnabledVarName) === 'true'

  if (!isPluginEnabled) {
    console.log(`Plugin '${saveSealedResultToKvStorePluginEnabledVarName}' is not enabled`)
    return
  }

  const eventId = getEventId(context.event)
  if (!eventId) {
    console.log(
      `[${saveSealedResultToKvStorePluginEnabledVarName}] Plugin Error: event ID is undefined in the event response.`
    )
    return
  }
  const serviceId = env('FASTLY_SERVICE_ID')
  const store = new KVStore(`Fingerprint_Results_${serviceId}`)
  await store.put(eventId, JSON.stringify(context.event))
}
