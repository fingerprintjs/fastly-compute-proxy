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

export type ProcessIdentificationResponseContext = {
  response: Record<string, unknown>
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
 * @deprecated Use {@link ProcessSealedResultPluginFunction} or {@link ProcessIdentificationResponsePluginFunction} instead.
 */
export type ProcessOpenClientResponsePluginFunction = (
  context: ProcessOpenClientResponseContext
) => void | Promise<void>
export type ProcessIdentificationResponsePluginFunction = (
  context: ProcessIdentificationResponseContext
) => void | Promise<void>

export type ProcessSealedResultPlugin = {
  name: string
  type: 'processSealedResult'
  callback: ProcessSealedResultPluginFunction
}

/**
 * @deprecated Use {@link ProcessSealedResultPlugin} or {@link ProcessIdentificationResponsePlugin} instead.
 */
export type ProcessOpenClientResponsePlugin = {
  name: string
  type: 'processOpenClientResponse'
  callback: ProcessOpenClientResponsePluginFunction
}

export type ProcessIdentificationResponsePlugin = {
  name: string
  type: 'processIdentificationResponse'
  callback: ProcessIdentificationResponsePluginFunction
}

export type Plugin = ProcessSealedResultPlugin | ProcessOpenClientResponsePlugin | ProcessIdentificationResponsePlugin
export const plugins: Plugin[] = loadedPlugins
