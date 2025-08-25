import { chromium, Browser, Page } from 'playwright';
import type { AdapterConfig, StopFunction, YouTubeConfig } from '../../../shared/types.js';

interface YouTubeAdapterConfig extends AdapterConfig, YouTubeConfig {}

interface ScrapedMessage {
  id: string;
  username: string;
  message: string;
  time: string | null;
  badges: string[];
}

const LIVE_CHAT_POPUP_URL = (videoId: string): string => 
  `https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`;

export async function startYouTube({ 
  videoId, 
  retryWhenOffline = true, 
  onMessage, 
  debug = false 
}: YouTubeAdapterConfig): Promise<StopFunction> {
  let browser: Browser | null = null;
  let page: Page | null = null;
  let stopped = false;

  async function openChat(): Promise<void> {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'
    });
    
    await page.route('**/*', (route) => {
      // Allow everything; could block images for performance
      route.continue();
    });
    
    const url = LIVE_CHAT_POPUP_URL(videoId);
    if (debug) console.log('[youtube] opening', url);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  }

  async function isChatOffline(): Promise<boolean> {
    if (!page) return true;
    
    try {
      const text = await page.textContent('body');
      return /chat is disabled|live chat is unavailable|waiting for|premieres|ended/i.test(text || '');
    } catch {
      return true;
    }
  }

  const seen = new Set<string>();
  
  async function scrapeLoop(): Promise<void> {
    while (!stopped && page) {
      try {
        // Query visible text message elements
        const items = await page.$$eval(
          'yt-live-chat-text-message-renderer', 
          (nodes: Element[]) => nodes.map((n: Element): ScrapedMessage => {
            const authorEl = n.querySelector('#author-name');
            const messageEl = n.querySelector('#message');
            const timeEl = n.querySelector('#timestamp');
            const badgeEls = Array.from(n.querySelectorAll('yt-live-chat-author-badge-renderer[icon]'));
            
            const username = authorEl?.textContent?.trim() || 'unknown';
            const message = messageEl?.textContent || '';
            const time = timeEl?.textContent?.trim() || null;
            
            const id = n.getAttribute('id') || `${username}-${message}-${time}`;
            
            return {
              id,
              username,
              message,
              time,
              badges: badgeEls.map((b: Element) => b.getAttribute('icon')).filter(Boolean) as string[]
            };
          })
        );

        for (const item of items) {
          if (!item.message || seen.has(item.id)) continue;
          
          seen.add(item.id);
          
          try {
            onMessage({
              username: item.username,
              message: item.message,
              badges: item.badges || [],
              raw: item
            });
          } catch (error) {
            if (debug) console.error('[youtube] message processing error:', (error as Error).message);
          }
        }

        // Scroll to force rendering of new nodes
        await page.evaluate(() => {
          const scroller = document.querySelector('yt-live-chat-item-list-renderer #item-scroller') as HTMLElement || 
                          document.scrollingElement;
          if (scroller) {
            scroller.scrollTop = scroller.scrollHeight;
          }
        });

      } catch (error) {
        if (debug) console.error('[youtube] loop error:', (error as Error).message);
        
        // If the page indicates offline or navigation issue, consider retry
        try {
          if (await isChatOffline()) {
            if (retryWhenOffline && !stopped) {
              if (debug) console.log('[youtube] chat offline, retrying in 15s...');
              await new Promise(resolve => setTimeout(resolve, 15000));
              if (!stopped && page) {
                await page.reload({ waitUntil: 'domcontentloaded' });
              }
              continue;
            } else {
              if (debug) console.log('[youtube] chat offline, stopping...');
              break;
            }
          }
        } catch (retryError) {
          if (debug) console.error('[youtube] retry error:', (retryError as Error).message);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  try {
    await openChat();
    scrapeLoop().catch((error) => {
      if (debug) console.error('[youtube] scrape loop error:', (error as Error).message);
    });
  } catch (error) {
    console.error('[youtube] initialization error:', (error as Error).message);
    throw error;
  }

  return async function stop(): Promise<void> {
    stopped = true;
    try {
      if (page) await page.close();
    } catch (error) {
      if (debug) console.error('[youtube] page close error:', (error as Error).message);
    }
    try {
      if (browser) await browser.close();
    } catch (error) {
      if (debug) console.error('[youtube] browser close error:', (error as Error).message);
    }
    if (debug) console.log('[youtube] stopped');
  };
}