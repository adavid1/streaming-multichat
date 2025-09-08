# Multi-stage build for multichat app
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --only=production --ignore-scripts
RUN cd server && npm ci --only=production --ignore-scripts
RUN cd client && npm ci --only=production --ignore-scripts

# Build the client
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules  
COPY --from=deps /app/client/node_modules ./client/node_modules

# Build client
RUN cd client && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 multichat

# Copy built application
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/client/dist ./client/dist
COPY --from=deps /app/server/node_modules ./server/node_modules

# Copy static assets for emotes and badges
COPY --from=builder /app/client/public/twitchGlobalEmotes.json ./client/dist/
COPY --from=builder /app/client/public/twitchGlobalBadges.json ./client/dist/

# Set correct permissions
RUN chown -R multichat:nodejs /app

USER multichat

EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8787/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "server/src/index.js"]