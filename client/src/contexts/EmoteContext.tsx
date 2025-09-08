import React, { createContext, useContext, useState, useEffect } from 'react'

interface TwitchEmote {
  id: string
  name: string
  images: {
    url_1x: string
    url_2x: string
    url_4x: string
  }
  format: string[]
  scale: string[]
  theme_mode: string[]
}

interface TwitchEmotesData {
  data: TwitchEmote[]
}

interface EmoteContextType {
  emotes: Map<string, TwitchEmote>
  isLoading: boolean
  error: string | null
}

const EmoteContext = createContext<EmoteContextType | undefined>(undefined)

export const EmoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [emotes, setEmotes] = useState<Map<string, TwitchEmote>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadEmotes = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/public/twitchGlobalEmotes.json')

        if (!response.ok) {
          throw new Error(`Failed to load emotes: ${response.status}`)
        }

        const data: TwitchEmotesData = await response.json()

        // Create a Map for fast lookup by emote name
        const emoteMap = new Map<string, TwitchEmote>()
        data.data.forEach((emote) => {
          emoteMap.set(emote.name, emote)
        })

        setEmotes(emoteMap)
        setError(null)
      } catch (err) {
        console.error('Error loading Twitch emotes:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    loadEmotes()
  }, [])

  return (
    <EmoteContext.Provider value={{ emotes, isLoading, error }}>{children}</EmoteContext.Provider>
  )
}

export const useEmotes = (): EmoteContextType => {
  const context = useContext(EmoteContext)
  if (context === undefined) {
    throw new Error('useEmotes must be used within an EmoteProvider')
  }
  return context
}
