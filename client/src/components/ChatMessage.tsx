import React from 'react'
import type { ChatMessage as ChatMessageType } from '../../../shared/types'

interface ChatMessageProps {
  message: ChatMessageType
  showPlatform?: boolean
  showBadges?: boolean
  isNew?: boolean
}

const platformColors = {
  twitch: 'bg-purple-600',
  youtube: 'bg-red-600',
  tiktok: 'bg-pink-600',
}

const platformLabels = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  tiktok: 'TikTok',
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  showPlatform = false,
  showBadges = false,
  isNew = false,
}) => {
  const { username, message: text, badges, platform, color, ts } = message

  return (
    <div
      className={`
      flex items-start gap-2 rounded-2xl
      px-3 backdrop-blur-sm
      transition-all duration-200 ease-out
      ${isNew ? 'animate-fade-in' : ''}
    `}
    >
      {/* Timestamp */}
      <span className="flex-shrink-0 text-sm leading-relaxed text-chat-muted">
        {new Date(ts).toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>

      {/* Header with username, badges, and platform */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="truncate text-base font-bold" style={{ color: color || undefined }}>
          {username}
        </span>

        {/* Platform indicator */}
        {showPlatform && (
          <span
            className={`
              rounded-full px-2 py-0.5 text-sm font-medium text-white
              ${platformColors[platform]}
            `}
          >
            {platformLabels[platform]}
          </span>
        )}

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
      </div>

      {/* Message text */}
      <div className="whitespace-pre-wrap break-words text-base leading-relaxed">{text}</div>
    </div>
  )
}
