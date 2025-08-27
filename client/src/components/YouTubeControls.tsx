import React, { useState, useCallback } from 'react'
import { Play, Square, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { FaYoutube } from 'react-icons/fa'
import type { YouTubeStatus } from '../../../shared/types'

interface YouTubeControlsProps {
  status: YouTubeStatus | null
  onStart: () => Promise<void>
  onStop: () => Promise<void>
  disabled?: boolean
}

const statusConfig = {
  stopped: {
    icon: Square,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/20',
    label: 'Stopped',
    description: 'YouTube chat monitoring is not active',
  },
  connecting: {
    icon: Loader2,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20',
    label: 'Connecting...',
    description: 'Attempting to connect to YouTube live chat',
    animate: true,
  },
  connected: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    label: 'Connected',
    description: 'Successfully monitoring YouTube live chat',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/20',
    label: 'Error',
    description: 'Failed to connect to YouTube chat',
  },
  retrying: {
    icon: Clock,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/20',
    label: 'Retrying...',
    description: 'Waiting to retry connection',
    animate: true,
  },
}

export const YouTubeControls: React.FC<YouTubeControlsProps> = ({
  status,
  onStart,
  onStop,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false)

  const currentStatus = status?.status || 'stopped'
  const config = statusConfig[currentStatus]
  const Icon = config.icon
  const isConnectedOrConnecting = currentStatus === 'connected' || currentStatus === 'connecting'

  const handleStart = useCallback(async () => {
    if (disabled || isLoading) return

    setIsLoading(true)
    try {
      await onStart()
    } catch (error) {
      console.error('Failed to start YouTube:', error)
    } finally {
      setIsLoading(false)
    }
  }, [onStart, disabled, isLoading])

  const handleStop = useCallback(async () => {
    if (disabled || isLoading) return

    setIsLoading(true)
    try {
      await onStop()
    } catch (error) {
      console.error('Failed to stop YouTube:', error)
    } finally {
      setIsLoading(false)
    }
  }, [onStop, disabled, isLoading])

  const getStatusMessage = (): string => {
    if (status?.message) {
      // Truncate very long error messages
      return status.message.length > 60 ? status.message.substring(0, 60) + '...' : status.message
    }
    return config.description
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FaYoutube className="h-5 w-5 text-red-500" />
          <h3 className="font-medium text-white">YouTube Live Chat</h3>
        </div>

        {/* Status indicator */}
        <div
          className={`
            flex items-center gap-2 rounded-full px-3 py-1 text-sm
            ${config.bgColor} ${config.color}
            transition-all duration-200
          `}
        >
          <Icon className={`h-3.5 w-3.5 ${config.animate ? 'animate-spin' : ''}`} />
          <span className="font-medium">{config.label}</span>
        </div>
      </div>

      {/* Status message */}
      <p className="text-sm text-gray-300">{getStatusMessage()}</p>

      {/* Control buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={disabled || isLoading || isConnectedOrConnecting}
          className={`
            flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
            transition-all duration-200
            ${
              disabled || isLoading || isConnectedOrConnecting
                ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                : 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500'
            }
          `}
        >
          {isLoading && currentStatus === 'connecting' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Start Monitoring
        </button>

        <button
          onClick={handleStop}
          disabled={disabled || isLoading || currentStatus === 'stopped'}
          className={`
            flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
            transition-all duration-200
            ${
              disabled || isLoading || currentStatus === 'stopped'
                ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                : 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500'
            }
          `}
        >
          {isLoading && currentStatus === 'stopped' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          Stop Monitoring
        </button>
      </div>

      {/* Additional info for error state */}
      {currentStatus === 'error' && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-red-400" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-red-400">Connection Failed</p>
              <p className="mt-1 text-gray-300">
                Make sure your YouTube stream is live and the channel ID is correct. You can try
                starting again when your stream begins.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Additional info for retrying state */}
      {currentStatus === 'retrying' && (
        <div className="rounded-lg border border-orange-400/30 bg-orange-400/10 p-3">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 text-orange-400" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-orange-400">Retrying Connection</p>
              <p className="mt-1 text-gray-300">
                Waiting for your YouTube stream to come online. The system will automatically
                connect when it detects your stream is live.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success state info */}
      {currentStatus === 'connected' && (
        <div className="rounded-lg border border-green-400/30 bg-green-400/10 p-3">
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 text-green-400" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-green-400">Successfully Connected</p>
              <p className="mt-1 text-gray-300">
                YouTube live chat messages are now being monitored and will appear in the chat
                overlay.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
