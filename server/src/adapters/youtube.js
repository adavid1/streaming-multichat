import { chromium } from 'playwright'

const LIVE_CHAT_POPUP_URL = (videoId) => `https://www.youtube.com/live_chat?is_popout=1&v=${videoId}`

export async function startYouTube({ videoId, retryWhenOffline = true, onMessage, debug = false }) {
  let browser, page, stopped = false

  async function openChat() {
    browser = await chromium.launch({ headless: true })
    page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'
    })
    await page.route('**/*', (route) => {
      // Allow everything; could block images for perf
      route.continue()
    })
    const url = LIVE_CHAT_POPUP_URL(videoId)
    if (debug) console.log('[youtube] opening', url)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  }

  async function isChatOffline() {
    // Detect common offline states
    const text = await page.textContent('body')
    return /chat is disabled|live chat is unavailable|waiting for|premieres|ended/i.test(text || '')
  }

  const seen = new Set()
  async function scrapeLoop() {
    while (!stopped) {
      try {
        // Query visible text message elements
        const items = await page.$$eval('yt-live-chat-text-message-renderer', nodes => nodes.map(n => {
          const authorEl = n.querySelector('#author-name')
          const messageEl = n.querySelector('#message')
          const timeEl = n.querySelector('#timestamp')
          const badgeEls = Array.from(n.querySelectorAll('yt-live-chat-author-badge-renderer[icon]'))
          const id = n.getAttribute('id') || `${authorEl?.textContent?.trim() || ''}-${messageEl?.textContent?.trim() || ''}-${timeEl?.textContent?.trim() || ''}`
          return {
            id,
            username: authorEl?.textContent?.trim() || 'unknown',
            message: messageEl?.textContent || '',
            time: timeEl?.textContent?.trim() || null,
            badges: badgeEls.map(b => b.getAttribute('icon')).filter(Boolean)
          }
        }))

        for (const it of items) {
          if (!it.message) continue
          if (seen.has(it.id)) continue
          seen.add(it.id)
          onMessage?.({
            username: it.username,
            message: it.message,
            badges: it.badges || [],
            raw: it
          })
        }

        // Scroll a bit to force rendering of new nodes
        await page.evaluate(() => {
          const scroller = document.querySelector('yt-live-chat-item-list-renderer #item-scroller') || document.scrollingElement
          if (scroller) scroller.scrollTop = scroller.scrollHeight
        })
      } catch (e) {
        if (debug) console.error('[youtube] loop error:', e.message)
        // If the page indicates offline or navigation issue, consider retry
        try {
          if (await isChatOffline()) {
            if (retryWhenOffline) {
              if (debug) console.log('[youtube] chat offline, retrying in 15s...')
              await new Promise(r => setTimeout(r, 15000))
              await page.reload({ waitUntil: 'domcontentloaded' })
              continue
            }
          }
        } catch {}
      }
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  await openChat()
  scrapeLoop().catch(() => {})

  return async function stop() {
    stopped = true
    try { await page?.close() } catch {}
    try { await browser?.close() } catch {}
    if (debug) console.log('[youtube] stopped')
  }
}
