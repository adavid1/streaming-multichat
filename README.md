# Multichat React + TypeScript (v2.0)

A modern multichat application built with **React**, **TypeScript**, and **Node.js** that combines Twitch, YouTube, and TikTok chat into a unified overlay perfect for OBS streaming.

## ✨ Features

- 🎮 **Twitch** chat via `tmi.js` (IRC real-time)
- 📺 **YouTube** live chat via Playwright (no API quotas!)
- 🎵 **TikTok** live chat via `tiktok-live-connector`
- ⚡ **Real-time WebSocket** communication
- 🎨 **Modern React UI** with TypeScript
- 🎯 **OBS-ready overlay** with public/private modes
- 🔍 **Live filtering** by platform and search
- 📱 **Responsive design** with Tailwind CSS
- 🔄 **Auto-reconnection** and error handling
- 🏷️ **Advanced Twitch badges** with subscription months, cheer bits, and global badges
- 😀 **Twitch global emotes** with automatic text replacement
- 🎨 **Smart badge handling** with fallback logic and custom badge support

## 🏗️ Architecture

```
multichat-starter-kit/
├── client/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts (Badge, Emote)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   ├── App.tsx        # Main application
│   │   └── main.tsx       # Entry point
│   ├── twitchGlobalBadges.json   # Twitch global badges data
│   ├── twitchGlobalEmotes.json   # Twitch global emotes data
│   ├── package.json
│   ├── vite.config.ts     # Vite configuration
│   └── tailwind.config.js # Tailwind CSS config
├── server/                # Node.js + TypeScript backend
│   ├── src/
│   │   ├── adapters/      # Platform integrations
│   │   └── index.ts       # Main server
│   ├── package.json
│   └── tsconfig.json
├── shared/                # Shared TypeScript types
│   └── types.ts
└── package.json           # Root workspace
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Chrome/Chromium (for Playwright)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd multichat-starter-kit
npm run install:all
```

2. **Configure environment:**
```bash
cd server
cp .env.example .env
# Edit .env with your credentials
```

3. **Start development:**
```bash
# From root directory - starts both server and client
npm run dev

# Or separately:
npm run dev:server  # Server only (port 8787)
npm run dev:client  # Client only (port 5173)
```

4. **Build for production:**
```bash
npm run build      # Builds client to server/client/dist
npm run server     # Starts production server
```

## ⚙️ Environment Variables

Create `server/.env`:

```env
# General
PORT=8787
DEBUG=false

# Twitch (optional but recommended)
TWITCH_CHANNEL=yourchannel

# YouTube Live Chat (no API key needed!)
YT_CHANNEL_ID=YOUR_YOUTUBE_CHANNEL_ID  # e.g., UCxxxxxxxxxxxx
YT_RETRY_WHEN_OFFLINE=true

# TikTok
TIKTOK_USERNAME=your_tiktok_username

# Development
FAKE_MESSAGES=false  # Set to true for testing
```

## 🎥 OBS Integration

### Method 1: Browser Source (Recommended)
1. Add **Browser Source** in OBS
2. URL: `http://localhost:8787/?mode=public`
3. Width: 400, Height: 600 (adjust as needed)
4. Custom CSS: `body { margin: 0; }`

### Method 2: Local File
1. After building: Add **Browser Source**
2. Local File: `/path/to/multichat-starter-kit/client/dist/index.html`
3. Add query parameter: `?mode=public`

### Display Modes
- **Private mode** (`/?mode=private`): Full interface with controls
- **Public mode** (`/?mode=public`): Clean overlay for streaming

## 🔧 Development

### Available Scripts

**Root:**
- `npm run dev` - Start both server and client
- `npm run build` - Build client for production
- `npm run install:all` - Install all dependencies

**Server:**
- `npm run dev` - Start development server with hot reload
- `npm run dev:test` - Start with fake messages for testing
- `npm run start` - Start production server

**Client:**
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### TypeScript Types

Shared types are defined in `shared/types.ts`:

```typescript
interface ChatMessage {
  id: string;
  ts: number;
  platform: 'twitch' | 'youtube' | 'tiktok';
  username: string;
  message: string;
  badges: string[];
  color: string | null;
  raw: Record<string, any>;
}
```

### Custom Hooks

- `useWebSocket()` - WebSocket connection management with badge fetching
- `useChatMessages()` - Chat message state management with auto-expiration
- `useBadges()` - Twitch badge context for subscription and cheer badges
- `useEmotes()` - Twitch emote context for global emote replacement

### Components

- `<ChatMessage>` - Individual message display with emote and badge rendering
- `<FilterControls>` - Platform and search filters
- `<ConnectionStatus>` - WebSocket connection indicator
- `<BadgeProvider>` - Context provider for Twitch badge management
- `<EmoteProvider>` - Context provider for Twitch emote management

### Contexts

- `BadgeContext` - Manages Twitch subscription and cheer badges with smart fallback logic
- `EmoteContext` - Loads and provides Twitch global emotes for text replacement

## 🎨 Customization

### Styling
- Built with **Tailwind CSS**
- Custom theme in `client/tailwind.config.js`
- Dark theme optimized for streaming overlays

### Platform Colors
```javascript
const platformColors = {
  twitch: 'bg-purple-600',
  youtube: 'bg-red-600', 
  tiktok: 'bg-pink-600',
};
```

