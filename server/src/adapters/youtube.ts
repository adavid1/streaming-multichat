import { LiveChat } from 'youtube-chat';
import type { AdapterConfig, StopFunction, YouTubeConfig } from '../../../shared/types.js';

interface YouTubeAdapterConfig extends AdapterConfig, YouTubeConfig {}

export async function startYouTube({ 
  channelId,
  retryWhenOffline = true, 
  onMessage, 
  debug = false 
}: YouTubeAdapterConfig): Promise<StopFunction> {
  const chat = new LiveChat({ channelId });
  let stopped = false;

  chat.on('start', () => {
    console.log('[youtube] chat started for channel:', channelId);
  });

  chat.on('end', () => {
    if (!stopped && retryWhenOffline) {
      console.warn('[youtube] chat ended; will retry in 30s');
      setTimeout(() => {
        if (!stopped) void chat.start().catch((e: any) => console.error('[youtube] restart error:', e?.message || e));
      }, 30000);
    } else {
      console.warn('[youtube] chat ended');
    }
  });

  chat.on('error', (err: any) => {
    console.error('[youtube] chat error:', err?.message || err);
  });

  chat.on('chat', (msg: any) => {
    try {
      const text = Array.isArray(msg.message) ? msg.message.map((m: any) => m.text).join('') : (msg.message || '');
      onMessage({
        username: msg.author?.name || 'unknown',
        message: text,
        badges: (msg.author?.badges || []).map((b: any) => b.title).filter(Boolean),
        raw: msg
      });
    } catch (error) {
      if (debug) console.error('[youtube] message processing error:', (error as Error).message);
    }
  });

  try {
    const ok = await chat.start();
    if (!ok) throw new Error('youtube-chat failed to start');
    console.log('[youtube] connected to channel:', channelId);
  } catch (error) {
    console.error('[youtube] Failed to start:', (error as Error).message);
    throw error;
  }

  return async function stop(): Promise<void> {
    stopped = true;
    try {
      await chat.stop();
      console.log('[youtube] stopped');
    } catch (error) {
      if (debug) console.error('[youtube] stop error:', (error as Error).message);
    }
  };
}


