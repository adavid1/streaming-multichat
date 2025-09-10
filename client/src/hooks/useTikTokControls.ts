import { useState, useCallback } from 'react'
import type { TikTokStatus } from '../../../shared/types'

interface UseTikTokControlsReturn {
  startTikTok: () => Promise<void>
  getTikTokStatus: () => Promise<TikTokStatus | null>
  isLoading: boolean
  error: string | null
}

export const useTikTokControls = (): UseTikTokControlsReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiCall = useCallback(async (endpoint: string, method: 'GET' | 'POST' = 'GET') => {
    const baseUrl = import.meta.env.DEV ? 'http://localhost:8787' : ''

    const response = await fetch(`${baseUrl}/api/tiktok/${endpoint}`, {
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

  const startTikTok = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await apiCall('start', 'POST')

      if (!result.success) {
        throw new Error('Failed to start TikTok monitoring')
      }

      console.log('[tiktok-controls] Successfully started TikTok monitoring')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('[tiktok-controls] Failed to start TikTok:', errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [apiCall])

  const getTikTokStatus = useCallback(async (): Promise<TikTokStatus | null> => {
    try {
      const result = await apiCall('status', 'GET')
      return {
        status: result.status,
        isRunning: result.isRunning,
      }
    } catch (err) {
      console.error('[tiktok-controls] Failed to get TikTok status:', err)
      return null
    }
  }, [apiCall])

  return {
    startTikTok,
    getTikTokStatus,
    isLoading,
    error,
  }
}
