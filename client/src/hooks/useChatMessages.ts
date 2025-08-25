import { useState, useCallback, useEffect } from 'react'
import { useWebSocket } from './useWebSocket'
import type { ChatMessage } from '../../../shared/types'

const MAX_MESSAGES = 200

interface UseChatMessagesReturn {
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
  messageCount: number
}

export const useChatMessages = (): UseChatMessagesReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([])

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
  const { isConnected } = useWebSocket(undefined, addMessage)

  return {
    messages,
    addMessage,
    clearMessages,
    messageCount: messages.length,
  }
}
