import React from 'react'
import { FaTwitch, FaYoutube } from 'react-icons/fa'
import { SiTiktok } from 'react-icons/si'
import { useBadges } from '../contexts/BadgeContext'
import { useEmotes } from '../contexts/EmoteContext'
import { getBadgeUrl, getBadgeInfo } from '../utils/badgeUtils'
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
  const { username, message: text, badges, platform, color, ts, raw } = message
  const { getSubscriptionBadgeUrl, getCheerBadgeUrl } = useBadges()
  const { emotes } = useEmotes()

  // Extract subscription months from Twitch raw data
  const getSubscriptionMonths = (): number | null => {
    if (platform !== 'twitch') return null

    if (raw?.tags?.['badge-info']?.subscriber) {
      const months = parseInt(raw.tags['badge-info'].subscriber, 10)
      if (!isNaN(months)) return months
    }

    return null
  }

  const subscriptionMonths = getSubscriptionMonths()

  // Function to render a word as either an emote image or text
  const renderWord = (word: string, index: number) => {
    // Check if the word matches a Twitch global emote
    const emote = emotes.get(word)

    if (emote) {
      return (
        <img
          key={index}
          src={emote.images.url_1x}
          alt={emote.name}
          title={emote.name}
          className="inline-block size-6 object-contain align-middle"
        />
      )
    }

    // Return as regular text if no emote match
    return <span key={index}>{word}</span>
  }

  return (
    <div
      className={`
    flex flex-wrap items-start gap-1 rounded-2xl
    transition-opacity duration-300 ease-out
    ${isNew ? 'animate-fade-in' : ''}
    ${isExpiring ? 'opacity-0' : 'opacity-100'}
  `}
    >
      {/* Timestamp */}
      {!isPublicMode && (
        <span className="text-sm leading-relaxed text-chat-muted">
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
            const isTwitchSubscriber = platform === 'twitch' && badgeLower === 'subscriber'
            const isTwitchCheer =
              platform === 'twitch' && (badgeLower === 'bits' || badgeLower.startsWith('cheer'))

            // Handle subscription badges with months (special case)
            if (isTwitchSubscriber) {
              // Try to get subscription months, fallback to 1 month if none found
              const months = subscriptionMonths || 1
              const subscriptionBadgeUrl = getSubscriptionBadgeUrl(months)

              if (subscriptionBadgeUrl) {
                return (
                  <img
                    key={index}
                    src={subscriptionBadgeUrl}
                    alt={`Subscriber ${months} months`}
                    title={`Subscriber ${months} months`}
                    className="my-1 size-4 object-contain"
                  />
                )
              }
            }

            // Handle cheer/bits badges (special case - can be customized by streamers)
            if (isTwitchCheer) {
              // Extract bit amount from raw data or use default
              const bits = raw?.badges?.bits || 1
              const cheerBadgeUrl = getCheerBadgeUrl(bits)

              if (cheerBadgeUrl) {
                return (
                  <img
                    key={index}
                    src={cheerBadgeUrl}
                    alt={`Cheered ${bits} bits`}
                    title={`Cheered ${bits} bits`}
                    className="my-1 size-4 object-contain"
                  />
                )
              }
            }

            // Handle all other Twitch global badges dynamically
            // Exclude special cases: subscriber, bits/cheer badges
            if (platform === 'twitch' && !isTwitchSubscriber && !isTwitchCheer) {
              const badgeUrl = getBadgeUrl(badgeLower)
              const badgeInfo = getBadgeInfo(badgeLower)

              if (badgeUrl) {
                return (
                  <img
                    key={index}
                    src={badgeUrl}
                    alt={badgeInfo?.title || badge}
                    title={badgeInfo?.title || badge}
                    className="my-1 size-4 object-contain"
                  />
                )
              }
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

            return null
          })}
        </div>
      )}

      {/* Username */}
      <span className="font-bold" style={{ color: color || undefined }}>
        {username}
      </span>

      {/* Message text */}
      {text.split(' ').map((word, index) => renderWord(word, index))}
    </div>
  )
}
