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
  label: string
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
    label: 'YouTube Offline',
  },
  connecting: {
    icon: Loader2,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20',
    label: 'YouTube Connecting...',
    animate: true,
  },
  connected: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    label: 'YouTube Connected',
  },
  error: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/20',
    label: 'YouTube Error',
  },
  retrying: {
    icon: Clock,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/20',
    label: 'YouTube Retrying...',
    animate: true,
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
    if (disabled || isLoading || currentStatus !== 'stopped') return

    setIsLoading(true)
    try {
      await onStart()
    } catch (error) {
      console.error('Failed to toggle YouTube connection:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTooltipText = (): string => {
    if (disabled || isLoading) return config.label

    if (currentStatus === 'stopped') {
      return `Start YouTube monitoring`
    } else if (status?.message && currentStatus === 'error') {
      // Truncate long error messages for tooltip
      const truncatedMessage =
        status.message.length > 40 ? status.message.substring(0, 40) + '...' : status.message
      return truncatedMessage
    }

    return ''
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
        ${currentStatus === 'stopped' ? 'cursor-pointer hover:bg-gray-400/30 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50' : 'cursor-default'}
      `}
    >
      {/* YouTube brand icon */}
      <FaYoutube className="h-3.5 w-3.5 text-red-500" />

      {/* Status icon */}
      <Icon className={`h-3.5 w-3.5 ${config.animate || isLoading ? 'animate-spin' : ''}`} />

      {/* Status text - hidden on small screens */}
      <span className="hidden sm:inline">{isLoading ? 'Starting...' : config.label}</span>
    </button>
  )
}
