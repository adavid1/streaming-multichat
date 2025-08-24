import tmi from 'tmi.js'

export async function startTwitch({ username, oauth, channels, onMessage, debug = false }) {
  const client = new tmi.Client({
    options: { debug },
    identity: { username, password: oauth },
    channels
  })

  client.on('message', (channel, tags, message, self) => {
    if (self) return
    onMessage?.({
      username: tags['display-name'] || tags.username,
      message,
      badges: Object.keys(tags.badges || {}),
      color: tags.color || null,
      avatar: null,
      raw: { channel, tags }
    })
  })

  await client.connect()
  if (debug) console.log('[twitch] connected to', channels)

  return async function stop() {
    try { await client.disconnect() } catch {}
    if (debug) console.log('[twitch] disconnected')
  }
}
