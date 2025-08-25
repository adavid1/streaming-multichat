import React, { createContext, useContext, ReactNode } from 'react'
import type { TwitchBadgeResponse } from '../../../shared/types'

interface BadgeContextType {
  twitchBadges: TwitchBadgeResponse | null
  getSubscriptionBadgeUrl: (months: number) => string | null
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined)

interface BadgeProviderProps {
  children: ReactNode
  twitchBadges: TwitchBadgeResponse | null
}

export const BadgeProvider: React.FC<BadgeProviderProps> = ({ children, twitchBadges }) => {
  const getSubscriptionBadgeUrl = (months: number): string | null => {
    if (!twitchBadges?.badge_sets.subscriber) {
      return null
    }

    const versions = twitchBadges.badge_sets.subscriber.versions
    const monthKey = months.toString()

    // Try to find exact match first
    if (versions[monthKey]) {
      return versions[monthKey].image_url_1x
    }

    // If no exact match, find the closest version
    const availableMonths = Object.keys(versions)
      .map(Number)
      .sort((a, b) => a - b)

    // Find the highest available month that's <= the requested months
    const closestMonth = availableMonths.filter((m) => m <= months).pop()

    if (closestMonth) {
      return versions[closestMonth.toString()].image_url_1x
    }

    // If no suitable version found, return the lowest available
    const lowestMonth = availableMonths[0]
    if (lowestMonth) {
      return versions[lowestMonth.toString()].image_url_1x
    }

    return null
  }

  const value: BadgeContextType = {
    twitchBadges,
    getSubscriptionBadgeUrl,
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
