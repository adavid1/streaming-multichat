import type { TwitchBadgeResponse } from '../../shared/types.js'

interface HelixBadge {
  set_id: string
  versions: { id: string; image_url_1x: string; image_url_2x: string; image_url_4x: string }[]
}

interface Credentials {
  clientId: string
  token: string
}

let appToken: { value: string; expiresAt: number } | null = null

/**
 * Twitch Helix credentials, in order of preference:
 * 1. TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET: app access token, renewed automatically (recommended)
 * 2. TWITCH_CLIENT_ID + TWITCH_OAUTH: user token (expires, must be renewed by hand)
 */
async function getCredentials(): Promise<Credentials | null> {
  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId) return null

  if (clientSecret) {
    if (appToken && appToken.expiresAt > Date.now() + 60_000) {
      return { clientId, token: appToken.value }
    }
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    })
    if (!response.ok) throw new Error(`Twitch app token request failed: HTTP ${response.status}`)
    const data = (await response.json()) as { access_token: string; expires_in: number }
    appToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
    return { clientId, token: appToken.value }
  }

  const oauth = process.env.TWITCH_OAUTH
  if (oauth) return { clientId, token: oauth.replace(/^oauth:/, '') }
  return null
}

async function helix<T>(path: string, credentials: Credentials): Promise<T[]> {
  const response = await fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: { 'Client-ID': credentials.clientId, Authorization: `Bearer ${credentials.token}` },
  })
  // Revoked / rotated token: forget it so the next call requests a new one
  if (response.status === 401) appToken = null
  if (!response.ok) throw new Error(`Twitch API ${path} failed: HTTP ${response.status}`)
  const json = (await response.json()) as { data?: T[] }
  return json.data ?? []
}

function toBadgeSets(badges: HelixBadge[]): TwitchBadgeResponse['badge_sets'] {
  const sets: TwitchBadgeResponse['badge_sets'] = {}
  for (const badge of badges) {
    const versions: TwitchBadgeResponse['badge_sets'][string]['versions'] = {}
    for (const v of badge.versions ?? []) {
      versions[v.id] = {
        image_url_1x: v.image_url_1x,
        image_url_2x: v.image_url_2x || v.image_url_1x,
        image_url_4x: v.image_url_4x || v.image_url_2x || v.image_url_1x,
      }
    }
    sets[badge.set_id] = { versions }
  }
  return sets
}

/**
 * Global + channel-specific (subscriber, bits...) badges. Returns null when no
 * Twitch API credentials are configured: the client then falls back to the
 * bundled global badges.
 */
export async function getTwitchBadges(channel: string): Promise<TwitchBadgeResponse | null> {
  const credentials = await getCredentials()
  if (!credentials) {
    console.log('[twitch-api] No Twitch API credentials: using bundled global badges only')
    return null
  }

  const globalBadges = await helix<HelixBadge>('chat/badges/global', credentials)

  // Channel badges are a bonus: if they fail, keep the global ones
  let channelBadges: HelixBadge[] = []
  try {
    const [user] = await helix<{ id: string }>(
      `users?login=${encodeURIComponent(channel.toLowerCase())}`,
      credentials,
    )
    if (user) channelBadges = await helix<HelixBadge>(`chat/badges?broadcaster_id=${user.id}`, credentials)
  } catch (error) {
    console.warn('[twitch-api] Channel badges unavailable:', (error as Error).message)
  }

  // Channel badges take priority over global ones
  return { badge_sets: { ...toBadgeSets(globalBadges), ...toBadgeSets(channelBadges) } }
}
