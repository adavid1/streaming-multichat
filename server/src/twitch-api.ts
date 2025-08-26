import fetch from 'node-fetch';
import tmi from 'tmi.js';
import type { TwitchBadgeResponse } from '../../shared/types.js';

const default_subscription_badge = 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1'

// Fallback subscription badge URLs (common Twitch subscription badges)
const FALLBACK_SUBSCRIPTION_BADGES: Record<string, string> = {
  '0': 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1', // Default subscriber badge
  '1': 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1',
  '2': 'https://static-cdn.jtvnw.net/badges/v1/25a03e36-2bb2-4625-bd37-d6d9d406238d/1',
  '3': 'https://static-cdn.jtvnw.net/badges/v1/e8984705-d091-4e54-8241-e53b30a84b0e/1',
  '6': 'https://static-cdn.jtvnw.net/badges/v1/2d2485f6-d19b-4daa-8393-9493b019156b/1',
  '9': 'https://static-cdn.jtvnw.net/badges/v1/b4e6b13a-a76f-4c56-87e1-9375a7aaa610/1',
  '12': 'https://static-cdn.jtvnw.net/badges/v1/ed51a614-2c44-4a60-80b6-62908436b43a/1',
  '18': default_subscription_badge,
  '24': default_subscription_badge,
  '30': default_subscription_badge,
  '36': default_subscription_badge,
  '42': default_subscription_badge,
  '48': default_subscription_badge,
  '54': default_subscription_badge,
  '60': default_subscription_badge,
  '66': default_subscription_badge,
  '72': default_subscription_badge
};

// Manual configuration for custom subscription badges (can be extended)
const CUSTOM_CHANNEL_BADGES: Record<string, Record<string, string>> = {
  // Example: Add custom badges for specific channels
  // 'channelname': {
  //   '1': 'https://custom-badge-url-for-1-month.png',
  //   '3': 'https://custom-badge-url-for-3-months.png',
  //   // ... etc
  // }
};

// Cache for channel user IDs to avoid repeated lookups
const channelIdCache = new Map<string, string>();

/**
 * Get broadcaster ID for a channel using Twitch Helix API with OAuth
 */
async function getBroadcasterIdFromHelix(channel: string): Promise<string | null> {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID || 'kimne78kx3ncx6brgo4mv6wki5h1ko';
    const oauthToken = process.env.TWITCH_OAUTH;
    
    if (!oauthToken) {
      console.error('[twitch-api] TWITCH_OAUTH environment variable is required');
      return null;
    }
    
    const url = `https://api.twitch.tv/helix/users?login=${channel.toLowerCase()}`;
    
    console.log(`[twitch-api] Fetching broadcaster ID for ${channel}`);
    
    const response = await fetch(url, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${oauthToken.replace('oauth:', '')}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[twitch-api] Failed to get broadcaster ID: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as any;
    
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.error(`[twitch-api] No user found for channel: ${channel}`);
      return null;
    }

    const broadcasterId = data.data[0].id;
    channelIdCache.set(channel, broadcasterId);
    console.log(`[twitch-api] Got broadcaster ID for ${channel}: ${broadcasterId}`);
    
    return broadcasterId;
  } catch (error) {
    console.error(`[twitch-api] Error getting broadcaster ID for ${channel}:`, (error as Error).message);
    return null;
  }
}

/**
 * Get broadcaster ID for a channel using TMI.js (fallback method)
 */
async function getBroadcasterIdFromTMI(channel: string): Promise<string | null> {
  // Check cache first
  if (channelIdCache.has(channel)) {
    return channelIdCache.get(channel)!;
  }

  return new Promise((resolve) => {
    const client = new tmi.Client({
      channels: [channel]
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.disconnect();
        console.error(`[twitch-api] Timeout getting broadcaster ID for: ${channel}`);
        resolve(null);
      }
    }, 10000);

    client.on('roomstate', (channelName: string, state: any) => {
      if (resolved) return;
      
      const userId = state['room-id'];
      if (userId) {
        // Cache the result
        channelIdCache.set(channel, userId);
        console.log(`[twitch-api] Got broadcaster ID for ${channel}: ${userId}`);
        clearTimeout(timeout);
        resolved = true;
        client.disconnect();
        resolve(userId);
      }
    });

    client.on('disconnected', () => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        resolve(null);
      }
    });

    client.connect().catch(() => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        resolve(null);
      }
    });
  });
}

