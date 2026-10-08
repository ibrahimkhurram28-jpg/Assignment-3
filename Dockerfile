# Phoneme Builder: Next.js + Prisma (SQLite) production image
#
# Build:  docker build -t phoneme-builder .
# Run:    docker run --init -p 3000:3000 -v phoneme-data:/app/data phoneme-builder
# Check:  http://localhost:3000/health

# ---------- Stage 1: install dependencies ----------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV DATABASE_URL="file:/app/data/phoneme-builder.db"

# The Prisma schema is needed because `npm ci` runs `prisma generate`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---------- Stage 2: build the app ----------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV DATABASE_URL="file:/app/data/phoneme-builder.db" \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build \
 && npm prune --omit=dev

# ---------- Stage 3: production runtime ----------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    CHECKPOINT_DISABLE=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL="file:/app/data/phoneme-builder.db" \
    npm_config_cache=/tmp/.npm

# Run as a non-root user. /app/data holds the SQLite database file.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs \
 && mkdir -p /app/data \
 && chown nextjs:nodejs /app/data

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/lib/phonemes.js ./lib/phonemes.js
COPY --from=builder --chown=nextjs:nodejs /app/lib/simulation.js ./lib/simulation.js

USER nextjs

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# Applies migrations, seeds the phoneme inventory (and simulated usage data on a
# new database), then starts Next.js.
CMD ["npm", "run", "start:docker"]
