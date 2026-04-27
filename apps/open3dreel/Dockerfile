# ============================================
# Open3DReel — Turbo Prune Monorepo Dockerfile
# ============================================
# Build from monorepo root: docker build -f apps/open3dreel/Dockerfile .

# -- Stage 1: Prune monorepo for this app only --------------------------------
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo@^2.5.0
WORKDIR /app
COPY . .
RUN turbo prune @opensoftware/open3dreel-app --docker

# -- Stage 2: Install dependencies from pruned lockfile ------------------------
FROM node:22-alpine AS installer
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable pnpm
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --no-frozen-lockfile

# -- Stage 3: Build the app ---------------------------------------------------
FROM installer AS builder
WORKDIR /app

# Re-COPY pruned source — busts BuildKit's cache reliably.
COPY --from=pruner /app/out/full/ .

ENV DOCKER_BUILD=true
ENV NODE_ENV=production

# Generate SQL migrations from schema (drizzle-kit reads ./src/db/schema.ts).
WORKDIR /app/apps/open3dreel
RUN mkdir -p data drizzle && npx drizzle-kit generate

# Build the Next.js app (standalone output).
WORKDIR /app
RUN pnpm turbo build --filter=@opensoftware/open3dreel-app

# Ensure dirs exist for COPY in runner stage.
RUN mkdir -p /app/apps/open3dreel/public
RUN mkdir -p /app/apps/open3dreel/.next/static

# Stage better-sqlite3 native module for runtime.
RUN mkdir -p /tmp/runtime-node-modules && \
    BSQL_STORE=$(find node_modules/.pnpm -maxdepth 1 -name "better-sqlite3@*" -type d | head -1) && \
    cp -rL "$BSQL_STORE/node_modules/better-sqlite3" /tmp/runtime-node-modules/better-sqlite3 && \
    BIND_STORE=$(find node_modules/.pnpm -maxdepth 1 -name "bindings@*" -type d | head -1) && \
    if [ -n "$BIND_STORE" ]; then \
      cp -rL "$BIND_STORE/node_modules/bindings" /tmp/runtime-node-modules/bindings 2>/dev/null || true; \
      cp -rL "$BIND_STORE/node_modules/file-uri-to-path" /tmp/runtime-node-modules/file-uri-to-path 2>/dev/null || true; \
    fi

# -- Stage 4: Production runner -----------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4183
ENV HOSTNAME=0.0.0.0
# SQLite + rendered video files on Railway volume mount at /app/data.
ENV DATABASE_URL=/app/data/open3dreel.db
ENV REELS_DIR=/app/data/reels

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone Next.js build (mirrors monorepo path layout).
COPY --from=builder /app/apps/open3dreel/.next/standalone ./
COPY --from=builder /app/apps/open3dreel/.next/static ./apps/open3dreel/.next/static
COPY --from=builder /app/apps/open3dreel/public ./apps/open3dreel/public

# Generated migrations for runtime apply via instrumentation.ts.
COPY --from=builder /app/apps/open3dreel/drizzle /app/apps/open3dreel/drizzle

# Native modules.
COPY --from=builder /tmp/runtime-node-modules/ /app/node_modules/

# Volume mount points (DB + rendered video output).
RUN mkdir -p /app/data /app/data/reels /app/apps/open3dreel/drizzle && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 4183

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4183/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "apps/open3dreel/server.js"]
