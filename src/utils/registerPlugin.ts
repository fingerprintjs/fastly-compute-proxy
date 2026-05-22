import { EventResponse } from '@fingerprintjs/fingerprintjs-pro-server-api'
import { Event } from '@fingerprint/node-sdk'
import loadedPlugins from '../../plugins'

export type ProcessOpenClientResponseContext = {
  event: EventResponse | Event | null
  httpResponse: Response
}

export function isV4Event(event: EventResponse | Event | null): event is Event {
  return event != null && 'event_id' in event
}

export function getEventId(event: EventResponse | Event | null): string | undefined {
  if (event == null) {
    return undefined
  }
  if (isV4Event(event)) {
    return event.event_id
  }
  return event.products?.identification?.data?.requestId
}

export type ProcessUnsealedDataPluginFunction = (context: ProcessOpenClientResponseContext) => void | Promise<void>
type PluginType = 'processOpenClientResponse'

export type ProcessOpenClientResponsePlugin = {
  name: string
  type: PluginType
  callback: ProcessUnsealedDataPluginFunction
}

export type Plugin = ProcessOpenClientResponsePlugin // This type will be union of types if more plugin/hook types gets introduced
export const plugins: Plugin[] = loadedPlugins
