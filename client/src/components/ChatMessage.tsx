import React from 'react'
import { FaTwitch, FaYoutube } from 'react-icons/fa'
import { SiTiktok } from 'react-icons/si'
import type { ChatMessage as ChatMessageType } from '../../../shared/types'

interface ChatMessageProps {
  message: ChatMessageType
  showPlatform?: boolean
  showTimestamp?: boolean
  showBadges?: boolean
  isNew?: boolean
  isExpiring?: boolean
}

const platformColors = {
  twitch: 'bg-purple-600',
  youtube: 'bg-red-600',
  tiktok: 'bg-pink-600',
}

const platformIcons = {
  twitch: <FaTwitch className="h-3.5 w-3.5" aria-hidden="true" />,
  youtube: <FaYoutube className="h-3.5 w-3.5" aria-hidden="true" />,
  tiktok: <SiTiktok className="h-3.5 w-3.5" aria-hidden="true" />,
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  showTimestamp = false,
  showPlatform = false,
  showBadges = false,
  isNew = false,
  isExpiring = false,
}) => {
  const { username, message: text, badges, platform, color, ts } = message

  return (
    <div
      className={`
      flex items-start gap-2 rounded-2xl
      backdrop-blur-sm
      transition-opacity duration-300 ease-out
      ${isNew ? 'animate-fade-in' : ''}
      ${isExpiring ? 'opacity-0' : 'opacity-100'}
    `}
    >
      {/* Timestamp */}
      {showTimestamp && (
        <span className="flex-shrink-0 text-sm leading-relaxed text-chat-muted">
          {new Date(ts).toLocaleTimeString([], {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}

      {/* Platform indicator */}
      {showPlatform && (
        <span
          className={`
              inline-flex items-center justify-center rounded-full p-1 text-white
              ${platformColors[platform]}
            `}
          aria-label={platform}
          title={platform}
        >
          {platformIcons[platform]}
        </span>
      )}

      <span className="truncate text-base font-bold" style={{ color: color || undefined }}>
        {username}
      </span>

      {/* Badges */}
      {showBadges && badges.length > 0 && (
        <div className="flex gap-1">
          {badges.map((badge, index) => (
            <span key={index} className="rounded bg-gray-700 px-1.5 py-0.5 text-sm text-gray-300">
              {badge}
            </span>
          ))}
        </div>
      )}

      {/* Message text */}
      <div className="whitespace-pre-wrap break-words text-base leading-relaxed">{text}</div>
    </div>
  )
}
