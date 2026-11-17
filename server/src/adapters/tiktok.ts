import {
  ControlEvent,
  SignatureRateLimitError,
  TikTokLiveConnection,
  UserOfflineError,
  WebcastEvent,
} from 'tiktok-live-connector'
import type { TikTokConfig } from '../../../shared/types.js'
import {
  type Connector,
  type ConnectorOptions,
  createDedupe,
  createStatusHolder,
  errorMessage,
} from './connector.js'

interface TikTokConnectorOptions extends ConnectorOptions, TikTokConfig {
  /** How often we check whether the user is live (ms). TikTok/Euler need >= 30s. */
  pollIntervalMs?: number
  /** Optional Euler Stream API key (https://www.eulerstream.com) for higher rate limits. */
  signApiKey?: string
}

// Minimal shapes of the events we use (tiktok-live-connector v2 / proto v3)
interface TikTokUser {
  nickname?: string
  displayId?: string
  uniqueId?: string
}
interface TikTokChatEvent {
  common?: { msgId?: string; createTime?: string }
  user?: TikTokUser
  content?: string
  comment?: string
}
interface TikTokGiftEvent {
  common?: { msgId?: string }
  user?: TikTokUser
  repeatCount?: number
  repeatEnd?: number | boolean
  groupId?: string
  giftId?: string | number
  gift?: { name?: string; type?: number; diamondCount?: number }
  giftDetails?: { giftName?: string; giftType?: number }
}

const MAX_BACKOFF_MS = 5 * 60_000
const RATE_LIMIT_BACKOFF_MS = 2 * 60_000
const MAX_MESSAGE_AGE_MS = 2 * 60_000
/** If fetchIsLive keeps failing, try a real connect every N checks as a fallback. */
const CONNECT_FALLBACK_EVERY = 3

const userName = (user?: TikTokUser) =>
  user?.nickname || user?.displayId || user?.uniqueId || 'unknown'