/**
 * Fetch channel badges using the modern Twitch Helix API with OAuth
 */
async function fetchChannelBadgesHelix(broadcasterId: string): Promise<TwitchBadgeResponse | null> {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID || 'kimne78kx3ncx6brgo4mv6wki5h1ko';
    const oauthToken = process.env.TWITCH_OAUTH;
    
    if (!oauthToken) {
      console.error('[twitch-api] TWITCH_OAUTH environment variable is required for badge fetching');
      return null;
    }
    
    const url = `https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcasterId}`;
    
    console.log(`[twitch-api] Fetching channel badges from Helix API: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${oauthToken.replace('oauth:', '')}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`[twitch-api] Helix API returned ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json() as any;
    
    if (!data.data || !Array.isArray(data.data)) {
      console.log('[twitch-api] Invalid response format from Helix API');
      return null;
    }

    // Convert Helix format to our expected format
    const badgeResponse: TwitchBadgeResponse = {
      badge_sets: {}
    };

    for (const badge of data.data) {
      if (!badge.set_id || !badge.versions) continue;
      
      const versions: Record<string, { image_url_1x: string; image_url_2x: string; image_url_4x: string }> = {};
      
      for (const version of badge.versions) {
        if (!version.id) continue;
        versions[version.id] = {
          image_url_1x: version.image_url_1x || version.image_url_2x || version.image_url_4x,
          image_url_2x: version.image_url_2x || version.image_url_1x || version.image_url_4x,
          image_url_4x: version.image_url_4x || version.image_url_2x || version.image_url_1x
        };
      }
      
      badgeResponse.badge_sets[badge.set_id] = { versions };
    }

    console.log(`[twitch-api] Successfully parsed ${Object.keys(badgeResponse.badge_sets).length} badge sets from Helix`);
    return badgeResponse;

  } catch (error) {
    console.error('[twitch-api] Error fetching from Helix API:', (error as Error).message);
    return null;
  }
}

/**
 * Fetch global badges using Helix API with OAuth
 */
async function fetchGlobalBadgesHelix(): Promise<TwitchBadgeResponse | null> {
  try {
    const clientId = process.env.TWITCH_CLIENT_ID || 'kimne78kx3ncx6brgo4mv6wki5h1ko';
    const oauthToken = process.env.TWITCH_OAUTH;
    
    if (!oauthToken) {
      console.error('[twitch-api] TWITCH_OAUTH environment variable is required for badge fetching');
      return null;
    }
    
    const url = 'https://api.twitch.tv/helix/chat/badges/global';
    
    console.log(`[twitch-api] Fetching global badges from Helix API`);
    
    const response = await fetch(url, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${oauthToken.replace('oauth:', '')}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.log(`[twitch-api] Global badges Helix API returned ${response.status}`);
      return null;
    }

    const data = await response.json() as any;
    
    if (!data.data || !Array.isArray(data.data)) {
      return null;
    }

    // Convert to our format
    const badgeResponse: TwitchBadgeResponse = {
      badge_sets: {}
    };

    for (const badge of data.data) {
      if (!badge.set_id || !badge.versions) continue;
      
      const versions: Record<string, { image_url_1x: string; image_url_2x: string; image_url_4x: string }> = {};
      
      for (const version of badge.versions) {
        if (!version.id) continue;
        versions[version.id] = {
          image_url_1x: version.image_url_1x || version.image_url_2x || version.image_url_4x,
          image_url_2x: version.image_url_2x || version.image_url_1x || version.image_url_4x,
          image_url_4x: version.image_url_4x || version.image_url_2x || version.image_url_1x
        };
      }
      
      badgeResponse.badge_sets[badge.set_id] = { versions };
    }

    return badgeResponse;

  } catch (error) {
    console.error('[twitch-api] Error fetching global badges:', (error as Error).message);
    return null;
  }
}

/**
 * Main function to get Twitch badges for a channel
 */
