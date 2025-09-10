import type { AdapterConfig, StopFunction, TikTokConfig } from '../../../shared/types.js'
import { TikTokLiveConnection as BaseTikTokLiveConnection } from 'tiktok-live-connector'

// Extend the TikTokLiveConnection type to include our custom event types
interface TikTokLiveConnection extends BaseTikTokLiveConnection {
  on(event: 'chat', listener: (data: TikTokChatEvent) => void): this
  on(event: 'gift', listener: (data: TikTokGiftEvent) => void): this
  on(event: 'connected', listener: (state: TikTokConnectionState) => void): this
  on(event: 'disconnected', listener: () => void): this
}

// Define interfaces for the TikTok Live events
interface TikTokChatEvent {
  nickname?: string;
  uniqueId?: string;
  comment?: string;
  user?: {
    nickname?: string;
    uniqueId?: string;
  };
}

interface TikTokGiftEvent {
  giftType?: number;
  repeatEnd?: boolean;
  giftName?: string;
  repeatCount?: number;
  uniqueId?: string;
  user?: {
    nickname?: string;
    uniqueId?: string;
  };
  giftInfo?: {
    name?: string;
  };
}

interface TikTokConnectionState {
  roomInfo?: {
    viewerCount?: number;
  };
}

interface TikTokAdapterConfig extends AdapterConfig, TikTokConfig {}

export async function startTikTok({ 
  username, 
  onMessage, 
  debug = false 
}: TikTokAdapterConfig): Promise<StopFunction> {
  // Create connection
  const conn = new BaseTikTokLiveConnection(username) as TikTokLiveConnection

  // Set up event handlers
  conn.on('chat', (data: TikTokChatEvent) => {
    try {
      onMessage({
        username: data.user?.nickname || data.user?.uniqueId || data.nickname || data.uniqueId || 'unknown',
        message: data.comment || '',
        badges: [],
        raw: data
      })
    } catch (error) {
      if (debug) console.error('[tiktok] chat processing error:', (error as Error).message)
    }
  })

  // Using type assertion to handle the event type
  conn.on('gift', (data: TikTokGiftEvent) => {
    try {
      // Only process gifts that are not part of a streak or are the final gift in a streak
      if (data.giftType === 1 && !data.repeatEnd) return
      
      const giftName = data.giftInfo?.name || data.giftName || 'a gift'
      const count = data.repeatCount || 1
      const username = data.user?.nickname || data.user?.uniqueId || data.uniqueId || 'Someone'
      const text = `${username} sent ${giftName} x${count}`
      
      onMessage({ 
        username,
        message: text, 
        badges: ['gift'], 
        raw: data 
      })
    } catch (error) {
      if (debug) console.error('[tiktok] gift processing error:', (error as Error).message)
    }
  })

  // Using type assertion to handle the event type
  conn.on('connected', (state: TikTokConnectionState) => {
    if (debug) console.log('[tiktok] connected, viewerCount:', state?.roomInfo?.viewerCount)
  })

  // Using type assertion to handle the event type
  conn.on('disconnected', () => {
    if (debug) console.log('[tiktok] disconnected')
  })

  try {
    await conn.connect()
    if (debug) console.log('[tiktok] connection established')
  } catch (error) {
    console.error('[tiktok] connect error:', (error as Error).message)
    throw error
  }

  return async function stop(): Promise<void> {
    try {
      conn.disconnect()
      if (debug) console.log('[tiktok] disconnected')
    } catch (error) {
      if (debug) console.error('[tiktok] disconnect error:', (error as Error).message)
    }
  }
}