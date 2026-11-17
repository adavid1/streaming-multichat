# Multi-stage build for the multichat app
# Node >= 20 is required by tiktok-live-connector
FROM node:22-alpine AS base
WORKDIR /app

# -------------------------
# Install dependencies
# -------------------------
FROM base AS deps
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN cd shared && npm ci --ignore-scripts
RUN cd server && npm ci --ignore-scripts
RUN cd client && npm ci --ignore-scripts

# -------------------------
# Build shared, server & client
# -------------------------
FROM base AS builder
COPY . .
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
RUN cd shared && npx tsc --build
RUN cd server && npx tsc --build
RUN cd client && npm run build

# -------------------------
# Production image
# -------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 multichat

# Production dependencies only
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

RUN chown -R multichat:nodejs /app
USER multichat

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8787/health || exit 1

CMD ["node", "server/dist/index.js"]
