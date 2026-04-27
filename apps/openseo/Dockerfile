# ============================================
# OpenSEO - Turbo Prune Monorepo Dockerfile
# ============================================
# Build from monorepo root: docker build -f apps/openseo/Dockerfile .

# -- Stage 1: Prune monorepo for this app only --------------------------------
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo@^2.5.0
WORKDIR /app
COPY . .
RUN turbo prune openseo --docker

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

# Copy full source from pruner
COPY --from=pruner /app/out/full/ .

ENV DOCKER_BUILD=true
ENV NODE_ENV=production

# Generate SQL migration files (for runtime migration via instrumentation.ts)
WORKDIR /app/apps/openseo
RUN mkdir -p data drizzle && npx drizzle-kit generate

# Build the Next.js app (standalone output)
WORKDIR /app
RUN pnpm turbo build --filter=openseo

# Ensure optional dirs exist so COPY in runner stage doesn't fail
RUN mkdir -p /app/apps/openseo/public
RUN mkdir -p /app/apps/openseo/.next/static

# Prepare better-sqlite3 runtime deps
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
ENV PORT=4166
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output (Next.js standalone mirrors the monorepo structure)
COPY --from=builder /app/apps/openseo/.next/standalone ./
COPY --from=builder /app/apps/openseo/.next/static ./apps/openseo/.next/static
COPY --from=builder /app/apps/openseo/public ./apps/openseo/public

# Copy generated SQL migration files for runtime instrumentation.ts
COPY --from=builder /app/apps/openseo/drizzle /app/apps/openseo/drizzle

# Copy better-sqlite3 native module for runtime
COPY --from=builder /tmp/runtime-node-modules/ /app/node_modules/

# Create data directory for SQLite (volume mount point on Railway)
RUN mkdir -p /app/data /app/apps/openseo/drizzle

# Ensure nextjs user owns the app directory for cache writes
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 4166

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4166/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "apps/openseo/server.js"]
