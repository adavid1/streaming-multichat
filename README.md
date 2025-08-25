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
- 🏷️ **Twitch subscription badges** with month-based display

## 🏗️ Architecture

```
multichat-starter-kit/
├── client/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── App.tsx        # Main application
│   │   └── main.tsx       # Entry point
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

- `useWebSocket()` - WebSocket connection management
- `useChatMessages()` - Chat message state management

### Components

- `<ChatMessage>` - Individual message display
- `<FilterControls>` - Platform and search filters
- `<ConnectionStatus>` - WebSocket connection indicator

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

### Twitch Subscription Badges
The app automatically fetches Twitch subscription badges when connected to a channel and displays them based on the subscriber's months:

- **Automatic fetching**: Badges are fetched on app startup using the public Twitch badges API
- **Month-based display**: Shows the appropriate badge version based on subscription duration
- **Fallback logic**: If exact month match isn't available, shows the closest available version
- **No OAuth required**: Uses public API endpoints for badge fetching
- **Custom badges support**: Can use custom subscription badges for specific channels

#### Using Custom Subscription Badges

You can configure custom subscription badges for your channel in two ways:

**Method 1: Direct configuration in code**
```javascript
// In server/src/twitch-api.ts, add to CUSTOM_CHANNEL_BADGES object:
const CUSTOM_CHANNEL_BADGES = {
  'yourchannel': {
    '1': 'https://your-domain.com/badges/1-month.png',
    '3': 'https://your-domain.com/badges/3-months.png',
    '6': 'https://your-domain.com/badges/6-months.png',
    '9': 'https://your-domain.com/badges/9-months.png',
    '12': 'https://your-domain.com/badges/12-months.png',
    // ... add more months as needed
  }
};
```

**Method 2: Runtime configuration**
```javascript
import { addCustomChannelBadges } from './src/twitch-api.js';

// Add custom badges for your channel
addCustomChannelBadges('yourchannel', {
  '1': 'https://your-domain.com/badges/1-month.png',
  '3': 'https://your-domain.com/badges/3-months.png',
  '6': 'https://your-domain.com/badges/6-months.png',
  // ... add more months as needed
});
```

**Badge Priority Order:**
1. Custom channel badges (if configured)
2. Channel-specific badges from Twitch API
3. Global Twitch badges
4. Fallback default badges

#### Testing Badge Functionality

```bash
# Test default badge fetching
npm run test:badges

# Test custom badge functionality
npm run test:custom-badges
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

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [tmi.js](https://github.com/tmijs/tmi.js) for Twitch chat
- [tiktok-live-connector](https://github.com/isaackogan/TikTok-Live-Connector) for TikTok integration
- [Playwright](https://playwright.dev/) for YouTube chat scraping
- [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/) for the frontend
- [Tailwind CSS](https://tailwindcss.com/) for styling

---

Happy streaming! 🎉