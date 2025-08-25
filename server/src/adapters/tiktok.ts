import { WebcastPushConnection } from 'tiktok-live-connector';
import type { AdapterConfig, StopFunction, TikTokConfig } from '../../../shared/types.js';

interface TikTokAdapterConfig extends AdapterConfig, TikTokConfig {}

interface TikTokChatData {
  nickname?: string;
  uniqueId?: string;
  comment?: string;
  profilePictureUrl?: string;
  [key: string]: any;
}

interface TikTokGiftData {
  uniqueId?: string;
  gift?: {
    name?: string;
  };
  repeatCount?: number;
  [key: string]: any;
}

export async function startTikTok({ 
  username, 
  onMessage, 
  debug = false 
}: TikTokAdapterConfig): Promise<StopFunction> {
  const conn = new WebcastPushConnection(username);

  conn.on('chat', (data: TikTokChatData) => {
    try {
      onMessage({
        username: data?.nickname || data?.uniqueId || 'unknown',
        message: data?.comment || '',
        badges: [],
        raw: data
      });
    } catch (error) {
      if (debug) console.error('[tiktok] chat processing error:', (error as Error).message);
    }
  });

  conn.on('gift', (data: TikTokGiftData) => {
    try {
      const text = `${data.uniqueId || 'Someone'} sent ${data.gift?.name || 'a gift'} x${data.repeatCount || 1}`;
      onMessage({ 
        username: data.uniqueId || 'unknown', 
        message: text, 
        badges: ['gift'], 
        raw: data 
      });
    } catch (error) {
      if (debug) console.error('[tiktok] gift processing error:', (error as Error).message);
    }
  });

  conn.on('connected', (state: any) => {
    if (debug) console.log('[tiktok] connected, viewerCount:', state?.roomInfo?.viewerCount);
  });

  conn.on('disconnected', () => {
    if (debug) console.log('[tiktok] disconnected');
  });

  try {
    const state = await conn.connect();
    if (debug) console.log('[tiktok] connection established');
  } catch (error) {
    console.error('[tiktok] connect error:', (error as Error).message);
    throw error;
  }

  return async function stop(): Promise<void> {
    try {
      conn.disconnect();
      if (debug) console.log('[tiktok] disconnected');
    } catch (error) {
      if (debug) console.error('[tiktok] disconnect error:', (error as Error).message);
    }
  };
}