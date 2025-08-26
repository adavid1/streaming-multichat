import React, { createContext, useContext, ReactNode } from 'react'
import type { TwitchBadgeResponse } from '../../../shared/types'

interface BadgeContextType {
  twitchBadges: TwitchBadgeResponse | null
  getSubscriptionBadgeUrl: (months: number) => string | null
  getCheerBadgeUrl: (bits: number) => string | null
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined)

interface BadgeProviderProps {
  children: ReactNode
  twitchBadges: TwitchBadgeResponse | null
}

export const BadgeProvider: React.FC<BadgeProviderProps> = ({ children, twitchBadges }) => {
  const getCheerBadgeUrl = (bits: number): string | null => {
    if (!twitchBadges?.badge_sets.bits) {
      // Return default Twitch cheer badge for 1 bit
      return 'https://static-cdn.jtvnw.net/badges/v1/73b5c3fb-24f9-4a82-a852-2f475b59411c/1'
    }

    const versions = twitchBadges.badge_sets.bits.versions
    const bitsKey = bits.toString()

    // Debug logging
    const availableVersions = Object.keys(versions)

    // Try to find exact match first
    if (versions[bitsKey]) {
      return versions[bitsKey].image_url_1x
    }

    // If no exact match, find the closest version
    const availableBits = Object.keys(versions)
      .map(Number)
      .filter((n) => !isNaN(n)) // Filter out non-numeric keys
      .sort((a, b) => a - b)

    // Find the highest available bits that's <= the requested bits
    const closestBits = availableBits.filter((b) => b <= bits).pop()

    if (closestBits !== undefined) {
      const url = versions[closestBits.toString()].image_url_1x
      return url
    }

    // If no suitable version found, use the lowest available (fallback for edge cases)
    const lowestBits = availableBits[0]
    if (lowestBits !== undefined) {
      const url = versions[lowestBits.toString()].image_url_1x
      return url
    }

    // Final fallback - check for string versions like '1'
    const version1 = versions['1']
    if (version1) {
      return version1.image_url_1x
    }

    // Absolute final fallback
    return 'https://static-cdn.jtvnw.net/badges/v1/73b5c3fb-24f9-4a82-a852-2f475b59411c/1'
  }

  const getSubscriptionBadgeUrl = (months: number): string | null => {
    if (!twitchBadges?.badge_sets.subscriber) {
      // Return default Twitch subscriber badge
      return 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1'
    }

    const versions = twitchBadges.badge_sets.subscriber.versions
    const monthKey = months.toString()

    // Debug logging
    const availableVersions = Object.keys(versions)

    // Try to find exact match first
    if (versions[monthKey]) {
      return versions[monthKey].image_url_1x
    }

    // If no exact match, find the closest version
    const availableMonths = Object.keys(versions)
      .map(Number)
      .filter((n) => !isNaN(n)) // Filter out non-numeric keys
      .sort((a, b) => a - b)

    // Find the highest available month that's <= the requested months
    const closestMonth = availableMonths.filter((m) => m <= months).pop()

    if (closestMonth !== undefined) {
      const url = versions[closestMonth.toString()].image_url_1x
      return url
    }

    // If no suitable version found, use the lowest available (fallback for edge cases)
    const lowestMonth = availableMonths[0]
    if (lowestMonth !== undefined) {
      const url = versions[lowestMonth.toString()].image_url_1x
      return url
    }

    // Final fallback - check for string versions like '0'
    const version0 = versions['0']
    if (version0) {
      return version0.image_url_1x
    }

    // Absolute final fallback
    return 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1'
  }

  const value: BadgeContextType = {
    twitchBadges,
    getSubscriptionBadgeUrl,
    getCheerBadgeUrl,
  }

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>
}

export const useBadges = (): BadgeContextType => {
  const context = useContext(BadgeContext)
  if (context === undefined) {
    throw new Error('useBadges must be used within a BadgeProvider')
  }
  return context
}
