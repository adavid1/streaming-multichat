import { LiveChat } from 'youtube-chat';
import type { AdapterConfig, StopFunction, YouTubeConfig } from '../../../shared/types.js';

interface YouTubeAdapterConfig extends AdapterConfig, YouTubeConfig {}

interface YouTubeAdapterReturn extends StopFunction {
  start: () => Promise<boolean>;
  stop: () => Promise<void>;
  isRunning: () => boolean;
  getStatus: () => 'stopped' | 'connecting' | 'connected' | 'error' | 'retrying';
}

export async function createYouTubeAdapter({ 
  channelId,
  onMessage, 
  debug = false,
  onStatusChange
}: YouTubeAdapterConfig & { onStatusChange?: (status: string, message?: string) => void }): Promise<YouTubeAdapterReturn> {
  let chat: LiveChat | null = null;
  let status: 'stopped' | 'connecting' | 'connected' | 'error' | 'retrying' = 'stopped';
  let retryCount = 0;
  let retryTimeout: NodeJS.Timeout | null = null;
  let consecutiveErrors = 0;
  
  const MAX_RETRY_ATTEMPTS = 10;
  const MAX_CONSECUTIVE_ERRORS = 15; // Stop after 15 consecutive 404s
  const RETRY_DELAY_BASE = 30000; // 30 seconds base delay
  const RETRY_DELAY_MAX = 300000; // 5 minutes max delay

  const updateStatus = (newStatus: typeof status, message?: string) => {
    if (status !== newStatus) {
      status = newStatus;
      onStatusChange?.(status, message);
      if (debug) console.log(`[youtube] Status changed to: ${status}${message ? ` - ${message}` : ''}`);
    }
  };

  const calculateRetryDelay = (attempt: number): number => {
    // Exponential backoff with jitter
    const delay = Math.min(RETRY_DELAY_BASE * Math.pow(1.5, attempt), RETRY_DELAY_MAX);
    const jitter = Math.random() * 0.3 * delay; // Add 30% jitter
    return Math.floor(delay + jitter);
  };

  const cleanup = () => {
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
    
    if (chat) {
      try {
        chat.stop();
      } catch (error) {
        if (debug) console.error('[youtube] Error during cleanup:', (error as Error).message);
      }
      chat = null;
    }
  };

  const start = async (): Promise<boolean> => {
    if (status === 'connecting' || status === 'connected') {
      if (debug) console.log('[youtube] Already connecting or connected');
      return status === 'connected';
    }

    cleanup(); // Clean up any existing connection
    
    updateStatus('connecting', `Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}`);
    
    try {
      chat = new LiveChat({ channelId });
      
      chat.on('start', () => {
        consecutiveErrors = 0; // Reset error counter on successful start
        retryCount = 0; // Reset retry counter on successful connection
        updateStatus('connected', `Connected to channel: ${channelId}`);
        console.log('[youtube] Chat started successfully for channel:', channelId);
      });

      chat.on('end', () => {
        if (status === 'stopped') return; // Intentionally stopped
        
        console.log('[youtube] Chat ended - stream likely finished');
        updateStatus('stopped', 'Stream ended');
        
        // Don't auto-retry when stream ends normally
        if (consecutiveErrors < 5) {
          scheduleRetry('Stream ended, will retry when stream starts again');
        }
      });

      chat.on('error', (err: any) => {
        consecutiveErrors++;
        const errorMessage = err?.message || 'Unknown error';
        const isNotFoundError = errorMessage.includes('404') || errorMessage.includes('Request failed with status code 404');
        
        if (debug || !isNotFoundError) {
          console.error(`[youtube] Chat error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, errorMessage);
        }
        
        // If we get too many consecutive 404 errors, stop trying
        if (isNotFoundError && consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error(`[youtube] Too many consecutive errors (${consecutiveErrors}), stopping auto-retry`);
          updateStatus('error', `Stream not found after ${consecutiveErrors} attempts`);
          cleanup();
          return;
        }
        
        if (status !== 'stopped') {
          updateStatus('retrying', `Error: ${errorMessage}`);
          scheduleRetry(errorMessage);
        } else {
          updateStatus('error', errorMessage);
        }
      });

      chat.on('chat', (msg: any) => {
        try {
          const text = Array.isArray(msg.message) 
            ? msg.message.map((m: any) => m.text).join('') 
            : (msg.message || '');
            
          onMessage({
            username: msg.author?.name || 'unknown',
            message: text,
            badges: (msg.author?.badges || []).map((b: any) => b.title).filter(Boolean),
            raw: msg
          });
        } catch (error) {
          if (debug) console.error('[youtube] Message processing error:', (error as Error).message);
        }
      });

      const success = await chat.start();
      
      if (!success) {
        throw new Error('Failed to start YouTube chat - stream may be offline');
      }
      
      return true;
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      consecutiveErrors++;
      
      if (debug) {
        console.error(`[youtube] Start failed (attempt ${retryCount + 1}):`, errorMessage);
      }
      
      if (retryCount < MAX_RETRY_ATTEMPTS && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
        updateStatus('retrying', errorMessage);
        scheduleRetry(errorMessage);
      } else {
        updateStatus('error', `Failed after ${retryCount} attempts: ${errorMessage}`);
      }
      
      return false;
    }
  };

  const scheduleRetry = (reason: string) => {
    if (retryTimeout) return; // Already scheduled
    
    const delay = calculateRetryDelay(retryCount);
    retryCount = Math.min(retryCount + 1, MAX_RETRY_ATTEMPTS);
    
    if (debug) {
      console.log(`[youtube] Scheduling retry in ${Math.round(delay / 1000)}s (reason: ${reason})`);
    }
    
    retryTimeout = setTimeout(async () => {
      retryTimeout = null;
      if (status !== 'stopped') {
        await start();
      }
    }, delay);
  };

  const stop = async (): Promise<void> => {
    updateStatus('stopped', 'Manually stopped');
    cleanup();
    retryCount = 0;
    consecutiveErrors = 0;
    console.log('[youtube] YouTube adapter stopped');
  };

  const isRunning = (): boolean => {
    return status === 'connected' || status === 'connecting';
  };

  const getStatus = () => status;

  // Return the controller object that also acts as a stop function
  const controller = Object.assign(stop, {
    start,
    stop,
    isRunning,
    getStatus
  });

  return controller;
}

// Legacy function for backward compatibility
export async function startYouTube(config: YouTubeAdapterConfig): Promise<StopFunction> {
  const adapter = await createYouTubeAdapter(config);
  
  // Auto-start the adapter
  try {
    await adapter.start();
  } catch (error) {
    console.error('[youtube] Auto-start failed:', (error as Error).message);
  }
  
  return adapter.stop;
}