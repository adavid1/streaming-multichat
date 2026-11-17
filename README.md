# 🎮 Multichat - Universal Streaming Chat

A powerful, real-time chat overlay application that unifies **Twitch**, **YouTube Live**, and **TikTok Live** chat into a single interface. Perfect for streamers who want to engage with their audience across multiple platforms simultaneously.

![Multichat Demo](https://img.shields.io/badge/Platforms-Twitch%20%7C%20YouTube%20%7C%20TikTok-blueviolet)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-green)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Docker](https://img.shields.io/badge/docker-ready-blue)

## ✨ Features

### 🎯 Multi-Platform Support
- **Twitch IRC Chat** - Real-time chat with full badge and emote support
- **YouTube Live Chat** - No API quota limits, custom emoji support
- **TikTok Live Chat** - Chat messages and gift notifications

### 🎨 Two Display Modes
- **Private Mode** - Full dashboard with controls, filters, and settings
- **Public Mode** - Clean overlay perfect for OBS integration

### 🔧 Rich Chat Features
- **Platform Badges** - Subscriber, moderator, VIP badges with proper icons
- **Twitch Emotes** - Full global emote support with images
- **YouTube Custom Emojis** - Channel-specific emoji rendering
- **Message Filtering** - Filter by platform or search by username/content
- **Auto-Expiry** - Messages automatically fade out in public mode
- **Real-time Status** - Connection indicators for all platforms

### 🛠️ Technical Features
- **WebSocket Architecture** - Real-time message delivery
- **Multi-stage Docker Build** - Optimized production deployment
- **TypeScript** - Full type safety across client/server
- **Responsive Design** - Works on desktop and mobile
- **Health Checks** - Built-in monitoring endpoints

## 🚀 Quick Start

### Prerequisites
- Node.js 22+ 
- npm or yarn
- Docker (optional, for containerized deployment)

### 1. Clone and Install
```bash
git clone <repository-url>
cd multichat
npm run install:all
```

### 2. Environment Configuration
Create `server/.env` from the example and fill it in (every variable is documented in the file):
```bash
cp server/.env.example server/.env
```

Minimal configuration:
```env
TWITCH_CHANNEL=yourchannel
YT_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxxxx
TIKTOK_USERNAME=your_tiktok_username
```

### 3. Development
```bash
npm run dev
```
- Server/WebSocket: http://localhost:8787
- OBS overlay: http://localhost:5173/
- OBS dock (streamer view): http://localhost:5173/private

### 4. Production Build
```bash
npm run build
NODE_ENV=production node server/dist/index.js
```

## ⚡ Zero-touch live detection

You don't need to start anything when you go live. Each platform has a
connector that runs on its own:

```
waiting ──(channel goes live)──▶ connecting ──▶ connected
   ▲                                               │
   └──────────(stream ends / connection lost)──────┘
```

- **Twitch**: the IRC chat is always readable, live or not.
- **YouTube**: the server checks `youtube.com/channel/<id>/live` every 20 s
  (`YT_POLL_INTERVAL_SECONDS`) and connects as soon as a live is running. While
  connected it keeps checking every 2 min to follow a new broadcast.
- **TikTok**: the server checks every 30 s (`TIKTOK_POLL_INTERVAL_SECONDS`)
  whether you are live, then connects.
- Errors never block a connector: it keeps retrying with backoff.
- The overlay and dock reconnect to the server forever (server restart, network
  cut...), and receive the last 100 messages on reconnection.

In the dock, clicking a platform badge forces an immediate check / reconnection.

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)
```bash
cp server/.env.example .env   # then edit .env
docker compose up -d
```

### Manual Docker Build
```bash
docker build -t multichat .
docker run -p 8787:8787 --env-file server/.env multichat
```

The CI also publishes `ghcr.io/adavid1/streaming-multichat:latest` on every push to `master`.

When deployed behind a reverse proxy (Caddy, Traefik, nginx...), make sure
WebSocket upgrades are forwarded to the container (Caddy and Traefik do it by default).

## 🔧 Platform Setup

