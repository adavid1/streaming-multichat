import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

import { createTwitchConnector } from './adapters/twitch.js'
import { createTikTokConnector } from './adapters/tiktok.js'
import { createYouTubeConnector } from './adapters/youtube.js'
import { type Connector, errorMessage } from './adapters/connector.js'
import { getTwitchBadges } from './twitch-api.js'
import type {
  AdapterEvent,
  ChatMessage,
  Platform,
  PlatformStatus,
  PlatformStatuses,
  TwitchBadgeResponse,
  WebSocketMessage,
} from '../../shared/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = parseInt(process.env.PORT || '8787', 10)
// Bind address: set HOST=127.0.0.1 when running behind a local reverse proxy
const HOST = process.env.HOST || '0.0.0.0'
const isDevelopment = process.env.NODE_ENV !== 'production'
const HISTORY_SIZE = 100
const HEARTBEAT_MS = 25_000

const PLATFORMS: Platform[] = ['twitch', 'youtube', 'tiktok']

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const connectors: Partial<Record<Platform, Connector>> = {}
const history: ChatMessage[] = []
let twitchBadges: TwitchBadgeResponse | null = null

function getStatuses(): PlatformStatuses {
  const disabled = (env: string): PlatformStatus => ({ status: 'disabled', message: `Set ${env} to enable` })
  return {
    twitch: connectors.twitch?.getStatus() ?? disabled('TWITCH_CHANNEL'),
    youtube: connectors.youtube?.getStatus() ?? disabled('YT_CHANNEL_ID'),
    tiktok: connectors.tiktok?.getStatus() ?? disabled('TIKTOK_USERNAME'),
  }
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

const app = express()
app.use(cors())

app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }))

app.get('/api/status', (_req, res) => res.json(getStatuses()))

// Manual "check now / reconnect" for a platform. `/start` kept for backward compatibility.
const lastRefresh: Partial<Record<Platform, number>> = {}
app.post(['/api/:platform/refresh', '/api/:platform/start'], async (req, res) => {
  const platform = req.params.platform as Platform
  const connector = connectors[platform]
  if (!connector) return res.status(404).json({ error: `${platform} is not configured` })

  // Cheap protection: the endpoint is public, avoid hammering the platforms
  if (Date.now() - (lastRefresh[platform] ?? 0) < 10_000) {
    return res.status(429).json({ error: 'Please wait a few seconds', status: connector.getStatus() })
  }
  lastRefresh[platform] = Date.now()

  try {
    await connector.refresh()
    res.json({ success: true, status: connector.getStatus() })
  } catch (error) {
    console.error(`[api] ${platform} refresh failed:`, errorMessage(error))
    res.status(500).json({ error: errorMessage(error) })
  }
})

if (!isDevelopment) {
  const clientDistPath = path.join(__dirname, '../../client/dist')
  if (existsSync(clientDistPath)) {
    console.log(`[server] Serving static files from ${clientDistPath}`)
    app.use(express.static(clientDistPath))
    // SPA routing (/, /private...)
    app.get('*', (_req, res) => res.sendFile(path.join(clientDistPath, 'index.html')))
  } else {
    console.warn(`[server] Client dist folder not found at ${clientDistPath} - run "npm run build"`)
  }
} else {
  app.get('/', (_req, res) => {
    res.send(
      '<body style="font-family:system-ui;background:#111;color:#fff;padding:2rem">' +
        '<h1>Multichat server (dev)</h1>' +
        '<p>Overlay: <a style="color:#60a5fa" href="http://localhost:5173/">http://localhost:5173/</a></p>' +
        '<p>Dock: <a style="color:#60a5fa" href="http://localhost:5173/private">http://localhost:5173/private</a></p>' +
        '</body>',
    )
  })
}

const server = http.createServer(app)

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ server })
const alive = new WeakMap<WebSocket, boolean>()

function send(ws: WebSocket, msg: WebSocketMessage): void {
  if (ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify(msg))
  } catch (error) {
    console.error('[ws] send error:', errorMessage(error))
  }
}

function broadcast(msg: WebSocketMessage): void {
  const data = JSON.stringify(msg)
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue
    try {
      client.send(data)
    } catch (error) {
      console.error('[ws] send error:', errorMessage(error))
    }
  }
}

wss.on('connection', (ws) => {
  console.log(`[ws] client connected (${wss.clients.size} total)`)
  alive.set(ws, true)
  ws.on('pong', () => alive.set(ws, true))
  ws.on('error', (error) => console.warn('[ws] client error:', error.message))
  ws.on('close', () => console.log(`[ws] client disconnected (${wss.clients.size} total)`))

  // Give the new client the full current state
  send(ws, { type: 'connection', message: 'Connected to multichat server' })
  send(ws, { type: 'status', data: getStatuses() })
  if (twitchBadges) send(ws, { type: 'badges', data: twitchBadges })
  if (history.length) send(ws, { type: 'history', data: history })
})

