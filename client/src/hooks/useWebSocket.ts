import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChatMessage, WebSocketMessage, TwitchBadgeResponse } from '../../../shared/types'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus
  isConnected: boolean
  lastMessage: ChatMessage | null
  twitchBadges: TwitchBadgeResponse | null
  sendMessage: (message: any) => void
}

export const useWebSocket = (
  url?: string,
  onMessage?: (message: ChatMessage) => void
): UseWebSocketReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null)
  const [twitchBadges, setTwitchBadges] = useState<TwitchBadgeResponse | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  const wsUrl =
    url ||
    (import.meta.env.DEV
      ? 'ws://localhost:8787' // dev: connect to server
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus('connecting')

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnectionStatus('connected')
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage | ChatMessage = JSON.parse(event.data)

          // Handle different message types
          if ('type' in data) {
            // WebSocketMessage
            if (data.type === 'chat' && data.data) {
              setLastMessage(data.data)
              onMessage?.(data.data)
            } else if (data.type === 'connection') {
            } else if (data.type === 'badges' && data.data) {
              setTwitchBadges(data.data as TwitchBadgeResponse)
            }
          } else {
            // Direct ChatMessage
            setLastMessage(data as ChatMessage)
            onMessage?.(data as ChatMessage)
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error)
        }
      }

      ws.onclose = (event) => {
        setConnectionStatus('disconnected')
        wsRef.current = null

        // Auto-reconnect with exponential backoff
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        }
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
        setConnectionStatus('error')
      }
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error)
      setConnectionStatus('error')
    }
  }, [wsUrl, onMessage])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setConnectionStatus('disconnected')
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('[WebSocket] Cannot send message: connection not open')
    }
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    lastMessage,
    twitchBadges,
    sendMessage,
  }
}
