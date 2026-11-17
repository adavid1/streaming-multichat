import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MessageSquare, Settings, X } from 'lucide-react'
import { ChatMessage } from './components/ChatMessage'
import { FilterControls } from './components/FilterControls'
import { ConnectionStatus } from './components/ConnectionStatus'
import { PlatformStatusBadge } from './components/PlatformStatusBadge'
import { useWebSocket } from './hooks/useWebSocket'
import { useChatMessages } from './hooks/useChatMessages'
import { BadgeProvider } from './contexts/BadgeContext'
import { EmoteProvider } from './contexts/EmoteContext'
import type { Platform, PlatformFilters } from '../../shared/types'

const PLATFORMS: Platform[] = ['twitch', 'youtube', 'tiktok']
const API_BASE = import.meta.env.DEV ? 'http://localhost:8787' : ''

/** Public overlay by default; `/private` (or `?private=1`) shows the streamer dock. */
function detectPublicMode(): boolean {
  const params = new URLSearchParams(window.location.search)
  if (params.get('mode') === 'public') return true
  const privateParam = params.get('private')?.toLowerCase()
  const isPrivateParam = privateParam !== undefined && ['1', 'true', 'yes'].includes(privateParam)
  const isPrivatePath = window.location.pathname.replace(/\/+$/, '') === '/private'
  return !(isPrivateParam || isPrivatePath)
}

async function refreshPlatform(platform: Platform): Promise<void> {
  const response = await fetch(`${API_BASE}/api/${platform}/refresh`, { method: 'POST' })
  if (!response.ok && response.status !== 429) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `HTTP ${response.status}`)
  }
}

const App: React.FC = () => {
  const [filters, setFilters] = useState<PlatformFilters>({
    twitch: true,
    youtube: true,
    tiktok: true,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [isPublicMode] = useState(detectPublicMode)

  const { messages, addMessage, addHistory, clearMessages, expiringIds } = useChatMessages({
    autoExpire: isPublicMode,
  })
  const { connectionStatus, isConnected, statuses, twitchBadges } = useWebSocket({
    onChat: addMessage,
    onHistory: addHistory,
  })

  const filteredMessages = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return messages.filter((message) => {
      if (!filters[message.platform]) return false
      if (!query) return true
      return (
        message.username.toLowerCase().includes(query) ||
        message.message.toLowerCase().includes(query)
      )
    })
  }, [messages, filters, searchQuery])

  const handleFilterChange = useCallback((platform: keyof PlatformFilters, enabled: boolean) => {
    setFilters((prev) => ({ ...prev, [platform]: enabled }))
  }, [])

  const toggleSettings = useCallback(() => setShowSettings((prev) => !prev), [])

  useEffect(() => {
    document.body.className = isPublicMode ? 'public' : 'private'
    return () => {
      document.body.className = ''
    }
  }, [isPublicMode])

  const waitingPlatforms = PLATFORMS.filter((p) => statuses?.[p]?.status === 'waiting')

  return (
    <EmoteProvider>
      <BadgeProvider twitchBadges={twitchBadges}>
        <div
          className={`min-h-screen ${isPublicMode ? 'bg-transparent' : 'bg-black'} font-sans text-chat-text`}
        >
          {/* Header - hidden in public mode */}
          {!isPublicMode && (
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 p-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <h1 className="text-lg font-semibold">Multichat</h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ConnectionStatus status={connectionStatus} />
                {isConnected &&
                  PLATFORMS.map((platform) => (
                    <PlatformStatusBadge
                      key={platform}
                      platform={platform}
                      status={statuses?.[platform]}
                      onRefresh={refreshPlatform}
                    />
                  ))}
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
                <h2 className="text-sm font-medium text-chat-muted">Chat Settings</h2>
                <button
                  onClick={toggleSettings}
                  className="rounded p-1 hover:bg-gray-800"
                  aria-label="Close settings"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-6">
                <FilterControls
                  filters={filters}
                  searchQuery={searchQuery}
                  onFilterChange={handleFilterChange}
                  onSearchChange={setSearchQuery}
                />
              </div>

              <div className="border-t border-gray-800 pt-3">
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
              {!isPublicMode && filteredMessages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-chat-muted">
                  <div className="text-center">
                    <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p>No messages yet...</p>
                    {!isConnected && (
                      <p className="mt-1 text-sm">Connecting to the multichat server...</p>
                    )}
                    {isConnected && waitingPlatforms.length > 0 && (
                      <p className="mt-1 text-sm">
                        Waiting for the live on {waitingPlatforms.join(', ')}: chats connect
                        automatically when the stream starts.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                filteredMessages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isPublicMode={isPublicMode}
                    isNew={index === filteredMessages.length - 1}
                    isExpiring={expiringIds.has(message.id)}
                  />
                ))
              )}
            </div>
          </main>
        </div>
      </BadgeProvider>
    </EmoteProvider>
  )
}

export default App
