import { useState, useCallback } from 'react'
import type { YouTubeStatus } from '../../../shared/types'

interface UseYouTubeControlsReturn {
  startYouTube: () => Promise<void>
  getYouTubeStatus: () => Promise<YouTubeStatus | null>
  isLoading: boolean
  error: string | null
}

export const useYouTubeControls = (): UseYouTubeControlsReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiCall = useCallback(async (endpoint: string, method: 'GET' | 'POST' = 'GET') => {
    const baseUrl = import.meta.env.DEV ? 'http://localhost:8787' : ''

    const response = await fetch(`${baseUrl}/api/youtube/${endpoint}`, {
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

  const startYouTube = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await apiCall('start', 'POST')

      if (!result.success) {
        throw new Error('Failed to start YouTube monitoring')
      }

      console.log('[youtube-controls] Successfully started YouTube monitoring')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('[youtube-controls] Failed to start YouTube:', errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [apiCall])

  const getYouTubeStatus = useCallback(async (): Promise<YouTubeStatus | null> => {
    try {
      const result = await apiCall('status', 'GET')
      return {
        status: result.status,
        isRunning: result.isRunning,
      }
    } catch (err) {
      console.error('[youtube-controls] Failed to get YouTube status:', err)
      return null
    }
  }, [apiCall])

  return {
    startYouTube,
    getYouTubeStatus,
    isLoading,
    error,
  }
}
