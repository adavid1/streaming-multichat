# Multi-stage build for multichat app
FROM node:18-alpine AS base
WORKDIR /app

# -------------------------
# Install dependencies
# -------------------------
FROM base AS deps

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY shared/package*.json ./shared/

# Install all dependencies (including dev)
RUN npm ci --ignore-scripts
RUN cd server && npm ci --ignore-scripts
RUN cd client && npm ci --ignore-scripts
RUN cd shared && npm ci --ignore-scripts

# -------------------------
# Build shared, server & client
# -------------------------
FROM base AS builder
WORKDIR /app

# Copy all source code
COPY . .

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules

# Build shared first
RUN cd shared && npm run build

# Then build server (it references shared)
RUN cd server && npm run build

# Then build client
RUN cd client && npm run build

# -------------------------
# Production image
# -------------------------
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create app user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 multichat

# Copy built artifacts
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/client/public/twitchGlobalEmotes.json ./client/dist/
COPY --from=builder /app/client/public/twitchGlobalBadges.json ./client/dist/

# Install only production dependencies for server
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production --ignore-scripts

# Permissions
RUN chown -R multichat:nodejs /app
USER multichat

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8787/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "server/dist/index.js"]
