import type { AdapterEvent, ConnectorState, PlatformStatus } from '../../../shared/types.js'

/**
 * A connector watches one platform on its own: it detects when the channel
 * goes live, connects to the chat, and goes back to waiting when the stream
 * ends. It never stays stuck in an error state: it keeps retrying by itself.
 */
export interface Connector {
  /** Start watching (non-blocking). */
  start(): void
  /** Stop everything (used on shutdown). */
  stop(): Promise<void>
  /** Force an immediate live check / reconnect (manual button). */
  refresh(): Promise<void>
  getStatus(): PlatformStatus
}

export interface ConnectorOptions {
  onMessage: (event: AdapterEvent) => void
  onStatusChange: (status: PlatformStatus) => void
}

export function createStatusHolder(
  tag: string,
  channel: string,
  onStatusChange: (status: PlatformStatus) => void,
) {
  let current: PlatformStatus = { status: 'waiting', channel, updatedAt: Date.now() }

  return {
    get: (): PlatformStatus => current,
    set(status: ConnectorState, message?: string, liveId?: string) {
      const changed =
        current.status !== status || current.message !== message || current.liveId !== liveId
      if (!changed) return
      current = { status, message, channel, liveId, updatedAt: Date.now() }
      console.log(`[${tag}] ${status}${message ? ` - ${message}` : ''}`)
      onStatusChange(current)
    },
  }
}

/** Keeps the N most recent ids to drop duplicates after a reconnect. */
export function createDedupe(max = 2000) {
  const seen = new Set<string>()
  return (id: string | undefined | null): boolean => {
    if (!id) return false
    if (seen.has(id)) return true
    seen.add(id)
    if (seen.size > max) {
      const first = seen.values().next().value
      if (first !== undefined) seen.delete(first)
    }
    return false
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}
