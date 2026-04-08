# ============================================
# OpenAccounting - Turbo Prune Monorepo Dockerfile
# ============================================
# Build from monorepo root: docker build -f apps/openaccounting/Dockerfile .

# -- Stage 1: Prune monorepo for this app only --------------------------------
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo@^2.5.0
WORKDIR /app
COPY . .
RUN turbo prune openaccounting --docker

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

RUN pnpm turbo build --filter=openaccounting

# Ensure optional dirs exist so COPY in runner stage doesn't fail
RUN mkdir -p /app/apps/openaccounting/public
RUN mkdir -p /app/apps/openaccounting/.next/static

# -- Stage 4: Production runner -----------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4162
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output (Next.js standalone mirrors the monorepo structure)
COPY --from=builder /app/apps/openaccounting/.next/standalone ./
COPY --from=builder /app/apps/openaccounting/.next/static ./apps/openaccounting/.next/static
COPY --from=builder /app/apps/openaccounting/public ./apps/openaccounting/public

# Ensure nextjs user owns the app directory for cache writes
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 4162

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4162/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "apps/openaccounting/server.js"]
