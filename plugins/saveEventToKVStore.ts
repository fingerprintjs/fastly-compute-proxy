// To enable this plugin, add an entry to `/plugins/index.ts`

import { KVStore } from 'fastly:kv-store'
import { ProcessIdentificationResponseContext } from '../src/utils/registerPlugin'
import { getConfigStore } from '../src/utils/getStore'
import { env } from 'fastly:env'
import { saveEventToKvStorePluginEnabledVarName } from '../src/env'

export async function saveEventToKVStore(context: ProcessIdentificationResponseContext) {
  const configStore = getConfigStore()
  const isPluginEnabled = configStore?.get(saveEventToKvStorePluginEnabledVarName) === 'true'

  if (!isPluginEnabled) {
    console.log(`Plugin '${saveEventToKvStorePluginEnabledVarName}' is not enabled`)
    return
  }

  const eventId = context.response.event_id as string | undefined
  if (!eventId) {
    console.log(
      `[${saveEventToKvStorePluginEnabledVarName}] Plugin Error: event_id is undefined in the event response.`
    )
    return
  }
  const serviceId = env('FASTLY_SERVICE_ID')
  const store = new KVStore(`Fingerprint_Events_${serviceId}`)
  await store.put(eventId, JSON.stringify(context.response))
}
