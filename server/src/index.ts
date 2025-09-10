import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

import { startTwitch } from './adapters/twitch.js'
import { createTikTokAdapter } from './adapters/tiktok.js'
import { createYouTubeAdapter } from './adapters/youtube.js'
import { getTwitchBadgesPublic, extractSubscriptionBadges } from './twitch-api.js'
import type { ChatMessage, Platform, AdapterEvent, WebSocketMessage, TwitchBadgeResponse, TwitchStatus } from '../../shared/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = parseInt(process.env.PORT || '8787', 10)
const isDevelopment = process.env.NODE_ENV !== 'production'

// Express server
const app = express()
app.use(cors())

// Health check endpoint
app.get('/health', (_req, res) => res.json({ ok: true }))

// Badge endpoint for fetching channel-specific badges
app.get('/api/badges/:channel', async (req, res) => {
  try {
    const { channel } = req.params
    
    if (!channel) {
      return res.status(400).json({ error: 'Channel parameter is required' })
    }
    
    console.log(`[api] Fetching badges for channel: ${channel}`)
    const badges = await getTwitchBadgesPublic(channel)
    
    if (!badges) {
      return res.status(404).json({ error: 'Failed to fetch badges for channel' })
    }
    
    res.json(badges)
  } catch (error) {
    console.error('[api] Error fetching badges:', (error as Error).message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// YouTube start endpoint
app.post('/api/youtube/start', async (req, res) => {
  try {
    if (!youTubeAdapter) {
      return res.status(400).json({ error: 'YouTube adapter not initialized' })
    }
    
    const success = await youTubeAdapter.start()
    const status = youTubeAdapter.getStatus()
    
    // Broadcast status update to all clients
    broadcast({
      type: 'youtube-status',
      data: { status, success }
    } as WebSocketMessage)
    
    res.json({ success, status })
  } catch (error) {
    console.error('[api] Error starting YouTube:', (error as Error).message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// TikTok start endpoint
app.post('/api/tiktok/start', async (req, res) => {
  try {
    if (!tiktokAdapter) {
      return res.status(400).json({ error: 'TikTok adapter not initialized' })
    }
    
    const success = await tiktokAdapter.start()
    const status = tiktokAdapter.getStatus()
    
    // Broadcast status update to all clients
    broadcast({
      type: 'tiktok-status',
      data: { status, success }
    } as WebSocketMessage)
    
    res.json({ success, status })
  } catch (error) {
    console.error('[api] Error starting TikTok:', (error as Error).message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Status endpoint
app.get('/api/status', (req, res) => {
  try {
    const statuses = {
      twitch: twitchStatus,
      youtube: youTubeAdapter ? { status: youTubeAdapter.getStatus(), isRunning: youTubeAdapter.isRunning() } : null,
      tiktok: tiktokAdapter ? { status: tiktokAdapter.getStatus(), isRunning: tiktokAdapter.isRunning() } : null
    }
    res.json(statuses)
  } catch (error) {
    console.error('[api] Error getting status:', (error as Error).message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// In development, don't serve static files (Vite handles this)
// In production, serve the built React app
if (!isDevelopment) {
  const clientDistPath = path.join(__dirname, '../../client/dist')
  
  if (existsSync(clientDistPath)) {
    console.log(`[server] Serving static files from ${clientDistPath}`)
    app.use(express.static(clientDistPath))
    
    // Serve React app for all other routes (SPA routing)
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'))
    })
  } else {
    console.warn(`[server] Client dist folder not found at ${clientDistPath}`)
    console.warn('[server] Run "npm run build" to build the client first')
    
    // Provide helpful error page
    app.get('*', (_req, res) => {
      res.status(404).send(`
        <html>
          <head><title>Multichat - Build Required</title></head>
          <body style="font-family: system-ui; padding: 2rem; background: #111; color: #fff;">
            <h1>🚧 Build Required</h1>
            <p>The client application hasn't been built yet.</p>
            <p>Please run:</p>
            <pre style="background: #222; padding: 1rem; border-radius: 8px;">npm run build</pre>
            <p>Then restart the server.</p>
            <hr style="margin: 2rem 0; border-color: #333;">
            <p><strong>For development:</strong> Use <code>npm run dev</code> and access <a href="http://localhost:5173" style="color: #60a5fa;">http://localhost:5173</a></p>
            <p><strong>WebSocket server:</strong> Running on ws://localhost:${PORT}</p>
          </body>
        </html>
      `)
    })
  }
} else {
  console.log('[server] Development mode - static files served by Vite')
  
  // In development, provide a simple info page
  app.get('*', (_req, res) => {
    res.send(`
      <html>
        <head><title>Multichat Server - Development</title></head>
        <body style="font-family: system-ui; padding: 2rem; background: #111; color: #fff;">
          <h1>🚀 Multichat Server</h1>
          <p>Server is running in development mode.</p>
          <p><strong>React Dev Server:</strong> <a href="http://localhost:5173" style="color: #60a5fa;">http://localhost:5173</a></p>
          <p><strong>WebSocket Server:</strong> ws://localhost:${PORT}</p>
          <hr style="margin: 2rem 0; border-color: #333;">
          <h2>For OBS:</h2>
          <p>Use: <a href="http://localhost:5173/?mode=public" style="color: #60a5fa;">http://localhost:5173/?mode=public</a></p>
        </body>
      </html>
    `)
  })
}

const server = http.createServer(app)

// WebSocket server
const wss = new WebSocketServer({ server })

// Global storage
let twitchBadges: TwitchBadgeResponse | null = null
let subscriptionBadgeUrls: Record<string, string> = {}
let youTubeAdapter: any = null // YouTube adapter instance
let tiktokAdapter: any = null // TikTok adapter instance
let twitchStatus: TwitchStatus | null = null // Twitch status

// Function to fetch Twitch badges
async function fetchTwitchBadges(): Promise<void> {
  const twitchChannel = process.env.TWITCH_CHANNEL
  if (!twitchChannel) {
    console.log('[badges] No Twitch channel configured, skipping badge fetch')
    return
  }
  
  try {
    console.log(`[badges] Fetching badges for channel: ${twitchChannel}`)
    const badges = await getTwitchBadgesPublic(twitchChannel)
    
    if (badges) {
      twitchBadges = badges
      subscriptionBadgeUrls = extractSubscriptionBadges(badges)
      console.log(`[badges] Successfully loaded ${Object.keys(subscriptionBadgeUrls).length} subscription badge versions`)
      
      // Broadcast badges to all connected clients
      broadcast({
        type: 'badges',
        data: badges
      } as WebSocketMessage)
    } else {
      console.error('[badges] Failed to fetch Twitch badges')
    }
  } catch (error) {
    console.error('[badges] Error fetching badges:', (error as Error).message)
  }
}

function broadcast(msg: ChatMessage | WebSocketMessage): void {
  const data = JSON.stringify(msg)
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      try {
        client.send(data)
      } catch (e) {
        console.error('WS send error:', (e as Error).message)
      }
    }
  }
}

// Normalize incoming events to a common shape
function normalize({ 
  platform, 
  username, 
  message, 
  badges = [], 
  color, 
  raw = {} 
}: { platform: Platform } & AdapterEvent): ChatMessage {
  return {
    id: uuidv4(),
    ts: Date.now(),
    platform,
    username,
    message,
    badges,
    color: color || null,
    raw
  }
}

wss.on('connection', (ws) => {
  console.log('[ws] client connected')
  
  // Send connection acknowledgment
  ws.send(JSON.stringify({ 
    type: 'connection', 
    message: 'Connected to multichat server' 
  } as WebSocketMessage))
  
  // Send current badges if available
  if (twitchBadges) {
    ws.send(JSON.stringify({
      type: 'badges',
      data: twitchBadges
    } as WebSocketMessage))
  }
  
  // Send current Twitch status if available (or default status)
  const currentTwitchStatus = twitchStatus || {
    status: 'stopped' as const,
    message: process.env.TWITCH_CHANNEL ? 'Not started' : 'No Twitch channel configured',
    channel: process.env.TWITCH_CHANNEL || undefined
  }
  
  ws.send(JSON.stringify({
    type: 'twitch-status',
    data: currentTwitchStatus
  } as WebSocketMessage))
  
  // Send YouTube status if adapter exists
  if (youTubeAdapter) {
    const status = youTubeAdapter.getStatus()
    ws.send(JSON.stringify({
      type: 'youtube-status',
      data: { status, isRunning: youTubeAdapter.isRunning() }
    } as WebSocketMessage))
  }

  // Send TikTok status if adapter exists
  if (tiktokAdapter) {
    const status = tiktokAdapter.getStatus()
    ws.send(JSON.stringify({
      type: 'tiktok-status',
      data: { status, isRunning: tiktokAdapter.isRunning() }
    } as WebSocketMessage))
  }
  
  ws.on('close', () => {
    console.log('[ws] client disconnected')
  })
})

async function initializeAdapters(): Promise<void> {
  // Twitch
  const twitchChannel = process.env.TWITCH_CHANNEL
  if (twitchChannel) {
    try {
      await startTwitch({
        channel: twitchChannel,
        onMessage(evt) {
          const normalized = normalize({ platform: 'twitch', ...evt })
          broadcast(normalized)
        },
        onStatusChange(status: string, message?: string) {
          // Update local status
          twitchStatus = {
            status: status as TwitchStatus['status'],
            message,
            channel: twitchChannel
          }
          
          // Broadcast status changes to all connected clients
          broadcast({
            type: 'twitch-status',
            data: twitchStatus
          } as WebSocketMessage)
          
          console.log(`[twitch] Status: ${status}${message ? ` - ${message}` : ''}`)
        }
      })
    } catch (error) {
      console.error('[twitch] Failed to start:', (error as Error).message)
      // Set error status
      twitchStatus = {
        status: 'error',
        message: (error as Error).message,
        channel: twitchChannel
      }
      broadcast({
        type: 'twitch-status',
        data: twitchStatus
      } as WebSocketMessage)
    }
  } else {
    console.log('[twitch] skipped (missing TWITCH_CHANNEL env)')
    twitchStatus = {
      status: 'stopped',
      message: 'No Twitch channel configured'
    }
  }

  // TikTok
  if (process.env.TIKTOK_USERNAME) {
    try {
      tiktokAdapter = await createTikTokAdapter({
        username: process.env.TIKTOK_USERNAME,
        onMessage(evt) {
          const normalized = normalize({ platform: 'tiktok', ...evt })
          broadcast(normalized)
        },
        onStatusChange(status: string, message?: string) {
          // Broadcast status changes to all connected clients
          broadcast({
            type: 'tiktok-status',
            data: { status, message }
          } as WebSocketMessage)
          
          console.log(`[tiktok] Status: ${status}${message ? ` - ${message}` : ''}`)
        }
      })
    } catch (error) {
      console.error('[tiktok] Failed to start:', (error as Error).message)
    }
  } else {
    console.log('[tiktok] skipped (missing env)')
  }

  // YouTube - Initialize adapter but don't auto-start
  if (process.env.YT_CHANNEL_ID) {
    console.log('[youtube] Initializing adapter for channel id:', process.env.YT_CHANNEL_ID)
    try {
      youTubeAdapter = await createYouTubeAdapter({
        channelId: process.env.YT_CHANNEL_ID,
        onMessage(evt: AdapterEvent) {
          const normalized = normalize({ platform: 'youtube', ...evt })
          broadcast(normalized)
        },
        onStatusChange(status: string, message?: string) {
          // Broadcast status changes to all connected clients
          broadcast({
            type: 'youtube-status',
            data: { status, message }
          } as WebSocketMessage)
          
          console.log(`[youtube] Status: ${status}${message ? ` - ${message}` : ''}`)
        }
      })
      
      console.log('[youtube] Adapter initialized. Use /api/youtube/start to begin chat monitoring.')
    } catch (error) {
      console.error('[youtube] Failed to initialize adapter:', (error as Error).message)
    }
  } else {
    console.warn('[youtube] skipped: set YT_CHANNEL_ID in your environment to enable YouTube')
  }
}

// Start server
server.listen(PORT, async () => {
  console.log(`Multichat server running on http://localhost:${PORT}`)
  console.log(`→ WebSocket endpoint: ws://localhost:${PORT}`)
  
  if (isDevelopment) {
    console.log('→ Development mode: Access React app at http://localhost:5173')
    console.log('→ For OBS: http://localhost:5173/?mode=public')
  } else {
    console.log('→ Production mode: React app served from this server')
    console.log('→ For OBS: http://localhost:' + PORT + '/?mode=public')
  }
  
  // Fetch badges first, then start adapters
  await fetchTwitchBadges()
  await initializeAdapters()
})

process.on('SIGINT', async () => {
  console.log('\nShutting down...')
  // TODO: Add cleanup logic for adapters
  process.exit(0)
})

export { broadcast, normalize }