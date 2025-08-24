import { WebcastPushConnection } from 'tiktok-live-connector'

export async function startTikTok({ username, onMessage, debug = false }) {
  const conn = new WebcastPushConnection(username)

  conn.on('chat', data => {
    onMessage?.({
      username: data?.nickname || data?.uniqueId || 'unknown',
      message: data?.comment || '',
      badges: [],
      avatar: data?.profilePictureUrl || null,
      raw: data
    })
  })

  conn.on('gift', data => {
    const text = `${data.uniqueId} sent ${data.gift?.name || 'a gift'} x${data.repeatCount || 1}`
    onMessage?.({ username: data.uniqueId, message: text, badges: ['gift'], raw: data })
  })

  try {
    const state = await conn.connect()
    if (debug) console.log('[tiktok] connected, viewerCount:', state?.roomInfo?.viewerCount)
  } catch (e) {
    console.error('[tiktok] connect error:', e.message)
  }

  return async function stop() {
    try { conn.disconnect() } catch {}
    if (debug) console.log('[tiktok] disconnected')
  }
}
