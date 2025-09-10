import { LiveChat } from 'youtube-chat'
import type { AdapterConfig, StopFunction, YouTubeConfig } from '../../../shared/types.js'

interface YouTubeAdapterConfig extends AdapterConfig, YouTubeConfig {}

interface YouTubeAdapterReturn extends StopFunction {
  start: () => Promise<boolean>;
  stop: () => Promise<void>;
  isRunning: () => boolean;
  getStatus: () => 'stopped' | 'connecting' | 'connected' | 'error';
}

export async function createYouTubeAdapter({ 
  channelId,
  onMessage, 
  debug = false,
  onStatusChange
}: YouTubeAdapterConfig & { onStatusChange?: (status: string, message?: string) => void }): Promise<YouTubeAdapterReturn> {
  let chat: InstanceType<typeof LiveChat> | null = null
  let status: 'stopped' | 'connecting' | 'connected' | 'error'

  const updateStatus = (newStatus: typeof status, message?: string) => {
    if (status !== newStatus) {
      status = newStatus
      onStatusChange?.(status, message)
      if (debug) console.log(`[youtube] Status changed to: ${status}${message ? ` - ${message}` : ''}`)
    }
  }

  const cleanup = () => {  
    if (chat) {
      try {
        chat.stop()
      } catch (error) {
        if (debug) console.error('[youtube] Error during cleanup:', (error as Error).message)
      }
      chat = null
    }
  }

  const start = async (): Promise<boolean> => {
    if (status === 'connecting' || status === 'connected') {
      if (debug) console.log('[youtube] Already connecting or connected')
      return status === 'connected'
    }

    cleanup() // Clean up any existing connection
    
    updateStatus('connecting', `Connecting to channel: ${channelId}`)
    
    try {
      chat = new LiveChat({ channelId })
      
      chat.on('start', () => {
        updateStatus('connected', `Connected to channel: ${channelId}`)
        console.log('[youtube] Chat started successfully for channel:', channelId)
      })

      chat.on('end', () => {       
        console.log('[youtube] Chat ended - stream likely finished')
        updateStatus('stopped', 'Stream ended')
      })

      chat.on('error', (err: any) => {
        const errorMessage = err?.message || 'Unknown error'
        const isNotFoundError = errorMessage.includes('404') || errorMessage.includes('Request failed with status code 404')
        
        if (isNotFoundError) {
          updateStatus('stopped', 'Stream not found')
          cleanup()
          return
        }
        
        updateStatus('error', errorMessage)
      })

      chat.on('chat', (msg: any) => {
        try {
          const text = Array.isArray(msg.message) 
            ? msg.message.map((m: any) => m.text).join('') 
            : (msg.message || '')
            
          onMessage({
            username: msg.author?.name || 'unknown',
            message: text,
            badges: (msg.author?.badges || []).map((b: any) => b.title).filter(Boolean),
            raw: msg
          })
        } catch (error) {
          if (debug) console.error('[youtube] Message processing error:', (error as Error).message)
        }
      })

      const success = await chat.start()
      
      if (!success) {
        throw new Error('Failed to start YouTube chat - stream may be offline')
      }
      
      return true
      
    } catch (error) {
      const errorMessage = (error as Error).message
      
      if (debug) {
        console.error(`[youtube] Start failed:`, errorMessage)
      }
      
      updateStatus('stopped', errorMessage)
      
      return false
    }
  }

  const isRunning = (): boolean => {
    return status === 'connected' || status === 'connecting'
  }

  const getStatus = () => status

  const controller = Object.assign({
    start,
    isRunning,
    getStatus
  })

  return controller
}