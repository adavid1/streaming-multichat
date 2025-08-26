import React from 'react'
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react'

interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-400',
          bgColor: 'bg-green-400/20',
          label: 'Connected',
        }
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/20',
          label: 'Connecting...',
          animate: true,
        }
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/20',
          label: 'Error',
        }
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/20',
          label: 'Disconnected',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div
      className={`
      flex items-center gap-2 rounded-full px-3 py-1.5 text-sm
      ${config.bgColor} ${config.color}
      transition-all duration-200
    `}
    >
      <Icon className={`h-4 w-4 ${config.animate ? 'animate-spin' : ''}`} />
      <span className="hidden font-medium sm:inline">{config.label}</span>
    </div>
  )
}
