import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChatMessage, WebSocketMessage, TwitchBadgeResponse } from '../../../shared/types'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus
  isConnected: boolean
  lastMessage: ChatMessage | null
  twitchBadges: TwitchBadgeResponse | null
  sendMessage: (message: unknown) => void
  lastWebSocketMessage: WebSocketMessage | null
}

export const useWebSocket = (
  url?: string,
  onMessage?: (message: ChatMessage) => void
): UseWebSocketReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null)
  const [lastWebSocketMessage, setLastWebSocketMessage] = useState<WebSocketMessage | null>(null)
  const [twitchBadges, setTwitchBadges] = useState<TwitchBadgeResponse | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isUnmountedRef = useRef(false)
  const maxReconnectAttempts = 5

  const wsUrl =
    url ||
    (import.meta.env.DEV
      ? 'ws://localhost:8787' // dev: connect to server
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`)

  const connect = useCallback(() => {
    if (isUnmountedRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    // Clean up any existing connection first
    if (wsRef.current) {
      const currentWs = wsRef.current
      if (
        currentWs.readyState === WebSocket.OPEN ||
        currentWs.readyState === WebSocket.CONNECTING
      ) {
        // Remove event listeners to prevent errors during cleanup
        currentWs.onopen = null
        currentWs.onmessage = null
        currentWs.onclose = null
        currentWs.onerror = null
        currentWs.close()
      }
      wsRef.current = null
    }

    setConnectionStatus('connecting')

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        // Only update state if this is still the current WebSocket
        if (wsRef.current === ws) {
          setConnectionStatus('connected')
          reconnectAttemptsRef.current = 0
        }
      }

      ws.onmessage = (event) => {
        // Only process messages if this is still the current WebSocket
        if (wsRef.current !== ws) return

        try {
          const data: WebSocketMessage | ChatMessage = JSON.parse(event.data)

          // Handle different message types
          if ('type' in data) {
            // WebSocketMessage
            const wsMessage = data as WebSocketMessage
            setLastWebSocketMessage(wsMessage)

            if (wsMessage.type === 'chat' && wsMessage.data) {
              const chatMessage = wsMessage.data as ChatMessage
              setLastMessage(chatMessage)
              onMessage?.(chatMessage)
            } else if (wsMessage.type === 'connection') {
              // Handle connection messages if needed
            } else if (wsMessage.type === 'badges' && wsMessage.data) {
              setTwitchBadges(wsMessage.data as TwitchBadgeResponse)
            }
            // Note: youtube-status is handled via lastWebSocketMessage
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
        // Only handle close if this is still the current WebSocket
        if (wsRef.current === ws) {
          setConnectionStatus('disconnected')
          wsRef.current = null

          // Auto-reconnect with exponential backoff (only if not a clean close and not unmounted)
          if (
            !event.wasClean &&
            !isUnmountedRef.current &&
            reconnectAttemptsRef.current < maxReconnectAttempts
          ) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)

            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isUnmountedRef.current) {
                reconnectAttemptsRef.current++
                connect()
              }
            }, delay)
          }
        }
      }

      ws.onerror = (error) => {
        // Only handle error if this is still the current WebSocket
        if (wsRef.current === ws) {
          // Only log errors for connections that were expected to work
          // Skip logging if the connection was closed immediately (React Strict Mode)
          if (ws.readyState !== WebSocket.CLOSED && !isUnmountedRef.current) {
            console.error('[WebSocket] Error:', error)
          }
          setConnectionStatus('error')
          wsRef.current = null
        }
      }
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error)
      setConnectionStatus('error')
    }
  }, [wsUrl, onMessage])

  const disconnect = useCallback(() => {
    isUnmountedRef.current = true

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      const currentWs = wsRef.current
      // Remove event listeners to prevent errors during cleanup
      currentWs.onopen = null
      currentWs.onmessage = null
      currentWs.onclose = null
      currentWs.onerror = null

      // Only close if the WebSocket is in a valid state
      if (
        currentWs.readyState === WebSocket.OPEN ||
        currentWs.readyState === WebSocket.CONNECTING
      ) {
        currentWs.close()
      }
      wsRef.current = null
    }

    setConnectionStatus('disconnected')
  }, [])

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('[WebSocket] Cannot send message: connection not open')
    }
  }, [])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    isUnmountedRef.current = false

    // Small delay to prevent connection attempts during React Strict Mode cleanup
    const connectTimer = setTimeout(() => {
      if (!isUnmountedRef.current) {
        connect()
      }
    }, 10)

    return () => {
      clearTimeout(connectTimer)
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
    lastWebSocketMessage,
    twitchBadges,
    sendMessage,
  }
}
