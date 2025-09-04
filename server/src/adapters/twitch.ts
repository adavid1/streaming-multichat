import tmi from 'tmi.js';
import type { AdapterConfig, StopFunction, TwitchConfig } from '../../../shared/types.js';

interface TwitchAdapterConfig extends AdapterConfig, TwitchConfig {
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error', message?: string) => void;
}

export async function startTwitch({ 
  channel,
  onMessage, 
  onStatusChange,
  debug = false 
}: TwitchAdapterConfig): Promise<StopFunction> {
  // tmi.js expects channel names without a leading '#'
  const normalizedChannel = channel.startsWith('#') ? channel.slice(1) : channel;
  const client = new tmi.Client({
    options: { debug },
    channels: [normalizedChannel]
  });

  // Notify connecting status
  onStatusChange?.('connecting', `Connecting to #${normalizedChannel}`);

  client.on('message', (channel: string, tags: any, message: string, self: boolean) => {
    if (self) return;
    
    try {
      // Extract subscription months from badges with multiple methods
      let subscriptionMonths: number | null = null;
      
      // Method 1: From tags.badges.subscriber (most reliable)
      if (tags.badges && tags.badges.subscriber) {
        const months = parseInt(tags.badges.subscriber, 10);
        if (!isNaN(months)) {
          subscriptionMonths = months;
        }
      }
      
      // Method 2: From badge-info (newer TMI.js versions)
      if (!subscriptionMonths && tags['badge-info'] && tags['badge-info'].subscriber) {
        const months = parseInt(tags['badge-info'].subscriber, 10);
        if (!isNaN(months)) {
          subscriptionMonths = months;
        }
      }
      
      // Method 3: From subscriber tag (legacy)
      if (!subscriptionMonths && tags.subscriber === '1' && !subscriptionMonths) {
        // Default to 1 month if we know they're a subscriber but don't have months
        subscriptionMonths = 1;
      }

      if (debug && subscriptionMonths) {
        console.log(`[twitch] User ${tags['display-name']} has ${subscriptionMonths} month subscription badge`);
      }

      // Get all badge types
      const badgeList = tags.badges ? Object.keys(tags.badges) : [];

      onMessage({
        username: tags['display-name'] || tags.username || 'unknown',
        message,
        badges: badgeList,
        color: tags.color || null,
        raw: { 
          channel, 
          tags,
          badges: tags.badges, // Include raw badges object
          subscriptionMonths // Include subscription months in raw data
        }
      });
    } catch (error) {
      if (debug) console.error('[twitch] message processing error:', (error as Error).message);
    }
  });

  client.on('connected', (addr: string, port: number) => {
    if (debug) console.log(`[twitch] connected to ${addr}:${port}`);
    onStatusChange?.('connected', `Connected to #${normalizedChannel}`);
  });

  client.on('disconnected', (reason: string) => {
    if (debug) console.log(`[twitch] disconnected: ${reason}`);
    onStatusChange?.('disconnected', `Disconnected: ${reason}`);
  });

  client.on('connecting', (address: string, port: number) => {
    if (debug) console.log(`[twitch] connecting to ${address}:${port}`);
    onStatusChange?.('connecting', `Connecting to ${address}:${port}`);
  });

  client.on('reconnect', () => {
    if (debug) console.log(`[twitch] reconnecting...`);
    onStatusChange?.('connecting', 'Reconnecting to Twitch...');
  });

  // Handle connection errors
  client.on('error', (err: Error) => {
    console.error('[twitch] connection error:', err.message);
    onStatusChange?.('error', `Connection error: ${err.message}`);
  });

  try {
    await client.connect();
    if (debug) console.log('[twitch] connected to channel:', `#${normalizedChannel}`);
  } catch (error) {
    console.error('[twitch] failed to connect:', (error as Error).message);
    onStatusChange?.('error', `Failed to connect: ${(error as Error).message}`);
    throw error;
  }

  return async function stop(): Promise<void> {
    try {
      await client.disconnect();
      if (debug) console.log('[twitch] disconnected');
      onStatusChange?.('disconnected', 'Manually disconnected');
    } catch (error) {
      if (debug) console.error('[twitch] disconnect error:', (error as Error).message);
      onStatusChange?.('error', `Disconnect error: ${(error as Error).message}`);
    }
  };
}