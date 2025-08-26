import twitchGlobalBadges from '../../twitchGlobalBadges.json'

interface BadgeVersion {
  id: string
  image_url_1x: string
  image_url_2x: string
  image_url_4x: string
  title: string
  description: string
  click_action: string | null
  click_url: string | null
}

interface BadgeSet {
  set_id: string
  versions: BadgeVersion[]
}

interface TwitchBadgesData {
  data: BadgeSet[]
}

/**
 * Get badge URL from the global badges JSON file
 * @param setId - The badge set_id (e.g., 'moderator', 'vip', 'premium')
 * @param versionId - The version id (usually '1')
 * @param size - The size variant ('1x', '2x', '4x')
 * @returns The badge image URL or null if not found
 */
export const getBadgeUrl = (
  setId: string,
  versionId: string = '1',
  size: '1x' | '2x' | '4x' = '1x'
): string | null => {
  const badgesData = twitchGlobalBadges as TwitchBadgesData

  const badgeSet = badgesData.data.find((badge) => badge.set_id === setId)
  if (!badgeSet) return null

  const version = badgeSet.versions.find((v) => v.id === versionId)
  if (!version) return null

  switch (size) {
    case '1x':
      return version.image_url_1x
    case '2x':
      return version.image_url_2x
    case '4x':
      return version.image_url_4x
    default:
      return version.image_url_1x
  }
}

/**
 * Get badge info (title and description) from the global badges JSON file
 * @param setId - The badge set_id
 * @param versionId - The version id (usually '1')
 * @returns Badge info object or null if not found
 */
export const getBadgeInfo = (
  setId: string,
  versionId: string = '1'
): { title: string; description: string } | null => {
  const badgesData = twitchGlobalBadges as TwitchBadgesData

  const badgeSet = badgesData.data.find((badge) => badge.set_id === setId)
  if (!badgeSet) return null

  const version = badgeSet.versions.find((v) => v.id === versionId)
  if (!version) return null

  return {
    title: version.title,
    description: version.description,
  }
}
