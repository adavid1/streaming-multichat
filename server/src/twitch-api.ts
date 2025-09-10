import fetch from 'node-fetch';
import tmi from 'tmi.js';
import type { TwitchBadgeResponse } from '../../shared/types.js';

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

  try {
    // Step 1: Get broadcaster ID using Helix API first, fallback to TMI
    let broadcasterId = await getBroadcasterIdFromHelix(channel);
    
    if (!broadcasterId) {
      console.log(`[twitch-api] Helix API failed, trying TMI fallback for ${channel}`);
      broadcasterId = await getBroadcasterIdFromTMI(channel);
    }
    
    if (!broadcasterId) {
      console.error(`[twitch-api] Could not get broadcaster ID for ${channel}, using fallback`);
      return null;
    }

    // Step 2: Try to fetch channel-specific badges
    const channelBadges = await fetchChannelBadgesHelix(broadcasterId);
    
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
        
        return mergedBadges;
      }
    }

    // Step 4: If we got channel badges with subscriber data, return them
    if (channelBadges && channelBadges.badge_sets.subscriber) {
      console.log(`[twitch-api] Using channel-specific subscriber badges for ${channel}`);
      return channelBadges;
    }

  } catch (error) {
    console.error(`[twitch-api] Error in getTwitchBadgesPublic for ${channel}:`, (error as Error).message);
    return null;
  }
  
  // Default return if no other conditions are met
  return null;
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