// Heartbeat: application-level ping keeps proxies from closing idle sockets and
// lets the client detect a dead connection; protocol-level ping drops dead clients.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (alive.get(ws) === false) {
      ws.terminate()
      continue
    }
    alive.set(ws, false)
    ws.ping()
  }
  broadcast({ type: 'ping', ts: Date.now() })
}, HEARTBEAT_MS)

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

function pushMessage(platform: Platform, evt: AdapterEvent): void {
  const message: ChatMessage = {
    id: evt.id || randomUUID(),
    ts: Date.now(),
    platform,
    username: evt.username,
    message: evt.message,
    badges: evt.badges ?? [],
    color: evt.color || null,
    raw: evt.raw ?? {},
    customEmojis: evt.customEmojis,
    highlight: evt.highlight,
  }
  history.push(message)
  if (history.length > HISTORY_SIZE) history.shift()
  broadcast({ type: 'chat', data: message })
}

const onStatusChange = () => broadcast({ type: 'status', data: getStatuses() })

function initConnectors(): void {
  const env = process.env

  if (env.TWITCH_CHANNEL) {
    connectors.twitch = createTwitchConnector({
      channel: env.TWITCH_CHANNEL,
      onMessage: (evt) => pushMessage('twitch', evt),
      onStatusChange,
    })
  } else {
    console.log('[twitch] disabled (set TWITCH_CHANNEL)')
  }

  if (env.YT_CHANNEL_ID) {
    connectors.youtube = createYouTubeConnector({
      channelId: env.YT_CHANNEL_ID,
      pollIntervalMs: parseInt(env.YT_POLL_INTERVAL_SECONDS || '20', 10) * 1000,
      onMessage: (evt) => pushMessage('youtube', evt),
      onStatusChange,
    })
  } else {
    console.log('[youtube] disabled (set YT_CHANNEL_ID)')
  }

  if (env.TIKTOK_USERNAME) {
    connectors.tiktok = createTikTokConnector({
      username: env.TIKTOK_USERNAME,
      pollIntervalMs: Math.max(30, parseInt(env.TIKTOK_POLL_INTERVAL_SECONDS || '30', 10)) * 1000,
      signApiKey: env.TIKTOK_SIGN_API_KEY || undefined,
      onMessage: (evt) => pushMessage('tiktok', evt),
      onStatusChange,
    })
  } else {
    console.log('[tiktok] disabled (set TIKTOK_USERNAME)')
  }

  for (const platform of PLATFORMS) connectors[platform]?.start()
}

async function loadTwitchBadges(): Promise<void> {
  if (!process.env.TWITCH_CHANNEL) return
  try {
    const badges = await getTwitchBadges(process.env.TWITCH_CHANNEL)
    if (badges) {
      twitchBadges = badges
      console.log(`[badges] Loaded ${Object.keys(badges.badge_sets).length} Twitch badge sets`)
      broadcast({ type: 'badges', data: badges })
    }
  } catch (error) {
    console.error('[badges] Failed to load Twitch badges:', errorMessage(error))
  }
}

server.on('error', (error) => {
  console.error('[server] HTTP server error:', error)
  process.exit(1)
})

server.listen(PORT, HOST, () => {
  console.log(`Multichat server running on http://localhost:${PORT}`)
  if (isDevelopment) {
    console.log('→ Overlay (OBS): http://localhost:5173/   Dock: http://localhost:5173/private')
  } else {
    console.log(`→ Overlay (OBS): http://localhost:${PORT}/   Dock: http://localhost:${PORT}/private`)
  }
  initConnectors()
  void loadTwitchBadges()
  // Refresh badges daily (new sub badges, expired tokens...)
  setInterval(() => void loadTwitchBadges(), 24 * 3600_000).unref()
})

// ---------------------------------------------------------------------------
// Shutdown (Docker sends SIGTERM)
// ---------------------------------------------------------------------------

let shuttingDown = false
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n[server] ${signal} received, shutting down...`)
  clearInterval(heartbeat)
  const force = setTimeout(() => process.exit(0), 5_000)
  force.unref()
  await Promise.allSettled(PLATFORMS.map((p) => connectors[p]?.stop()))
  for (const ws of wss.clients) ws.close(1001, 'Server shutting down')
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

// A failing third-party library must never take the whole chat down
process.on('unhandledRejection', (reason) => console.error('[server] Unhandled rejection:', errorMessage(reason)))
process.on('uncaughtException', (error) => console.error('[server] Uncaught exception:', error))