### Twitch
1. **Channel name**: your Twitch login (chat is read anonymously)
2. **Optional - custom badges**: create an app in the
   [Twitch Developer Console](https://dev.twitch.tv/console) and set
   `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` to display your channel's
   subscriber/bits badges. The app token is renewed automatically.

### YouTube
1. **Channel ID** (starts with `UC`): https://www.youtube.com/account_advanced
2. No API key and no quota: the public live chat is read like a browser does.

### TikTok
1. **Username**: your TikTok @username (without the @)
2. TikTok uses a third-party signing service ([Euler Stream](https://www.eulerstream.com)).
   The free tier is enough for one channel; set `TIKTOK_SIGN_API_KEY` if you hit rate limits.

## 🎬 OBS Integration

### Chat overlay (scene)
1. Add a **Browser Source** with URL `https://your-domain/` (or `http://localhost:8787/`)
2. Set dimensions: 400x800 (or adjust to your needs)
3. Transparent background, messages fade out after 60 seconds

### Streamer dock
1. OBS → **Docks → Custom Browser Docks**
2. URL: `https://your-domain/private`
3. Shows all messages with timestamps, platform icons, statuses and filters

## 📁 Project Structure

```
multichat/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts (badges, emotes)
│   │   ├── hooks/          # WebSocket + chat state hooks
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets (emote/badge data)
├── server/                 # Node.js backend
│   └── src/
│       ├── adapters/       # Platform connectors
│       │   ├── connector.ts# Common connector interface
│       │   ├── twitch.ts   # Twitch IRC (tmi.js)
│       │   ├── youtube.ts  # YouTube live chat (youtubei.js)
│       │   └── tiktok.ts   # TikTok Live (tiktok-live-connector)
│       ├── twitch-api.ts   # Twitch Helix API (badges)
│       └── index.ts        # HTTP + WebSocket server
├── shared/                 # Shared TypeScript types
└── Dockerfile              # Multi-stage Docker build
```

## 🔌 API Endpoints

- `GET /health` - Health check
- `GET /api/status` - Status of every platform connector
- `POST /api/:platform/refresh` - Force a live check / reconnection (`twitch`, `youtube`, `tiktok`)

### WebSocket messages
- `chat` - New chat message
- `history` - Recent messages, sent on connection
- `status` - Status of all platforms
- `badges` - Twitch badge data
- `ping` - Heartbeat (every 25 s)

## 🛠️ Development

```bash
npm run build:shared     # Build shared types
npm run build:client     # Build React app
npm run build:server     # Build Node.js server
cd client && npm run lint
cd server && npm run lint
```

## 📊 Features by Platform

| Feature | Twitch | YouTube | TikTok |
|---------|--------|---------|--------|
| Real-time Chat | ✅ | ✅ | ✅ |
| User Badges | ✅ | ✅ (text) | ❌ |
| Emotes/Emojis | ✅ | ✅ | ❌ |
| Subscriber Info | ✅ | ❌ | ❌ |
| Super Chat / Gifts | ❌ | ✅ | ✅ |
| Automatic live detection | ✅ | ✅ | ✅ |

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 8787) |
| `TWITCH_CHANNEL` | Yes* | Twitch channel name |
| `TWITCH_CLIENT_ID` | No | Twitch app client ID (custom badges) |
| `TWITCH_CLIENT_SECRET` | No | Twitch app secret (custom badges, recommended) |
| `TWITCH_OAUTH` | No | Legacy user token, alternative to the secret |
| `YT_CHANNEL_ID` | Yes* | YouTube channel ID (`UC...`) |
| `YT_POLL_INTERVAL_SECONDS` | No | Live check interval (default: 20) |
| `TIKTOK_USERNAME` | Yes* | TikTok username |
| `TIKTOK_POLL_INTERVAL_SECONDS` | No | Live check interval (default: 30, min 30) |
| `TIKTOK_SIGN_API_KEY` | No | Euler Stream API key (higher rate limits) |

*At least one platform must be configured

## 🐛 Troubleshooting

**A platform stays on "Waiting for live" while you are live**
- Check the ID/username in the tooltip of the platform badge in the dock
- YouTube: the live must be public (unlisted/private lives are not found via `/live`)
- Click the badge to force a check, and look at the server logs (`[youtube]`, `[tiktok]`)

**TikTok "rate limit" error**
- The free signing tier was exceeded: wait 2 minutes or set `TIKTOK_SIGN_API_KEY`

**The overlay shows nothing**
- Open the `/private` URL in a browser: the header shows the server connection and each platform status


## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [tmi.js](https://github.com/tmijs/tmi.js) - Twitch IRC integration
- [youtubei.js](https://github.com/LuanRT/YouTube.js) - YouTube Live Chat
- [tiktok-live-connector](https://github.com/zerodytrash/TikTok-Live-Connector) - TikTok Live integration
- [React](https://reactjs.org/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

## 🔗 Quick Links

- 📚 [Documentation](docs/)
- 🐛 [Issue Tracker](issues/)
- 💬 [Discussions](discussions/)
- 🎮 [Live Demo](https://your-demo-url.com)

**Made with ❤️ for the streaming community**
