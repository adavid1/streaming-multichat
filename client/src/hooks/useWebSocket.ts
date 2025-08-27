import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChatMessage, WebSocketMessage, TwitchBadgeResponse } from '../../../shared/types'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus
  isConnected: boolean
  lastMessage: ChatMessage | null
  twitchBadges: TwitchBadgeResponse | null
  sendMessage: (message: unknown) => void
}

export const useWebSocket = (
  url?: string,
  onMessage?: (message: ChatMessage) => void,
  onWebSocketMessage?: (message: WebSocketMessage) => void
): UseWebSocketReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null)
  const [twitchBadges, setTwitchBadges] = useState<TwitchBadgeResponse | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isConnectingRef = useRef(false)
  const maxReconnectAttempts = 5

  const wsUrl =
    url ||
    (window.location.hostname === 'localhost'
      ? 'ws://localhost:8787' // dev: connect to server
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`)

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    isConnectingRef.current = false
    setConnectionStatus('disconnected')
  }, [])

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    isConnectingRef.current = true
    setConnectionStatus('connecting')

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        isConnectingRef.current = false
        setConnectionStatus('connected')
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage | ChatMessage = JSON.parse(event.data)

          // Handle different message types
          if ('type' in data) {
            // WebSocketMessage
            const wsMessage = data as WebSocketMessage

            // Call the WebSocket message callback first
            onWebSocketMessage?.(wsMessage)

            if (wsMessage.type === 'chat' && wsMessage.data) {
              const chatMessage = wsMessage.data as ChatMessage
              setLastMessage(chatMessage)
              onMessage?.(chatMessage)
            } else if (wsMessage.type === 'connection') {
              // Handle connection messages if needed
              console.log('[WebSocket] Connection message:', wsMessage.message)
            } else if (wsMessage.type === 'badges' && wsMessage.data) {
              setTwitchBadges(wsMessage.data as TwitchBadgeResponse)
            } else if (wsMessage.type === 'youtube-status') {
              // YouTube status is handled by the onWebSocketMessage callback
              console.log('[WebSocket] YouTube status update:', wsMessage.data)
            }
          } else {
            // Direct ChatMessage (legacy support)
            const chatMessage = data as ChatMessage
            setLastMessage(chatMessage)
            onMessage?.(chatMessage)
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error)
        }
      }

      ws.onclose = (event) => {
        isConnectingRef.current = false
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
        isConnectingRef.current = false
        setConnectionStatus('error')
      }
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error)
      isConnectingRef.current = false
      setConnectionStatus('error')
    }
  }, [wsUrl, onMessage, onWebSocketMessage])

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('[WebSocket] Cannot send message: connection not open')
    }
  }, [])

  // Connect on mount, disconnect on unmount - use stable URL as dependency
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [wsUrl, connect, disconnect]) // Include all dependencies

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
