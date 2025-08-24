import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import { v4 as uuidv4 } from 'uuid'

import { startTwitch } from './adapters/twitch.js'
import { startTikTok } from './adapters/tiktok.js'
import { startYouTube } from './adapters/youtube.js'

const PORT = parseInt(process.env.PORT || '8787', 10)
const DEBUG = (process.env.DEBUG || 'false').toLowerCase() === 'true'

// --- Minimal Express (health + static overlay proxy if needed) ---
const app = express()
app.use(cors())
app.get('/health', (_req, res) => res.json({ ok: true }))

const server = http.createServer(app)

// --- WebSocket server broadcasting unified chat messages ---
const wss = new WebSocketServer({ server })

function broadcast(msg) {
  const data = typeof msg === 'string' ? msg : JSON.stringify(msg)
  for (const client of wss.clients) {
    try {
      client.send(data)
    } catch (e) {
      if (DEBUG) console.error('WS send error:', e.message)
    }
  }
}

// Normalize incoming events to a common shape
function normalize({ platform, username, message, badges = [], color, avatar, raw = {} }) {
  return {
    id: uuidv4(),
    ts: Date.now(),
    platform,
    username,
    message,
    badges,
    color: color || null,
    avatar: avatar || null,
    raw
  }
}

// Start adapters
const stopFns = []

// Twitch
if (process.env.TWITCH_USERNAME && process.env.TWITCH_OAUTH && process.env.TWITCH_CHANNELS) {
  stopFns.push(
    await startTwitch({
      username: process.env.TWITCH_USERNAME,
      oauth: process.env.TWITCH_OAUTH,
      channels: process.env.TWITCH_CHANNELS.split(',').map(s => s.trim()).filter(Boolean),
      onMessage(evt) {
        broadcast(normalize({ platform: 'twitch', ...evt }))
      },
      debug: DEBUG
    })
  )
} else {
  if (DEBUG) console.log('[twitch] skipped (missing env)')
}

// TikTok
if (process.env.TIKTOK_USERNAME) {
  stopFns.push(
    await startTikTok({
      username: process.env.TIKTOK_USERNAME,
      onMessage(evt) {
        broadcast(normalize({ platform: 'tiktok', ...evt }))
      },
      debug: DEBUG
    })
  )
} else {
  if (DEBUG) console.log('[tiktok] skipped (missing env)')
}

// YouTube (Playwright-based reader, no API quota)
if (process.env.YT_VIDEO_ID) {
  stopFns.push(
    await startYouTube({
      videoId: process.env.YT_VIDEO_ID,
      retryWhenOffline: (process.env.YT_RETRY_WHEN_OFFLINE || 'true').toLowerCase() === 'true',
      onMessage(evt) {
        broadcast(normalize({ platform: 'youtube', ...evt }))
      },
      debug: DEBUG
    })
  )
} else {
  if (DEBUG) console.log('[youtube] skipped (missing env)')
}

if (process.env.FAKE_MESSAGES === "true") {
  const platforms = ["twitch", "youtube", "tiktok"]
  setInterval(() => {
    const fakeMsg = {
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      username: "User" + Math.floor(Math.random() * 1000),
      message: "Hello world " + Math.floor(Math.random() * 100),
      avatar: "https://yt3.googleusercontent.com/ytc/AIdro_kJOKG-QWLwOZaGItCr8FEKEottez_xFkoXM2yPbsutxQ=s160-c-k-c0x00ffffff-no-rj", // test avatar
      timestamp: Date.now()
    }
    broadcast(fakeMsg) // envoie via WebSocket aux overlays
  }, 2000)
}

server.listen(PORT, () => {
  console.log(`Multichat WS server running on http://localhost:${PORT}`)
  console.log(`→ WebSocket endpoint: ws://localhost:${PORT}`)
  console.log('Add overlay/index.html to OBS as a Browser Source (file:// or served locally).')
})

process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  for (const stop of stopFns) {
    if (typeof stop === 'function') {
      try { await stop() } catch {}
    }
  }
  process.exit(0)
})
