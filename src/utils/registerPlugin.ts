import { EventResponse } from '@fingerprintjs/fingerprintjs-pro-server-api'
import { type Event } from '@fingerprint/node-sdk'
import loadedPlugins from '../../plugins'

export type ProcessOpenClientResponseContext = {
  event: EventResponse | Event | null
  httpResponse: Response
}

export type ProcessSealedResultContext = {
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

export type ProcessSealedResultPluginFunction = (context: ProcessSealedResultContext) => void | Promise<void>
/**
 * @deprecated Use {@link ProcessSealedResultPluginFunction} instead.
 */
export type ProcessOpenClientResponsePluginFunction = (
  context: ProcessOpenClientResponseContext
) => void | Promise<void>

export type ProcessSealedResultPlugin = {
  name: string
  type: 'processSealedResult'
  callback: ProcessSealedResultPluginFunction
}

/**
 * @deprecated Use {@link ProcessSealedResultPlugin} instead.
 */
export type ProcessOpenClientResponsePlugin = {
  name: string
  type: 'processOpenClientResponse'
  callback: ProcessOpenClientResponsePluginFunction
}

export type Plugin = ProcessSealedResultPlugin | ProcessOpenClientResponsePlugin
export const plugins: Plugin[] = loadedPlugins
