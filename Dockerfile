# Multi-stage build for multichat app
FROM node:18-alpine AS base

# -------------------------
# Install dependencies
# -------------------------
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci --ignore-scripts
RUN cd server && npm ci --ignore-scripts
RUN cd client && npm ci --ignore-scripts

# -------------------------
# Build client & server
# -------------------------
FROM base AS builder
WORKDIR /app

# Copy all source code
COPY . .

# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Build client and server
RUN cd client && npm run build
RUN cd server && npm run build

# -------------------------
# Production image
# -------------------------
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create app user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 multichat

# Copy built application + shared folder
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/client/public/twitchGlobalEmotes.json ./client/dist/
COPY --from=builder /app/client/public/twitchGlobalBadges.json ./client/dist/

# Install only production dependencies for server
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production --ignore-scripts

# Set permissions
RUN chown -R multichat:nodejs /app
USER multichat

EXPOSE 8787

CMD ["node", "server/dist/index.js"]
