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

/** Exponential backoff: base * 2^failures, capped. */
export function backoff(baseMs: number, failures: number, maxMs: number): number {
  return Math.min(baseMs * 2 ** Math.min(failures, 10), maxMs)
}

/**
 * Runs `check` in a loop. `check` returns the delay before the next run, or
 * null to stop scheduling (e.g. while connected, events take over and call
 * `schedule()` again). A `trigger()` during a run is not lost: the check runs
 * again right after the current one.
 */
export function createPoller(check: () => Promise<number | null>) {
  let timer: NodeJS.Timeout | null = null
  let running = false
  let busy = false
  let again = false

  const clear = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  const schedule = (ms: number) => {
    clear()
    if (running) timer = setTimeout(() => void trigger(), ms)
  }

  const trigger = async (): Promise<void> => {
    if (!running) return
    if (busy) {
      again = true
      return
    }
    busy = true
    clear()
    let next: number | null = null
    try {
      next = await check()
    } catch (error) {
      console.error('[poller] unexpected error:', errorMessage(error))
      next = 60_000
    } finally {
      busy = false
    }
    if (again) {
      again = false
      return trigger()
    }
    if (next !== null) schedule(next)
  }

  return {
    start() {
      if (running) return
      running = true
      void trigger()
    },
    stop() {
      running = false
      again = false
      clear()
    },
    trigger,
    schedule,
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
