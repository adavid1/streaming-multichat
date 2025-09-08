import React, { useState } from 'react'
import { Loader2, AlertTriangle, CheckCircle, Square, Clock } from 'lucide-react'
import { FaYoutube } from 'react-icons/fa'
import type { YouTubeStatus } from '../../../shared/types'

interface YouTubeConnectionStatusProps {
  status: YouTubeStatus | null
  onStart: () => Promise<void>
  disabled?: boolean
}

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  hoverColor: string
  label: string
  action: 'start' | 'stop'
  animate?: boolean
}

const statusConfig: Record<
  'stopped' | 'connecting' | 'connected' | 'error' | 'retrying',
  StatusConfig
> = {
  stopped: {
    icon: Square,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/20',
    hoverColor: 'hover:text-gray-300 hover:bg-gray-400/30',
    label: 'YouTube Offline',
    action: 'start' as const,
  },
  connecting: {
    icon: Loader2,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20',
    hoverColor: 'hover:bg-yellow-400/30',
    label: 'YouTube Connecting...',
    animate: true,
    action: 'stop' as const,
  },
  connected: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    hoverColor: 'hover:text-green-300 hover:bg-green-400/30',
    label: 'YouTube Connected',
    action: 'stop' as const,
  },
  error: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/20',
    hoverColor: 'hover:text-red-300 hover:bg-red-400/30',
    label: 'YouTube Error',
    action: 'start' as const,
  },
  retrying: {
    icon: Clock,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/20',
    hoverColor: 'hover:bg-orange-400/30',
    label: 'YouTube Retrying...',
    animate: true,
    action: 'stop' as const,
  },
}

export const YouTubeConnectionStatus: React.FC<YouTubeConnectionStatusProps> = ({
  status,
  onStart,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false)

  const currentStatus = status?.status || 'stopped'
  const config = statusConfig[currentStatus]
  const Icon = config.icon

  const handleClick = async () => {
    if (disabled || isLoading) return

    setIsLoading(true)
    try {
      if (config.action === 'start') {
        await onStart()
      }
    } catch (error) {
      console.error('Failed to toggle YouTube connection:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTooltipText = (): string => {
    if (disabled || isLoading) return config.label

    const action = config.action === 'start' ? 'Start' : 'Stop'
    let baseText = `${action} YouTube monitoring`

    if (status?.message && currentStatus === 'error') {
      // Truncate long error messages for tooltip
      const truncatedMessage =
        status.message.length > 40 ? status.message.substring(0, 40) + '...' : status.message
      baseText += ` - ${truncatedMessage}`
    }

    return baseText
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      title={getTooltipText()}
      className={`
        flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium
        transition-all duration-200
        ${config.bgColor} ${config.color}
        ${
          disabled || isLoading
            ? 'cursor-not-allowed opacity-50'
            : `cursor-pointer ${config.hoverColor}`
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
      `}
    >
      {/* YouTube brand icon */}
      <FaYoutube className="h-3.5 w-3.5 text-red-500" />

      {/* Status icon */}
      <Icon className={`h-3.5 w-3.5 ${config.animate || isLoading ? 'animate-spin' : ''}`} />

      {/* Status text - hidden on small screens */}
      <span className="hidden sm:inline">
        {isLoading ? (config.action === 'start' ? 'Starting...' : 'Stopping...') : config.label}
      </span>
    </button>
  )
}