export async function getTwitchBadgesPublic(channel: string): Promise<TwitchBadgeResponse | null> {
  console.log(`[twitch-api] Getting badges for channel: ${channel}`);
  
  // Check if we have manual custom badges for this channel first
  if (CUSTOM_CHANNEL_BADGES[channel.toLowerCase()]) {
    console.log(`[twitch-api] Using manual custom badges for ${channel}`);
    const customData: TwitchBadgeResponse = {
      badge_sets: {
        subscriber: {
          versions: Object.entries(CUSTOM_CHANNEL_BADGES[channel.toLowerCase()]).reduce((acc, [months, url]) => {
            acc[months] = {
              image_url_1x: url,
              image_url_2x: url,
              image_url_4x: url
            };
            return acc;
          }, {} as Record<string, { image_url_1x: string; image_url_2x: string; image_url_4x: string }>)
        }
      }
    };
    return customData;
  }

  try {
    // Step 1: Get broadcaster ID using Helix API first, fallback to TMI
    let broadcasterId = await getBroadcasterIdFromHelix(channel);
    
    if (!broadcasterId) {
      console.log(`[twitch-api] Helix API failed, trying TMI fallback for ${channel}`);
      broadcasterId = await getBroadcasterIdFromTMI(channel);
    }
    
    if (!broadcasterId) {
      console.error(`[twitch-api] Could not get broadcaster ID for ${channel}, using fallback`);
      return createFallbackBadgeResponse();
    }

    // Step 2: Try to fetch channel-specific badges
    let channelBadges = await fetchChannelBadgesHelix(broadcasterId);
    
    // Step 3: If channel badges failed or don't contain subscriber badges, try global + merge
    if (!channelBadges || !channelBadges.badge_sets.subscriber) {
      console.log(`[twitch-api] No channel subscriber badges found, fetching global badges`);
      
      const globalBadges = await fetchGlobalBadgesHelix();
      
      if (globalBadges) {
        // Merge channel badges with global badges (channel takes priority)
        const mergedBadges: TwitchBadgeResponse = {
          badge_sets: { ...globalBadges.badge_sets }
        };
        
        if (channelBadges) {
          // Merge channel badges on top of global badges
          Object.assign(mergedBadges.badge_sets, channelBadges.badge_sets);
        }
        
        // If still no subscriber badges, add fallback
        if (!mergedBadges.badge_sets.subscriber) {
          mergedBadges.badge_sets.subscriber = createFallbackSubscriberBadgeSet();
        }
        
        return mergedBadges;
      }
    }

    // Step 4: If we got channel badges with subscriber data, return them
    if (channelBadges && channelBadges.badge_sets.subscriber) {
      console.log(`[twitch-api] Using channel-specific subscriber badges for ${channel}`);
      return channelBadges;
    }

    // Step 5: Last resort - use fallback
    console.log(`[twitch-api] All API methods failed, using fallback badges for ${channel}`);
    return createFallbackBadgeResponse();

  } catch (error) {
    console.error(`[twitch-api] Error in getTwitchBadgesPublic for ${channel}:`, (error as Error).message);
    return createFallbackBadgeResponse();
  }
}

/**
 * Create fallback badge response
 */
function createFallbackBadgeResponse(): TwitchBadgeResponse {
  return {
    badge_sets: {
      subscriber: createFallbackSubscriberBadgeSet()
    }
  };
}

/**
 * Create fallback subscriber badge set
 */
function createFallbackSubscriberBadgeSet() {
  return {
    versions: Object.entries(FALLBACK_SUBSCRIPTION_BADGES).reduce((acc, [months, url]) => {
      acc[months] = {
        image_url_1x: url,
        image_url_2x: url,
        image_url_4x: url
      };
      return acc;
    }, {} as Record<string, { image_url_1x: string; image_url_2x: string; image_url_4x: string }>)
  };
}

// Helper function to extract subscription badge URLs from the response
export function extractSubscriptionBadges(badgeData: TwitchBadgeResponse): Record<string, string> {
  const subscriptionBadges: Record<string, string> = {};
  
  if (badgeData.badge_sets.subscriber) {
    const versions = badgeData.badge_sets.subscriber.versions;
    Object.keys(versions).forEach(version => {
      // Version is typically the number of months (0, 1, 3, 6, 9, 12, etc.)
      subscriptionBadges[version] = versions[version].image_url_1x;
    });
  }
  
  return subscriptionBadges;
}

// Helper function to add custom badges for a channel
export function addCustomChannelBadges(channel: string, badges: Record<string, string>): void {
  CUSTOM_CHANNEL_BADGES[channel.toLowerCase()] = badges;
  console.log(`[twitch-api] Added custom badges for channel: ${channel}`);
}