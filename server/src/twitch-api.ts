import fetch from 'node-fetch';
import tmi from 'tmi.js';
import type { TwitchBadgeResponse } from '../../shared/types.js';

const default_subscription_badge = 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1'

// Fallback subscription badge URLs (common Twitch subscription badges)
const FALLBACK_SUBSCRIPTION_BADGES: Record<string, string> = {
  '1': 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/1',
  '2': 'https://static-cdn.jtvnw.net/badges/v1/25a03e36-2bb2-4625-bd37-d6d9d406238d/1',
  '3': 'https://static-cdn.jtvnw.net/badges/v1/e8984705-d091-4e54-8241-e53b30a84b0e/1',
  '6': 'https://static-cdn.jtvnw.net/badges/v1/2d2485f6-d19b-4daa-8393-9493b019156b/1',
  '9': 'https://static-cdn.jtvnw.net/badges/v1/b4e6b13a-a76f-4c56-87e1-9375a7aaa610/1',
  '12': 'https://static-cdn.jtvnw.net/badges/v1/ed51a614-2c44-4a60-80b6-62908436b43a/1',
  '18': default_subscription_badge,
  '24': default_subscription_badge,
  '36': default_subscription_badge,
  '48': default_subscription_badge,
  '60': default_subscription_badge
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

export async function getTwitchBadgesPublic(channel: string): Promise<TwitchBadgeResponse | null> {
  return new Promise((resolve) => {
    const client = new tmi.Client({
      channels: [channel]
    });

    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.disconnect();
        console.error(`[twitch-api] Timeout getting badges for channel: ${channel}`);
        resolve(null);
      }
    }, 10000); // 10 second timeout

    client.on('roomstate', async (channelName: string, state: any) => {
      if (resolved) return;
      
      const userId = state['room-id'];
      if (!userId) {
        console.error(`[twitch-api] No room ID found for channel: ${channel}`);
        clearTimeout(timeout);
        resolved = true;
        client.disconnect();
        resolve(null);
        return;
      }

      try {
        console.log(`[twitch-api] Getting badges for broadcaster ID: ${userId}`);
        
        // Check if we have manual custom badges for this channel
        if (CUSTOM_CHANNEL_BADGES[channel]) {
          console.log(`[twitch-api] Using manual custom badges for ${channel}`);
          const customData: TwitchBadgeResponse = {
            badge_sets: {
              subscriber: {
                versions: Object.entries(CUSTOM_CHANNEL_BADGES[channel]).reduce((acc, [months, url]) => {
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
          clearTimeout(timeout);
          resolved = true;
          client.disconnect();
          resolve(customData);
          return;
        }
        
        // Try to get channel-specific badges first (these contain custom subscription badges)
        try {
          const channelBadgeUrl = `https://badges.twitch.tv/v1/badges/channels/${userId}/display`;
          console.log(`[twitch-api] Fetching channel badges from: ${channelBadgeUrl}`);
          
          const channelResponse = await fetch(channelBadgeUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json'
            }
          });
          
          if (channelResponse.ok) {
            const channelData: TwitchBadgeResponse = await channelResponse.json();
            console.log(`[twitch-api] Successfully fetched channel badges for ${channel}`);
            
            // Check if channel has custom subscription badges
            if (channelData.badge_sets.subscriber) {
              console.log(`[twitch-api] Channel has custom subscription badges`);
              clearTimeout(timeout);
              resolved = true;
              client.disconnect();
              resolve(channelData);
              return;
            }
          }
        } catch (channelError) {
          console.log(`[twitch-api] Channel badges not available, trying global badges`);
        }
        
        // If no channel-specific badges or no custom subscription badges, try global badges
        try {
          const globalBadgeUrl = 'https://badges.twitch.tv/v1/badges/global/display';
          console.log(`[twitch-api] Fetching global badges from: ${globalBadgeUrl}`);
          
          const response = await fetch(globalBadgeUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const globalData: TwitchBadgeResponse = await response.json();
            console.log(`[twitch-api] Successfully fetched global badges for ${channel}`);
            clearTimeout(timeout);
            resolved = true;
            client.disconnect();
            resolve(globalData);
            return;
          }
        } catch (globalError) {
          console.log(`[twitch-api] Global badges not available, using fallback`);
        }
        
        // Use fallback badges when APIs are not accessible
        console.error('[twitch-api] Both channel and global badge APIs failed, using fallback');
        
        const fallbackData: TwitchBadgeResponse = {
          badge_sets: {
            subscriber: {
              versions: Object.entries(FALLBACK_SUBSCRIPTION_BADGES).reduce((acc, [months, url]) => {
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
        
        console.log(`[twitch-api] Using fallback subscription badges for ${channel}`);
        clearTimeout(timeout);
        resolved = true;
        client.disconnect();
        resolve(fallbackData);
        
      } catch (error: any) {
        console.error('[twitch-api] Error getting badges from API, using fallback:', (error as Error).message);
        
        // Use fallback badges when API is not accessible
        const fallbackData: TwitchBadgeResponse = {
          badge_sets: {
            subscriber: {
              versions: Object.entries(FALLBACK_SUBSCRIPTION_BADGES).reduce((acc, [months, url]) => {
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
        
        console.log(`[twitch-api] Using fallback subscription badges for ${channel}`);
        clearTimeout(timeout);
        resolved = true;
        client.disconnect();
        resolve(fallbackData);
      }
    });

    client.on('disconnected', () => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        console.error(`[twitch-api] Disconnected before getting room state for: ${channel}`);
        resolve(null);
      }
    });

    client.connect().catch((error: any) => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        console.error(`[twitch-api] Failed to connect to get badges:`, (error as Error).message);
        resolve(null);
      }
    });
  });
}

// Helper function to extract subscription badge URLs from the response
export function extractSubscriptionBadges(badgeData: TwitchBadgeResponse): Record<string, string> {
  const subscriptionBadges: Record<string, string> = {};
  
  if (badgeData.badge_sets.subscriber) {
    const versions = badgeData.badge_sets.subscriber.versions;
    Object.keys(versions).forEach(version => {
      // Version is typically the number of months (1, 3, 6, 9, 12, etc.)
      subscriptionBadges[version] = versions[version].image_url_1x;
    });
  }
  
  return subscriptionBadges;
}

// Helper function to add custom badges for a channel
export function addCustomChannelBadges(channel: string, badges: Record<string, string>): void {
  CUSTOM_CHANNEL_BADGES[channel] = badges;
  console.log(`[twitch-api] Added custom badges for channel: ${channel}`);
}
