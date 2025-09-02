# Multichat React + TypeScript (v2.0)

A modern multichat application built with **React**, **TypeScript**, and **Node.js** that combines Twitch, YouTube, and TikTok chat into a unified overlay perfect for OBS streaming.

## ✨ Features

- 🎮 **Twitch** chat via `tmi.js` (IRC real-time)
- 📺 **YouTube** live chat via `youtube-chat`
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
├── client/                # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Badge, Emote)
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

Create `server/.env` and fill it using the `.env.example` file as a template.

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

### Message Filtering
- Real-time platform filtering (Twitch/YouTube/TikTok)
- Live search by username or message content
- Maximum 200 messages stored (configurable)

## 📄 License

MIT License.

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
