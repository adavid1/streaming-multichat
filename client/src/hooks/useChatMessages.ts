import { useState, useCallback, useEffect, useRef } from 'react'
import type { ChatMessage } from '../../../shared/types'

const MAX_MESSAGES = 200
const EXPIRY_MS = 60_000 // messages disappear after 1 minute in the overlay
const FADE_MS = 320

interface UseChatMessagesReturn {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  addHistory: (messages: ChatMessage[], serverTime: number) => void
  clearMessages: () => void
  expiringIds: Set<string>
}

interface UseChatMessagesOptions {
  autoExpire?: boolean
}

function merge(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const known = new Set(prev.map((m) => m.id))
  const fresh = incoming.filter((m) => !known.has(m.id))
  if (fresh.length === 0) return prev
  const next = [...prev, ...fresh].sort((a, b) => a.ts - b.ts)
  return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
}

export const useChatMessages = ({
  autoExpire = true,
}: UseChatMessagesOptions = {}): UseChatMessagesReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [expiringIds, setExpiringIds] = useState<Set<string>>(new Set())
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const addMessage = useCallback((message: ChatMessage) => {
    // Use the local clock for expiry: the server clock may differ from the OBS machine
    setMessages((prev) => merge(prev, [{ ...message, ts: Date.now() }]))
  }, [])

  // History is sent by the server on (re)connection. Timestamps are shifted to
  // the local clock (like live messages), then deduped by id; messages that
  // would already have expired in the overlay are skipped.
  const addHistory = useCallback(
    (history: ChatMessage[], serverTime: number) => {
      const now = Date.now()
      const offset = Number.isFinite(serverTime) ? now - serverTime : 0
      const local = history.map((m) => ({ ...m, ts: m.ts + offset }))
      const kept = autoExpire ? local.filter((m) => now - m.ts < EXPIRY_MS - 5_000) : local
      setMessages((prev) => merge(prev, kept))
    },
    [autoExpire]
  )

  const clearMessages = useCallback(() => setMessages([]), [])

  useEffect(() => {
    if (!autoExpire) {
      setExpiringIds(new Set())
      return
    }

    const timeouts = new Set<number>()
    const expiring = new Set<string>()

    const intervalId = window.setInterval(() => {
      const now = Date.now()
      const fresh = messagesRef.current
        .filter((m) => now - m.ts >= EXPIRY_MS && !expiring.has(m.id))
        .map((m) => m.id)
      if (fresh.length === 0) return

      // 1. fade out, 2. remove once the CSS transition is done
      fresh.forEach((id) => expiring.add(id))
      setExpiringIds(new Set(expiring))

      const timeoutId = window.setTimeout(() => {
        timeouts.delete(timeoutId)
        const removed = new Set(fresh)
        fresh.forEach((id) => expiring.delete(id))
        setMessages((curr) => curr.filter((m) => !removed.has(m.id)))
        setExpiringIds(new Set(expiring))
      }, FADE_MS)
      timeouts.add(timeoutId)
    }, 500)

    return () => {
      window.clearInterval(intervalId)
      timeouts.forEach((id) => window.clearTimeout(id))
    }
  }, [autoExpire])

  return { messages, addMessage, addHistory, clearMessages, expiringIds }
}
