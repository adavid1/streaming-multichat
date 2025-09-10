import tmi from 'tmi.js'
import type { AdapterConfig, TwitchConfig } from '../../../shared/types.js'

interface TwitchAdapterConfig extends AdapterConfig, TwitchConfig {
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error', message?: string) => void;
}

export async function startTwitch({ 
  channel,
  onMessage, 
  onStatusChange,
}: TwitchAdapterConfig): Promise<void> {
  // tmi.js expects channel names without a leading '#'
  const normalizedChannel = channel.startsWith('#') ? channel.slice(1) : channel
  const client = new tmi.Client({
    options: {},
    channels: [normalizedChannel]
  })

  client.on('message', (channel: string, tags: any, message: string, self: boolean) => {
    if (self) return
    
    try {
      // Extract subscription months from badges with multiple methods
      let subscriptionMonths: number | null = null
      
      // Method 1: From tags.badges.subscriber (most reliable)
      if (tags.badges && tags.badges.subscriber) {
        const months = parseInt(tags.badges.subscriber, 10)
        if (!isNaN(months)) {
          subscriptionMonths = months
        }
      }
      
      // Method 2: From badge-info (newer TMI.js versions)
      if (!subscriptionMonths && tags['badge-info'] && tags['badge-info'].subscriber) {
        const months = parseInt(tags['badge-info'].subscriber, 10)
        if (!isNaN(months)) {
          subscriptionMonths = months
        }
      }
      
      // Method 3: From subscriber tag (legacy)
      if (!subscriptionMonths && tags.subscriber === '1' && !subscriptionMonths) {
        // Default to 1 month if we know they're a subscriber but don't have months
        subscriptionMonths = 1
      }

      // Get all badge types
      const badgeList = tags.badges ? Object.keys(tags.badges) : []

      onMessage({
        username: tags['display-name'] || tags.username || 'unknown',
        message,
        badges: badgeList,
        color: tags.color || null,
        raw: { 
          channel, 
          tags,
          badges: tags.badges, // Include raw badges object
          subscriptionMonths // Include subscription months in raw data
        }
      })
    } catch (error) {
      console.error('[twitch] message processing error:', (error as Error).message)
    }
  })

  // Set connecting status immediately when starting connection
  onStatusChange?.('connecting', `Connecting to Twitch IRC for #${normalizedChannel}`)

  client.on('connected', (addr: string, port: number) => {
    console.log(`[twitch] connected to ${addr}:${port}`)
    onStatusChange?.('connected', `Connected to Twitch IRC for #${normalizedChannel}`)
  })

  client.on('disconnected', (reason: string) => {
    console.log(`[twitch] disconnected: ${reason}`)
    onStatusChange?.('disconnected', `Disconnected from Twitch IRC: ${reason}`)
  })

  client.on('connecting', (address: string, port: number) => {
    console.log(`[twitch] connecting to ${address}:${port}`)
    onStatusChange?.('connecting', `Connecting to Twitch IRC: ${address}:${port}`)
  })

  client.on('reconnect', () => {
    console.log(`[twitch] reconnecting...`)
    onStatusChange?.('connecting', 'Reconnecting to Twitch IRC...')
  })

  // Handle connection errors
  client.on('error', (err: Error) => {
    console.error('[twitch] IRC connection error:', err.message)
    onStatusChange?.('error', `Twitch IRC error: ${err.message}`)
  })

  try {
    await client.connect()
    console.log('[twitch] successfully connected to IRC for channel:', `#${normalizedChannel}`)
  } catch (error) {
    console.error('[twitch] failed to connect to IRC:', (error as Error).message)
    onStatusChange?.('error', `Failed to connect to Twitch IRC: ${(error as Error).message}`)
    throw error
  }
}