### Twitch Badge System
The app features a comprehensive Twitch badge system with advanced functionality:

**Badge Types Supported:**
- **Subscription badges**: Month-based display with smart fallback logic
- **Cheer/Bits badges**: Displays appropriate badge based on bit amount
- **Global badges**: Moderator, VIP, Premium, Staff, Admin, Global Mod, etc.
- **Custom channel badges**: Support for streamer-specific badges

**Key Features:**
- **Automatic fetching**: Badges are fetched on app startup using public Twitch badges API
- **Smart fallback logic**: Shows closest available version when exact match isn't found
- **No OAuth required**: Uses public API endpoints for badge fetching
- **Badge utilities**: Helper functions for badge URL and info retrieval
- **Context-based management**: Centralized badge handling through React context

### Twitch Emote System
The app includes comprehensive Twitch global emote support:

**Features:**
- **Global emote replacement**: Automatically replaces text with emote images (e.g., "PogChamp", "EleGiggle")
- **Fast lookup**: Uses Map data structure for efficient emote name matching
- **Automatic loading**: Loads emotes from `twitchGlobalEmotes.json` on app startup
- **Inline rendering**: Emotes appear inline with chat messages
- **Proper styling**: Emotes are sized and aligned correctly within messages

**How it works:**
1. Emotes are loaded from the JSON file containing Twitch's global emote data
2. Chat messages are parsed word by word
3. Words matching emote names are replaced with `<img>` elements
4. Non-matching words remain as text

**Emote Data Structure:**
```typescript
interface TwitchEmote {
  id: string
  name: string
  images: {
    url_1x: string
    url_2x: string
    url_4x: string
  }
  format: string[]
  scale: string[]
  theme_mode: string[]
}
```

### Message Filtering
- Real-time platform filtering (Twitch/YouTube/TikTok)
- Live search by username or message content
- Maximum 200 messages stored (configurable)

## 🔍 Debugging

**Client Debug Info:**
- Available in development mode (bottom-right corner)
- Shows connection status, message counts, and current mode

**Server Logs:**
```bash
DEBUG=true npm run dev  # Enable verbose logging
```

**WebSocket Testing:**
```javascript
// Browser console
const ws = new WebSocket('ws://localhost:8787');
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

## 📦 Production Deployment

1. **Build the application:**
```bash
npm run build
```

2. **Deploy server with built client:**
```bash
cd server
npm start
```

3. **Environment considerations:**
- Set `NODE_ENV=production`
- Use process manager like PM2
- Configure reverse proxy for WebSocket support
- Consider rate limiting and security headers

## 🐛 Troubleshooting

**YouTube chat not working:**
- Verify video ID is from an active live stream
- Check if chat is enabled for the stream
- Some streams have member-only or restricted chat

**WebSocket connection issues:**
- Check firewall settings
- Ensure port 8787 is accessible
- Verify no other services using the same port

**TikTok connection problems:**
- Username should be without @ symbol
- Some regions have restrictions
- Try different usernames if issues persist

**Playwright issues:**
```bash
cd server
npx playwright install chromium
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 🔧 Technical Stack

### Frontend Dependencies
- **React 18.2** - Modern React with hooks and concurrent features
- **TypeScript 5.2** - Type safety and better developer experience
- **Vite 5.0** - Fast build tool and dev server
- **Tailwind CSS 3.3** - Utility-first CSS framework
- **Lucide React** - Modern icon library
- **React Icons** - Popular icon sets (Font Awesome, etc.)

### Backend Dependencies
- **Express 4.19** - Web server framework
- **WebSocket (ws) 8.18** - Real-time communication
- **tmi.js 1.8** - Twitch chat IRC client
- **youtube-chat 2.2** - YouTube live chat scraping
- **tiktok-live-connector 2.0** - TikTok live chat integration
- **TypeScript 5.3** - Server-side type safety

### Development Tools
- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting
- **tsx** - TypeScript execution for development
- **cross-env** - Cross-platform environment variables

## 🚀 Recent Updates (v2.0)

### New Features
- ✨ **Twitch Global Emotes**: Automatic text-to-emote replacement in chat messages
- 🏷️ **Advanced Badge System**: Support for subscription, cheer, and global badges
- 🎯 **Smart Badge Fallback**: Intelligent badge version selection
- 🔄 **Context Architecture**: Centralized state management for badges and emotes
- 🛠️ **Utility Functions**: Helper functions for badge and emote handling
- 📱 **Enhanced UI**: Improved message rendering with proper emote alignment

### Technical Improvements
- 🏗️ **Better Architecture**: Separation of concerns with contexts and utilities
- 🎨 **Enhanced Styling**: Better visual hierarchy and emote integration
- 🔍 **Type Safety**: Comprehensive TypeScript interfaces for all features
- ⚡ **Performance**: Optimized emote lookup with Map data structure
- 🧪 **Code Quality**: Improved linting and formatting setup

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [tmi.js](https://github.com/tmijs/tmi.js) for Twitch chat IRC integration
- [youtube-chat](https://github.com/LinaTsukusu/youtube-chat) for YouTube live chat
- [tiktok-live-connector](https://github.com/isaackogan/TikTok-Live-Connector) for TikTok integration
- [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/) for the frontend
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vite](https://vitejs.dev/) for fast development and building
- [Twitch API](https://dev.twitch.tv/) for badges and emotes data

---

Happy streaming! 🎉