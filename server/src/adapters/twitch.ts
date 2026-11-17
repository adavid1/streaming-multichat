import tmi from 'tmi.js'
import type { TwitchConfig } from '../../../shared/types.js'
import { type Connector, type ConnectorOptions, createStatusHolder, errorMessage } from './connector.js'

interface Tags {
  id?: string
  'display-name'?: string
  username?: string
  color?: string
  badges?: Record<string, string> | null
  'badge-info'?: Record<string, string> | null
  emotes?: Record<string, string[]> | null
}

/**
 * Twitch chat is read anonymously over IRC: it works whether or not the
 * stream is live, and tmi.js reconnects automatically.
 */
export function createTwitchConnector({
  channel,
  onMessage,
  onStatusChange,
}: ConnectorOptions & TwitchConfig): Connector {
  const normalizedChannel = channel.replace(/^#/, '').toLowerCase()
  const status = createStatusHolder('twitch', normalizedChannel, onStatusChange)

  const client = new tmi.Client({
    options: { skipUpdatingEmotesets: true },
    connection: { reconnect: true, secure: true, maxReconnectInterval: 30_000 },
    channels: [normalizedChannel],
  })

  client.on('message', (_channel: string, tags: Tags, message: string, self: boolean) => {
    if (self) return
    try {
      const subscriberMonths = parseInt(tags['badge-info']?.subscriber ?? tags.badges?.subscriber ?? '', 10)
      onMessage({
        id: tags.id ? `tw-${tags.id}` : undefined,
        username: tags['display-name'] || tags.username || 'unknown',
        message,
        badges: tags.badges ? Object.keys(tags.badges) : [],
        color: tags.color || null,
        raw: {
          tags,
          badges: tags.badges,
          subscriptionMonths: Number.isNaN(subscriberMonths) ? null : subscriberMonths,
        },
      })
    } catch (error) {
      console.error('[twitch] message processing error:', errorMessage(error))
    }
  })

  client.on('connecting', () => status.set('connecting', 'Connecting to Twitch IRC...'))
  client.on('reconnect', () => status.set('connecting', 'Reconnecting to Twitch IRC...'))
  client.on('connected', () => status.set('connected', `Connected to #${normalizedChannel}`))
  client.on('disconnected', (reason: string) =>
    status.set('connecting', `Disconnected (${reason}), reconnecting...`),
  )

  let running = false

  const connect = async () => {
    try {
      await client.connect()
    } catch (error) {
      // tmi.js keeps reconnecting by itself after the first successful connection;
      // if the very first attempt fails we retry ourselves.
      status.set('error', `Twitch IRC connection failed (${errorMessage(error)}), retrying...`)
      if (running && client.readyState() !== 'OPEN') setTimeout(() => void connect(), 15_000)
    }
  }

  return {
    start() {
      if (running) return
      running = true
      void connect()
    },
    async stop() {
      running = false
      try {
        await client.disconnect()
      } catch {
        // already disconnected
      }
    },
    async refresh() {
      if (client.readyState() === 'OPEN') return
      await connect()
    },
    getStatus: status.get,
  }
}
