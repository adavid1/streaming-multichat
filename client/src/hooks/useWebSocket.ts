import { useEffect, useRef, useState } from 'react'
import type {
  ChatMessage,
  PlatformStatuses,
  TwitchBadgeResponse,
  WebSocketMessage,
} from '../../../shared/types'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketOptions {
  onChat: (message: ChatMessage) => void
  onHistory?: (messages: ChatMessage[]) => void
}

interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus
  isConnected: boolean
  statuses: PlatformStatuses | null
  twitchBadges: TwitchBadgeResponse | null
}

/** The server pings every 25s: without any message for this long, the socket is considered dead. */
const STALE_CONNECTION_MS = 60_000
const MAX_RECONNECT_DELAY_MS = 10_000

const defaultUrl = () =>
  import.meta.env.DEV
    ? 'ws://localhost:8787'
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`

/**
 * Single WebSocket connection to the server. It reconnects forever (an OBS
 * browser source must recover by itself after a server restart or a network
 * hiccup, without anyone touching it).
 */
export const useWebSocket = ({ onChat, onHistory }: UseWebSocketOptions): UseWebSocketReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [statuses, setStatuses] = useState<PlatformStatuses | null>(null)
  const [twitchBadges, setTwitchBadges] = useState<TwitchBadgeResponse | null>(null)

  // Keep the latest callbacks without reconnecting when they change
  const handlersRef = useRef({ onChat, onHistory })
  handlersRef.current = { onChat, onHistory }

  useEffect(() => {
    let ws: WebSocket | null = null
    let disposed = false
    let attempts = 0
    let reconnectTimer: number | undefined
    let staleTimer: number | undefined

    const scheduleReconnect = () => {
      if (disposed) return
      window.clearTimeout(reconnectTimer)
      const delay = Math.min(1000 * 2 ** attempts, MAX_RECONNECT_DELAY_MS)
      attempts++
      reconnectTimer = window.setTimeout(connect, delay)
    }

    const resetStaleTimer = (socket: WebSocket) => {
      window.clearTimeout(staleTimer)
      staleTimer = window.setTimeout(() => {
        console.warn('[ws] no data from server for a while, reconnecting')
        socket.close()
      }, STALE_CONNECTION_MS)
    }

    const handleMessage = (msg: WebSocketMessage) => {
      switch (msg.type) {
        case 'chat':
          handlersRef.current.onChat(msg.data)
          break
        case 'history':
          handlersRef.current.onHistory?.(msg.data)
          break
        case 'status':
          setStatuses(msg.data)
          break
        case 'badges':
          setTwitchBadges(msg.data)
          break
        default:
          break
      }
    }

    function connect() {
      if (disposed) return
      setConnectionStatus('connecting')

      const socket = new WebSocket(defaultUrl())
      ws = socket

      socket.onopen = () => {
        attempts = 0
        setConnectionStatus('connected')
        resetStaleTimer(socket)
      }

      socket.onmessage = (event) => {
        resetStaleTimer(socket)
        try {
          handleMessage(JSON.parse(event.data) as WebSocketMessage)
        } catch (error) {
          console.error('[ws] failed to handle message:', error)
        }
      }

      socket.onerror = () => {
        // onclose always follows: reconnection is handled there
        if (!disposed) setConnectionStatus('error')
      }

      socket.onclose = () => {
        window.clearTimeout(staleTimer)
        if (ws !== socket || disposed) return
        ws = null
        setConnectionStatus('disconnected')
        scheduleReconnect()
      }
    }

    // Reconnect right away when the page becomes visible / the network comes back
    const wakeUp = () => {
      if (disposed || ws) return
      attempts = 0
      window.clearTimeout(reconnectTimer)
      connect()
    }
    window.addEventListener('online', wakeUp)
    document.addEventListener('visibilitychange', wakeUp)

    connect()

    return () => {
      disposed = true
      window.clearTimeout(reconnectTimer)
      window.clearTimeout(staleTimer)
      window.removeEventListener('online', wakeUp)
      document.removeEventListener('visibilitychange', wakeUp)
      if (ws) {
        ws.onclose = null
        ws.close()
        ws = null
      }
    }
  }, [])

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    statuses,
    twitchBadges,
  }
}
