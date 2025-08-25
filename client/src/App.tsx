import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MessageSquare, Settings, X } from 'lucide-react'
import { ChatMessage } from './components/ChatMessage'
import { FilterControls } from './components/FilterControls'
import { ConnectionStatus } from './components/ConnectionStatus'
import { useWebSocket } from './hooks/useWebSocket'
import { useChatMessages } from './hooks/useChatMessages'
import type { PlatformFilters } from '../../shared/types'

const App: React.FC = () => {
  const [filters, setFilters] = useState<PlatformFilters>({
    twitch: true,
    youtube: true,
    tiktok: true,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [isPublicMode, setIsPublicMode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mode') === 'public'
  })

  const { connectionStatus, isConnected } = useWebSocket()
  const { messages, addMessage, clearMessages } = useChatMessages()

  // Filter messages based on filters and search query
  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      // Platform filter
      if (!filters[message.platform]) return false

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          message.username.toLowerCase().includes(query) ||
          message.message.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [messages, filters, searchQuery])

  const handleFilterChange = useCallback((platform: keyof PlatformFilters, enabled: boolean) => {
    setFilters((prev) => ({ ...prev, [platform]: enabled }))
  }, [])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev)
  }, [])

  // Set up body classes for styling
  useEffect(() => {
    document.body.className = isPublicMode ? 'public' : 'private'
    return () => {
      document.body.className = ''
    }
  }, [isPublicMode])

  return (
    <div
      className={`min-h-screen ${isPublicMode ? 'bg-transparent' : 'bg-black'} font-sans text-chat-text`}
    >
      {/* Header - hidden in public mode */}
      {!isPublicMode && (
        <header className="flex items-center justify-between border-b border-gray-800 p-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Multichat</h1>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionStatus status={connectionStatus} isConnected={isConnected} />
            <button
              onClick={toggleSettings}
              className="rounded-lg bg-gray-800 p-2 transition-colors hover:bg-gray-700"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </header>
      )}

      {/* Settings Panel */}
      {showSettings && !isPublicMode && (
        <div className="border-b border-gray-800 bg-gray-900 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-chat-muted">Chat Filters</h2>
            <button
              onClick={toggleSettings}
              className="rounded p-1 hover:bg-gray-800"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <FilterControls
            filters={filters}
            searchQuery={searchQuery}
            onFilterChange={handleFilterChange}
            onSearchChange={handleSearchChange}
          />

          <div className="mt-4 border-t border-gray-800 pt-3">
            <div className="flex items-center justify-between text-sm text-chat-muted">
              <span>Total messages: {messages.length}</span>
              <button
                onClick={clearMessages}
                className="rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <main
        className={`flex-1 ${isPublicMode ? 'h-screen' : 'h-[calc(100vh-80px)]'} overflow-hidden`}
      >
        <div
          className="flex h-full flex-col justify-end space-y-2 overflow-y-auto p-3"
          style={{ scrollBehavior: 'smooth' }}
        >
          {filteredMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-chat-muted">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No messages yet...</p>
                {!isConnected && <p className="mt-1 text-sm">Connecting to chat...</p>}
              </div>
            </div>
          ) : (
            filteredMessages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                showPlatform={!isPublicMode}
                showBadges={!isPublicMode}
                isNew={index === filteredMessages.length - 1}
              />
            ))
          )}
        </div>
      </main>

      {/* Debug info in development */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-2 right-2 rounded bg-black bg-opacity-75 p-2 text-xs text-white">
          <div>Mode: {isPublicMode ? 'Public' : 'Private'}</div>
          <div>
            Messages: {filteredMessages.length}/{messages.length}
          </div>
          <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  )
}

export default App
