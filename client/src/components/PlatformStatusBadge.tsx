import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, Loader2, MinusCircle, RefreshCw } from 'lucide-react'
import { FaTiktok, FaTwitch, FaYoutube } from 'react-icons/fa'
import type { ConnectorState, Platform, PlatformStatus } from '../../../shared/types'

interface PlatformStatusBadgeProps {
  platform: Platform
  status: PlatformStatus | undefined
  onRefresh: (platform: Platform) => Promise<void>
}

const platformConfig: Record<Platform, { name: string; icon: React.ReactNode }> = {
  twitch: { name: 'Twitch', icon: <FaTwitch className="h-3.5 w-3.5 text-purple-500" /> },
  youtube: { name: 'YouTube', icon: <FaYoutube className="h-3.5 w-3.5 text-red-500" /> },
  tiktok: { name: 'TikTok', icon: <FaTiktok className="h-3.5 w-3.5 text-pink-500" /> },
}

const stateConfig: Record<
  ConnectorState,
  {
    icon: React.ComponentType<{ className?: string }>
    className: string
    label: string
    spin?: boolean
  }
> = {
  disabled: { icon: MinusCircle, className: 'bg-gray-400/10 text-gray-500', label: 'Disabled' },
  waiting: { icon: Clock, className: 'bg-gray-400/20 text-gray-300', label: 'Waiting for live' },
  connecting: {
    icon: Loader2,
    className: 'bg-yellow-400/20 text-yellow-400',
    label: 'Connecting',
    spin: true,
  },
  connected: { icon: CheckCircle, className: 'bg-green-400/20 text-green-400', label: 'Live' },
  error: { icon: AlertTriangle, className: 'bg-red-400/20 text-red-400', label: 'Retrying' },
}

/**
 * Shows a platform connector state. Connectors detect lives automatically;
 * clicking forces an immediate check / reconnection.
 */
export const PlatformStatusBadge: React.FC<PlatformStatusBadgeProps> = ({
  platform,
  status,
  onRefresh,
}) => {
  const [busy, setBusy] = useState(false)
  const state = status?.status ?? 'connecting'
  const config = stateConfig[state]
  const Icon = busy ? RefreshCw : config.icon
  const clickable = state !== 'disabled' && !busy

  const handleClick = async () => {
    if (!clickable) return
    setBusy(true)
    try {
      await onRefresh(platform)
    } catch (error) {
      console.error(`[${platform}] refresh failed:`, error)
    } finally {
      setBusy(false)
    }
  }

  const tooltip = [
    `${platformConfig[platform].name}: ${config.label}`,
    status?.channel ? `Channel: ${status.channel}` : null,
    status?.message ?? null,
    clickable ? 'Click to check / reconnect now' : null,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!clickable}
      title={tooltip}
      aria-label={tooltip}
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ${config.className} ${
        clickable ? 'cursor-pointer hover:brightness-125' : 'cursor-default'
      }`}
    >
      {platformConfig[platform].icon}
      <Icon className={`h-3.5 w-3.5 ${config.spin || busy ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">{busy ? 'Checking...' : config.label}</span>
    </button>
  )
}
