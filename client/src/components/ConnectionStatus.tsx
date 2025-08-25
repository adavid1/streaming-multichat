import React from 'react';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  isConnected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, isConnected }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-400',
          bgColor: 'bg-green-400/20',
          label: 'Connected',
        };
      case 'connecting':
        return {
          icon: Loader2,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/20',
          label: 'Connecting...',
          animate: true,
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-red-400',
          bgColor: 'bg-red-400/20',
          label: 'Error',
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/20',
          label: 'Disconnected',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
      ${config.bgColor} ${config.color}
      transition-all duration-200
    `}>
      <Icon 
        className={`w-4 h-4 ${config.animate ? 'animate-spin' : ''}`} 
      />
      <span className="font-medium hidden sm:inline">
        {config.label}
      </span>
    </div>
  );
};