# ============================================
# OpenPostbox Worker - Turbo Prune Monorepo Dockerfile
# ============================================
# Build from monorepo root: docker build -f apps/openpostbox-worker/Dockerfile .

# Stage 1: Prune monorepo for the worker only
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo@^2.5.0
WORKDIR /app
COPY . .
RUN turbo prune openpostbox-worker --docker

# Stage 2: Install dependencies and build
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable pnpm
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/full/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --no-frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=openpostbox-worker

ENV NODE_ENV=production
ENV PORT=4169
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

USER nextjs

EXPOSE 4169

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:${PORT:-4169}/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "apps/openpostbox-worker/dist/server.js"]