export function createTikTokConnector({
  username,
  pollIntervalMs = 30_000,
  signApiKey,
  onMessage,
  onStatusChange,
}: TikTokConnectorOptions): Connector {
  const uniqueId = username.replace(/^@/, '')
  const status = createStatusHolder('tiktok', uniqueId, onStatusChange)
  const isDuplicate = createDedupe()
  const options = signApiKey ? { signApiKey } : {}

  // Lightweight instance only used for live checks (HTML first, no signature needed)
  const probe = new TikTokLiveConnection(uniqueId, options)

  let conn: TikTokLiveConnection | null = null
  let timer: NodeJS.Timeout | null = null
  let running = false
  let checking = false
  let failures = 0

  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  const schedule = (ms: number) => {
    clearTimer()
    if (running) timer = setTimeout(() => void check(), ms)
  }

  const disconnect = async () => {
    const current = conn
    conn = null
    if (current) {
      current.removeAllListeners()
      try {
        await current.disconnect()
      } catch (error) {
        console.warn('[tiktok] error while disconnecting:', errorMessage(error))
      }
    }
  }

  const handleChat = (data: TikTokChatEvent) => {
    // On connect TikTok replays recent messages, sometimes several minutes old: skip those
    const createdAt = Number(data.common?.createTime)
    if (createdAt && Date.now() - createdAt > MAX_MESSAGE_AGE_MS) return
    if (isDuplicate(data.common?.msgId)) return
    const text = data.content ?? data.comment ?? ''
    if (!text) return
    onMessage({
      id: data.common?.msgId ? `tt-${data.common.msgId}` : undefined,
      username: userName(data.user),
      message: text,
      badges: [],
      raw: { uniqueId: data.user?.displayId || data.user?.uniqueId },
    })
  }

  const handleGift = (data: TikTokGiftEvent) => {
    const giftType = data.gift?.type ?? data.giftDetails?.giftType
    // Streakable gifts (type 1) fire on every combo step: only keep the final one
    if (giftType === 1 && !data.repeatEnd) return
    if (isDuplicate(data.common?.msgId)) return

    const giftName = data.gift?.name || data.giftDetails?.giftName || 'a gift'
    const count = data.repeatCount || 1
    onMessage({
      id: data.common?.msgId ? `tt-${data.common.msgId}` : undefined,
      username: userName(data.user),
      message: `sent ${giftName} x${count}`,
      badges: [],
      highlight: `🎁 ${giftName} x${count}`,
      raw: { uniqueId: data.user?.displayId || data.user?.uniqueId, diamonds: data.gift?.diamondCount },
    })
  }

  const connect = async (): Promise<boolean> => {
    await disconnect()
    status.set('connecting', `Connecting to @${uniqueId}'s live...`)

    const connection = new TikTokLiveConnection(uniqueId, options)
    conn = connection

    connection.on(WebcastEvent.CHAT, (data) => {
      try {
        handleChat(data as unknown as TikTokChatEvent)
      } catch (error) {
        console.error('[tiktok] chat processing error:', errorMessage(error))
      }
    })

    connection.on(WebcastEvent.GIFT, (data) => {
      try {
        handleGift(data as unknown as TikTokGiftEvent)
      } catch (error) {
        console.error('[tiktok] gift processing error:', errorMessage(error))
      }
    })

    connection.on(WebcastEvent.STREAM_END, () => {
      if (conn !== connection) return
      void disconnect()
      status.set('waiting', 'Stream ended - waiting for the next live')
      schedule(pollIntervalMs)
    })

    connection.on(ControlEvent.DISCONNECTED, ({ code, reason }) => {
      if (conn !== connection) return
      conn = null
      connection.removeAllListeners()
      // Connection dropped (network, TikTok...): check again quickly
      status.set('waiting', `Disconnected (${code}${reason ? ` ${reason}` : ''}), checking again...`)
      schedule(5_000)
    })

    connection.on(ControlEvent.ERROR, (error) => {
      console.warn('[tiktok] connection error:', errorMessage(error?.exception ?? error))
    })

    try {
      const state = await connection.connect()
      if (conn !== connection) return false
      status.set('connected', `Connected to @${uniqueId}'s live`, String(state.roomId ?? ''))
      return true
    } catch (error) {
      if (conn === connection) {
        conn = null
        connection.removeAllListeners()
      }
      throw error
    }
  }

  const check = async () => {
    if (!running || checking || conn) return
    checking = true
    clearTimer()
    let nextDelay = pollIntervalMs
    try {
      let live: boolean | null = null
      try {
        live = await probe.fetchIsLive()
      } catch (error) {
        console.warn('[tiktok] live check failed:', errorMessage(error))
      }

      const tryConnect = live === true || (live === null && (failures + 1) % CONNECT_FALLBACK_EVERY === 0)
      if (tryConnect) {
        await connect()
        failures = 0
        return
      }

      if (live === false) {
        failures = 0
        status.set('waiting', `Waiting for @${uniqueId} to go live`)
      } else {
        failures++
        status.set('waiting', `Could not check @${uniqueId}'s live status, retrying...`)
      }
    } catch (error) {
      if (error instanceof UserOfflineError) {
        failures = 0
        status.set('waiting', `Waiting for @${uniqueId} to go live`)
      } else if (error instanceof SignatureRateLimitError) {
        failures++
        nextDelay = RATE_LIMIT_BACKOFF_MS
        status.set('error', 'TikTok signing rate limit reached, retrying in 2 min (set TIKTOK_SIGN_API_KEY to raise it)')
      } else {
        failures++
        nextDelay = Math.min(pollIntervalMs * 2 ** Math.min(failures, 3), MAX_BACKOFF_MS)
        status.set('error', `Connection failed (${errorMessage(error)}), retrying automatically`)
      }
    } finally {
      checking = false
      if (!conn) schedule(nextDelay)
    }
  }

  return {
    start() {
      if (running) return
      running = true
      status.set('waiting', `Checking whether @${uniqueId} is live...`)
      void check()
    },
    async stop() {
      running = false
      clearTimer()
      await disconnect()
    },
    async refresh() {
      if (!running || checking) return
      await disconnect()
      failures = 0
      status.set('waiting', 'Manual refresh: checking whether the user is live...')
      clearTimer()
      checking = true
      try {
        // Manual action: skip the live probe and try to connect directly
        await connect()
      } catch (error) {
        const msg = error instanceof UserOfflineError ? `@${uniqueId} is not live` : errorMessage(error)
        status.set(error instanceof UserOfflineError ? 'waiting' : 'error', msg)
      } finally {
        checking = false
        if (!conn) schedule(pollIntervalMs)
      }
    },
    getStatus: status.get,
  }
}
