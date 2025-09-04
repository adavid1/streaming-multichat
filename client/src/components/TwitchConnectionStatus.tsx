import React from 'react'
import { Loader2, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react'
import { FaTwitch } from 'react-icons/fa'

interface TwitchConnectionStatusProps {
  status: 'stopped' | 'connecting' | 'connected' | 'disconnected' | 'error' | null
  disabled?: boolean
}

const statusConfig = {
  stopped: {
    icon: WifiOff,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/20',
    label: 'Twitch Offline',
  },
  connecting: {
    icon: Loader2,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20',
    label: 'Twitch Connecting...',
    animate: true,
  },
  connected: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    label: 'Twitch Connected',
  },
  disconnected: {
    icon: WifiOff,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/20',
    label: 'Twitch Disconnected',
  },
  error: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-400/20',
    label: 'Twitch Error',
  },
}

export const TwitchConnectionStatus: React.FC<TwitchConnectionStatusProps> = ({
  status,
  disabled = false,
}) => {
  const currentStatus = status || 'stopped'
  const config = statusConfig[currentStatus]
  const Icon = config.icon

  const getTooltipText = (): string => {
    switch (currentStatus) {
      case 'connected':
        return 'Twitch chat is connected and monitoring messages'
      case 'connecting':
        return 'Connecting to Twitch chat...'
      case 'disconnected':
        return 'Twitch chat disconnected - will attempt to reconnect'
      case 'error':
        return 'Twitch connection error - check your channel configuration'
      case 'stopped':
      default:
        return 'Twitch chat monitoring is not configured'
    }
  }

  return (
    <div
      title={getTooltipText()}
      className={`
        flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium
        transition-all duration-200
        ${config.bgColor} ${config.color}
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      {/* Twitch brand icon */}
      <FaTwitch className="h-3.5 w-3.5 text-purple-500" />

      {/* Status icon */}
      <Icon className={`h-3.5 w-3.5 ${config.animate ? 'animate-spin' : ''}`} />

      {/* Status text - hidden on small screens */}
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  )
}
