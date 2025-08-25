import tmi from 'tmi.js';
import type { AdapterConfig, StopFunction, TwitchConfig } from '../../../shared/types.js';

interface TwitchAdapterConfig extends AdapterConfig, TwitchConfig {}

export async function startTwitch({ 
  channel,
  onMessage, 
  debug = false 
}: TwitchAdapterConfig): Promise<StopFunction> {
  const normalizedChannel = channel.startsWith('#') ? channel : `#${channel}`;
  const client = new tmi.Client({
    options: { debug },
    channels: [normalizedChannel]
  });

  client.on('message', (channel: string, tags: any, message: string, self: boolean) => {
    if (self) return;
    
    try {
      onMessage({
        username: tags['display-name'] || tags.username || 'unknown',
        message,
        badges: Object.keys(tags.badges || {}),
        color: tags.color || null,
        raw: { channel, tags }
      });
    } catch (error) {
      if (debug) console.error('[twitch] message processing error:', (error as Error).message);
    }
  });

  client.on('connected', (addr: string, port: number) => {
    if (debug) console.log(`[twitch] connected to ${addr}:${port}`);
  });

  client.on('disconnected', (reason: string) => {
    if (debug) console.log(`[twitch] disconnected: ${reason}`);
  });

  await client.connect();
  if (debug) console.log('[twitch] connected to channel:', normalizedChannel);

  return async function stop(): Promise<void> {
    try {
      await client.disconnect();
      if (debug) console.log('[twitch] disconnected');
    } catch (error) {
      if (debug) console.error('[twitch] disconnect error:', (error as Error).message);
    }
  };
}