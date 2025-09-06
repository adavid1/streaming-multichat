import { useState, useCallback } from 'react'
import type { TwitchStatus } from '../../../shared/types'

interface UseTwitchControlsReturn {
  getTwitchStatus: () => Promise<TwitchStatus | null>
  isLoading: boolean
  error: string | null
}

export const useTwitchControls = (): UseTwitchControlsReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiCall = useCallback(async (endpoint: string, method: 'GET' | 'POST' = 'GET') => {
    const baseUrl = import.meta.env.DEV ? 'http://localhost:8787' : ''

    const response = await fetch(`${baseUrl}/api/twitch/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  }, [])

  const getTwitchStatus = useCallback(async (): Promise<TwitchStatus | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await apiCall('status', 'GET')
      return result as TwitchStatus
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('[twitch-controls] Failed to get Twitch status:', errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [apiCall])

  return {
    getTwitchStatus,
    isLoading,
    error,
  }
}
