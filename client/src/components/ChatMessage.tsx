import React from 'react'
import { FaTwitch, FaYoutube } from 'react-icons/fa'
import { SiTiktok } from 'react-icons/si'
import type { ChatMessage as ChatMessageType } from '../../../shared/types'

interface ChatMessageProps {
  message: ChatMessageType
  isPublicMode?: boolean
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
  isPublicMode = true,
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
      {!isPublicMode && (
        <span className="flex-shrink-0 text-sm leading-relaxed text-chat-muted">
          {new Date(ts).toLocaleTimeString([], {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )}

      {/* Platform indicator */}
      {!isPublicMode && (
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

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex gap-1">
          {badges.map((badge, index) => {
            const badgeLower = badge.toLowerCase()
            const isTwitchModerator = platform === 'twitch' && badgeLower === 'moderator'
            const isTwitchVIP = platform === 'twitch' && badgeLower === 'vip'
            const isTwitchNoVideo = platform === 'twitch' && badgeLower === 'no_video'
            const isTwitchNoAudio = platform === 'twitch' && badgeLower === 'no_audio'
            const isTwitchPremium = platform === 'twitch' && badgeLower === 'premium'

            if (isTwitchModerator) {
              return (
                <img
                  key={index}
                  src="https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1"
                  alt="Moderator"
                  title="Moderator"
                  className="my-1 h-4 w-4"
                />
              )
            }

            if (isTwitchVIP) {
              return (
                <img
                  key={index}
                  src="https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/3"
                  alt="VIP"
                  title="VIP"
                  className="my-1 h-4 w-4 object-cover"
                />
              )
            }

            if (isTwitchNoVideo) {
              return (
                <img
                  key={index}
                  src="https://assets.help.twitch.tv/article/img/659115-05.png"
                  alt="No Video"
                  title="No Video"
                  className="my-1 h-4 w-4"
                />
              )
            }

            if (isTwitchNoAudio) {
              return (
                <img
                  key={index}
                  src="https://assets.help.twitch.tv/article/img/659115-04.png"
                  alt="No Audio"
                  title="No Audio"
                  className="my-1 h-4 w-4"
                />
              )
            }

            if (isTwitchNoAudio) {
              return (
                <img
                  key={index}
                  src="https://assets.help.twitch.tv/article/img/659115-04.png"
                  alt="No Audio"
                  title="No Audio"
                  className="my-1 h-4 w-4"
                />
              )
            }

            if (isTwitchPremium) {
              return (
                <img
                  key={index}
                  src="https://static-cdn.jtvnw.net/badges/v1/a1dd5073-19c3-4911-8cb4-c464a7bc1510/1"
                  alt="Premium"
                  title="Premium"
                  className="my-1 h-4 w-4"
                />
              )
            }

            if (!isPublicMode) {
              return (
                <span
                  key={index}
                  className="rounded bg-gray-700 px-1.5 py-0.5 text-sm text-gray-300"
                >
                  {badge}
                </span>
              )
            }
          })}
        </div>
      )}

      <span className="truncate text-base font-bold" style={{ color: color || undefined }}>
        {username}
      </span>

      {/* Message text */}
      <div className="whitespace-pre-wrap break-words text-base leading-relaxed">{text}</div>
    </div>
  )
}
