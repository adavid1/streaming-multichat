import { useState, useCallback, useEffect, useRef } from 'react'
import { useWebSocket } from './useWebSocket'
import type { ChatMessage } from '../../../shared/types'

const MAX_MESSAGES = 200
const EXPIRY_MS = 60_000 // 1 minute

interface UseChatMessagesReturn {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  messageCount: number
  expiringIds: Set<string>
}

interface UseChatMessagesOptions {
  autoExpire?: boolean
}

export const useChatMessages = (options?: UseChatMessagesOptions): UseChatMessagesReturn => {
  const { autoExpire = true } = options || {}
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [expiringIds, setExpiringIds] = useState<Set<string>>(new Set())
  const removalTimeoutsRef = useRef<Record<string, number>>({})

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      // Check for duplicate messages based on ID
      const isDuplicate = prev.some((msg) => msg.id === message.id)
      if (isDuplicate) {
        return prev
      }

      const newMessages = [...prev, message]

      // Keep only the most recent messages
      if (newMessages.length > MAX_MESSAGES) {
        return newMessages.slice(-MAX_MESSAGES)
      }

      return newMessages
    })
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  // Set up WebSocket connection and message handling
  useWebSocket(undefined, addMessage)

  // Auto-expire messages older than EXPIRY_MS (only when autoExpire is enabled)
  useEffect(() => {
    if (!autoExpire) {
      // If disabling autoExpire, cancel all pending removals and clear expiring state
      const timeouts = removalTimeoutsRef.current
      Object.values(timeouts).forEach((tid) => window.clearTimeout(tid))
      removalTimeoutsRef.current = {}
      setExpiringIds(new Set())
      return
    }

    const intervalId = setInterval(() => {
      const now = Date.now()

      setMessages((prev) => {
        // Identify messages that should start expiring
        const toExpire = prev.filter((m) => now - m.ts >= EXPIRY_MS).map((m) => m.id)

        if (toExpire.length > 0) {
          setExpiringIds((prevSet) => {
            const next = new Set(prevSet)
            toExpire.forEach((id) => {
              if (!next.has(id)) {
                next.add(id)
                // schedule actual removal after fade duration (~300ms)
                const timeoutId = window.setTimeout(() => {
                  setMessages((curr) => curr.filter((m) => m.id !== id))
                  setExpiringIds((currSet) => {
                    const after = new Set(currSet)
                    after.delete(id)
                    return after
                  })
                  // cleanup timeout handle
                  delete removalTimeoutsRef.current[id]
                }, 320)
                removalTimeoutsRef.current[id] = timeoutId
              }
            })
            return next
          })
        }

        return prev
      })
    }, 250)

    return () => {
      clearInterval(intervalId)
      // Clear any pending removals
      const timeouts = removalTimeoutsRef.current
      Object.values(timeouts).forEach((tid) => window.clearTimeout(tid))
      removalTimeoutsRef.current = {}
    }
  }, [autoExpire])

  return {
    messages,
    addMessage,
    clearMessages,
    messageCount: messages.length,
    expiringIds,
  }
}
