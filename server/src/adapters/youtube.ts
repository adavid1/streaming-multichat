import { LiveChat } from 'youtube-chat'
import { ChatItem, MessageItem } from 'youtube-chat/dist/types/data.js'
import type { AdapterConfig, CustomEmoji, YouTubeConfig } from '../../../shared/types.js'

interface YouTubeAdapterConfig extends AdapterConfig, YouTubeConfig {}

interface YouTubeAdapterReturn {
  start: () => Promise<boolean>;
  stop: () => Promise<void>;
  isRunning: () => boolean;
  getStatus: () => 'stopped' | 'connecting' | 'connected' | 'error';
}

export async function createYouTubeAdapter({ 
  channelId,
  onMessage, 
  onStatusChange
}: YouTubeAdapterConfig & { onStatusChange?: (status: string, message?: string) => void }): Promise<YouTubeAdapterReturn> {
  let chat: InstanceType<typeof LiveChat> | null = null
  let status: 'stopped' | 'connecting' | 'connected' | 'error'

  const updateStatus = (newStatus: typeof status, message?: string) => {
    if (status !== newStatus) {
      status = newStatus
      onStatusChange?.(status, message)
      console.log(`[youtube] Status changed to: ${status}${message ? ` - ${message}` : ''}`)
    }
  }

  const cleanup = () => {  
    if (chat) {
      try {
        chat.stop()
      } catch (error) {
        console.error('[youtube] Error during cleanup:', (error as Error).message)
      }
      chat = null
    }
  }

  const start = async (): Promise<boolean> => {
    if (status === 'connecting' || status === 'connected') {
      console.log('[youtube] Already connecting or connected')
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

      chat.on('error', (err: Error) => {
        const errorMessage = err?.message || 'Unknown error'
        const isNotFoundError = errorMessage.includes('404') || errorMessage.includes('Request failed with status code 404')
        
        if (isNotFoundError) {
          updateStatus('stopped', 'Stream not found')
          cleanup()
          return
        }
        
        updateStatus('error', errorMessage)
      })

      chat.on('chat', (msg: ChatItem) => {
        try {
          const text = Array.isArray(msg.message) 
            ? msg.message.map((m: MessageItem) => {
              if ('text' in m) {
                return m.text
              } else if ('emojiText' in m) {
                return m.emojiText || ''
              }
              return ''
            }).join('')
            : (msg.message || '')

          const badges = msg.author?.badge?.label ? [msg.author?.badge?.label] : undefined
            
          onMessage({
            username: msg.author?.name || 'unknown',
            message: text,
            badges,
            raw: msg,
            customEmojis: _getCustomEmojis(msg.message)
          })
        } catch (error) {
          console.error('[youtube] Message processing error:', (error as Error).message)
        }
      })

      const success = await chat.start()
      
      if (!success) {
        throw new Error('Failed to start YouTube chat - stream may be offline')
      }
      
      return true
      
    } catch (error) {
      const errorMessage = (error as Error).message
      
      {
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

/**
 * Extract custom emojis from a message
 * @param {MessageItem[]} msg - The message items to extract custom emojis from
 * @returns {CustomEmoji[]} An array of custom emojis
 */
function _getCustomEmojis(msg: MessageItem[]): CustomEmoji[] {
  const customEmojis: CustomEmoji[] = []
  for (const m of msg) {
    if ('emojiText' in m && m.isCustomEmoji === true) {
      customEmojis.push({
        text: m.emojiText,
        url: m.url
      })
    }
  }
  return customEmojis
}