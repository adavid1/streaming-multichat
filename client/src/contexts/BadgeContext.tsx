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
      console.log('[BadgeContext] No cheer badges available, using default')
      // Return default Twitch cheer badge for 1 bit
      return 'https://static-cdn.jtvnw.net/badges/v1/73b5c3fb-24f9-4a82-a852-2f475b59411c/1'
    }

    const versions = twitchBadges.badge_sets.bits.versions
    const bitsKey = bits.toString()

    // Debug logging
    const availableVersions = Object.keys(versions)
    console.log(
      `[BadgeContext] Looking for ${bits} bits badge. Available versions:`,
      availableVersions
    )

    // Try to find exact match first
    if (versions[bitsKey]) {
      console.log(
        `[BadgeContext] Found exact match for ${bits} bits:`,
        versions[bitsKey].image_url_1x
      )
      return versions[bitsKey].image_url_1x
    }

    // If no exact match, find the closest version
    const availableBits = Object.keys(versions)
      .map(Number)
      .filter((n) => !isNaN(n)) // Filter out non-numeric keys
      .sort((a, b) => a - b)

    console.log(`[BadgeContext] Available bit numbers:`, availableBits)

    // Find the highest available bits that's <= the requested bits
    const closestBits = availableBits.filter((b) => b <= bits).pop()

    if (closestBits !== undefined) {
      const url = versions[closestBits.toString()].image_url_1x
      console.log(
        `[BadgeContext] Using closest match ${closestBits} bits for requested ${bits}:`,
        url
      )
      return url
    }

    // If no suitable version found, use the lowest available (fallback for edge cases)
    const lowestBits = availableBits[0]
    if (lowestBits !== undefined) {
      const url = versions[lowestBits.toString()].image_url_1x
      console.log(
        `[BadgeContext] Using lowest available ${lowestBits} bits for requested ${bits}:`,
        url
      )
      return url
    }

    // Final fallback - check for string versions like '1'
    const version1 = versions['1']
    if (version1) {
      console.log(`[BadgeContext] Using version '1' as final fallback:`, version1.image_url_1x)
      return version1.image_url_1x
    }

    // Absolute final fallback
    console.log(`[BadgeContext] No cheer badges found, using default Twitch badge`)
    return 'https://static-cdn.jtvnw.net/badges/v1/73b5c3fb-24f9-4a82-a852-2f475b59411c/1'
  }

  const getSubscriptionBadgeUrl = (months: number): string | null => {
    if (!twitchBadges?.badge_sets.subscriber) {
      console.log('[BadgeContext] No subscription badges available, using default')
      // Return default Twitch subscriber badge
      return 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1'
    }

    const versions = twitchBadges.badge_sets.subscriber.versions
    const monthKey = months.toString()

    // Debug logging
    const availableVersions = Object.keys(versions)
    console.log(
      `[BadgeContext] Looking for ${months} months badge. Available versions:`,
      availableVersions
    )

    // Try to find exact match first
    if (versions[monthKey]) {
      console.log(
        `[BadgeContext] Found exact match for ${months} months:`,
        versions[monthKey].image_url_1x
      )
      return versions[monthKey].image_url_1x
    }

    // If no exact match, find the closest version
    const availableMonths = Object.keys(versions)
      .map(Number)
      .filter((n) => !isNaN(n)) // Filter out non-numeric keys
      .sort((a, b) => a - b)

    console.log(`[BadgeContext] Available month numbers:`, availableMonths)

    // Find the highest available month that's <= the requested months
    const closestMonth = availableMonths.filter((m) => m <= months).pop()

    if (closestMonth !== undefined) {
      const url = versions[closestMonth.toString()].image_url_1x
      console.log(
        `[BadgeContext] Using closest match ${closestMonth} months for requested ${months}:`,
        url
      )
      return url
    }

    // If no suitable version found, use the lowest available (fallback for edge cases)
    const lowestMonth = availableMonths[0]
    if (lowestMonth !== undefined) {
      const url = versions[lowestMonth.toString()].image_url_1x
      console.log(
        `[BadgeContext] Using lowest available ${lowestMonth} months for requested ${months}:`,
        url
      )
      return url
    }

    // Final fallback - check for string versions like '0'
    const version0 = versions['0']
    if (version0) {
      console.log(`[BadgeContext] Using version '0' as final fallback:`, version0.image_url_1x)
      return version0.image_url_1x
    }

    // Absolute final fallback
    console.log(`[BadgeContext] No subscription badges found, using default Twitch badge`)
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
