import type { AdapterConfig, TikTokConfig } from '../../../shared/types.js'
import { TikTokLiveConnection as TikTokLiveConnectionImpl } from 'tiktok-live-connector'

type BaseTikTokLiveConnection = InstanceType<typeof TikTokLiveConnectionImpl>

// Extend the TikTokLiveConnection type to include our custom event types
interface TikTokLiveConnection extends BaseTikTokLiveConnection {
  on(event: 'chat', listener: (data: TikTokChatEvent) => void): this
  on(event: 'gift', listener: (data: TikTokGiftEvent) => void): this
  on(event: 'connected', listener: (state: TikTokConnectionState) => void): this
  on(event: 'disconnected', listener: () => void): this
  on(event: 'error', listener: (err: Error) => void): this
  connect(): Promise<void>
  disconnect(): void
}

// Define interfaces for the TikTok Live events
interface TikTokChatEvent {
  nickname?: string
  uniqueId?: string
  comment?: string
  user?: {
    nickname?: string
    uniqueId?: string
  }
}

interface TikTokGiftEvent {
  giftType?: number
  repeatEnd?: boolean
  giftName?: string
  repeatCount?: number
  uniqueId?: string
  user?: {
    nickname?: string
    uniqueId?: string
  }
  giftInfo?: {
    name?: string
  }
}

interface TikTokConnectionState {
  roomInfo?: {
    viewerCount?: number
  }
}

interface TikTokAdapterConfig extends AdapterConfig, TikTokConfig {}

interface TikTokAdapterReturn {
  start: () => Promise<boolean>
  isRunning: () => boolean
  getStatus: () => 'stopped' | 'connecting' | 'connected' | 'error'
}

export async function createTikTokAdapter({ 
  username, 
  onMessage, 
  onStatusChange
}: TikTokAdapterConfig & { onStatusChange?: (status: string, message?: string) => void }): Promise<TikTokAdapterReturn> {
  let conn: TikTokLiveConnection | null = null
  let status: 'stopped' | 'connecting' | 'connected' | 'error' = 'stopped'

  const updateStatus = (newStatus: typeof status, message?: string) => {
    if (status !== newStatus) {
      status = newStatus
      onStatusChange?.(status, message)
      console.log(`[tiktok] Status changed to: ${status}${message ? ` - ${message}` : ''}`)
    }
  }

  const cleanup = () => {
    if (conn) {
      try {
        conn.disconnect()
      } catch (error) {
        console.error('[tiktok] Error during cleanup:', (error as Error).message)
      }
      conn = null
      updateStatus('stopped')
    }
  }

  const start = async (): Promise<boolean> => {
    if (status === 'connecting' || status === 'connected') {
      console.log('[tiktok] Already connecting or connected')
      return status === 'connected'
    }

    cleanup()
    updateStatus('connecting', `Connecting to TikTok user: ${username}`)
    
    try {
      conn = new TikTokLiveConnectionImpl(username) as TikTokLiveConnection

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
          console.error('[tiktok] chat processing error:', (error as Error).message)
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
          console.error('[tiktok] gift processing error:', (error as Error).message)
        }
      })

      // Using type assertion to handle the event type
      conn.on('connected', (state: TikTokConnectionState) => {
        updateStatus('connected', `Connected to TikTok user: ${username}, viewers: ${state?.roomInfo?.viewerCount || 0}`)
        console.log('[tiktok] connected, viewerCount:', state?.roomInfo?.viewerCount)
      })

      // Using type assertion to handle the event type
      conn.on('disconnected', () => {
        updateStatus('stopped', 'Disconnected from TikTok')
        console.log('[tiktok] disconnected')
      })

      conn.on('error', (error: Error) => {
        const errorMessage = error?.message || 'Unknown error'
        updateStatus('error', errorMessage)
        console.error('[tiktok] connection error:', errorMessage)
      })

      await conn.connect()
      return true
    } catch (error) {
      const errorMessage = (error as Error).message || 'Failed to connect to TikTok'
      updateStatus('error', errorMessage)
      console.error('[tiktok] connection error:', errorMessage)
      cleanup()
      return false
    }
  }

  const isRunning = (): boolean => status === 'connected'
  const getStatus = (): typeof status => status

  return {
    start,
    isRunning,
    getStatus
  }
}