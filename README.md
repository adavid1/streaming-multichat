# 🎮 Multichat - Universal Streaming Chat Overlay

A powerful, real-time chat overlay application that unifies **Twitch**, **YouTube Live**, and **TikTok Live** chat into a single interface. Perfect for streamers who want to engage with their audience across multiple platforms simultaneously.

![Multichat Demo](https://img.shields.io/badge/Platforms-Twitch%20%7C%20YouTube%20%7C%20TikTok-blueviolet)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![CI/CD](https://github.com/adavid1/multichat/workflows/CI%2FCD%20Pipeline/badge.svg)
![CodeQL](https://github.com/adavid1/multichat/workflows/CodeQL%20Security%20Analysis/badge.svg)
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
- Node.js 18+ 
- npm or yarn
- Docker (optional, for containerized deployment)

### 1. Clone and Install
```bash
git clone <repository-url>
cd multichat
npm run install:all
```

### 2. Environment Configuration
Create `server/.env` from the example:
```bash
cp server/.env.example server/.env
```

Configure your platforms in `server/.env`:
```env
# General
PORT=8787

# Twitch (Required for Twitch chat)
TWITCH_CHANNEL=yourchannel
TWITCH_OAUTH=oauth:your_oauth_token
TWITCH_CLIENT_ID=your_twitch_client_id

# YouTube (Required for YouTube chat)
YT_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxxxx

# TikTok (Required for TikTok chat)
TIKTOK_USERNAME=your_tiktok_username
```

### 3. Development
```bash
npm run dev
```
- React app: http://localhost:5173
- Server/WebSocket: http://localhost:8787
- OBS overlay: http://localhost:5173/?mode=public

### 4. Production Build
```bash
npm run build
npm run server
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)
```bash
# Copy environment variables
cp server/.env.example .env
# Edit .env with your configuration

# Build and run
docker-compose up -d
```

### Manual Docker Build
```bash
docker build -t multichat .
docker run -p 8787:8787 --env-file server/.env multichat
```

## 🔧 Platform Setup

### Twitch Configuration
1. **Channel Name**: Your Twitch username
2. **OAuth Token**: Generate at [Twitch Token Generator](https://twitchtokengenerator.com)
3. **Client ID**: Create an app at [Twitch Developer Console](https://dev.twitch.tv/console)

### YouTube Configuration
1. **Channel ID**: Find your channel ID in YouTube Studio
   - Go to YouTube Studio → Settings → Channel → Advanced settings
   - Or use online tools to convert your channel handle to ID

### TikTok Configuration
1. **Username**: Your TikTok @username (without the @)
2. **Note**: TikTok integration uses reverse-engineering and may be less stable

## 🎬 OBS Integration

### Adding Chat Overlay
1. Add **Browser Source** in OBS
2. Set URL to: `http://localhost:8787/?mode=public`
3. Set dimensions: 400x800 (or adjust to your needs)
4. Enable **Shutdown source when not visible** for better performance

### Public Mode Features
- Clean, transparent background
- Auto-expiring messages (60 seconds)
- No controls or settings visible
- Optimized for streaming overlay

## 📁 Project Structure

```
multichat/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts (badges, emotes)
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets (emote/badge data)
├── server/                 # Node.js backend
│   └── src/
│       ├── adapters/       # Platform-specific chat adapters
│       │   ├── twitch.ts   # Twitch IRC integration
│       │   ├── youtube.ts  # YouTube Live Chat integration
│       │   └── tiktok.ts   # TikTok Live integration
│       ├── twitch-api.ts   # Twitch Helix API integration
│       └── index.ts        # Main server file
├── shared/                 # Shared TypeScript types
└── Dockerfile             # Multi-stage Docker build
```

## 🔌 API Endpoints

### Status
- `GET /api/status` - Get all platform statuses
- `GET /health` - Health check

### Platform Controls
- `POST /api/youtube/start` - Start YouTube chat monitoring
- `POST /api/tiktok/start` - Start TikTok chat monitoring
- `GET /api/badges/:channel` - Get Twitch channel badges

### WebSocket Events
- `chat` - New chat message
- `connection` - Connection status
- `badges` - Badge data update
- `youtube-status` - YouTube status change
- `twitch-status` - Twitch status change  
- `tiktok-status` - TikTok status change

## 🛠️ Development

### Running Tests
```bash
npm run dev:test
```

### Building Individual Components
```bash
npm run build:client     # Build React app
npm run build:server     # Build Node.js server
npm run build:shared     # Build shared types
```

### Linting
```bash
cd client && npm run lint
cd server && npm run lint
```

## 📊 Features by Platform

| Feature | Twitch | YouTube | TikTok |
|---------|--------|---------|--------|
| Real-time Chat | ✅ | ✅ | ✅ |
| User Badges | ✅ | ✅ | ✅ |
| Emotes/Emojis | ✅ | ✅ | ❌ |
| Subscriber Info | ✅ | ❌ | ❌ |
| Gift/Donation Alerts | ❌ | ❌ | ✅ |
| Auto-Start | ✅ | Manual | Manual |
| Connection Status | ✅ | ✅ | ✅ |

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 8787) |
| `TWITCH_CHANNEL` | Yes* | Twitch channel name |
| `TWITCH_OAUTH` | No | OAuth token for enhanced features |
| `TWITCH_CLIENT_ID` | No | Client ID for API access |
| `YT_CHANNEL_ID` | Yes* | YouTube channel ID |
| `TIKTOK_USERNAME` | Yes* | TikTok username |

*At least one platform must be configured

## 🐛 Troubleshooting

### Common Issues

**Twitch not connecting**
- Verify `TWITCH_CHANNEL` matches your exact username
- Ensure OAuth token is valid and has chat:read scope

**YouTube not finding stream**
- Verify `YT_CHANNEL_ID` is correct (not channel handle)
- Make sure you have an active live stream
- Try stopping and restarting YouTube monitoring

**TikTok connection fails**
- Verify `TIKTOK_USERNAME` is exact (without @)
- TikTok integration may be unstable due to platform changes
- Check if user is currently live

**Docker build fails**
- Ensure you have enough disk space
- Try `docker system prune` to clean up
- Verify all environment variables are set

### Debug Mode
Set `NODE_ENV=development` for verbose logging.

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
- [youtube-chat](https://github.com/LinaTsukusu/youtube-chat) - YouTube Live Chat
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
