# ============================================================
# OpenPortal API — Turbo Prune Monorepo Dockerfile
# Build from monorepo root: docker build -f apps/openportal-api/Dockerfile .
# ============================================================

# Stage 1: Prune monorepo to only what openportal-api needs
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo@^2.5.0
WORKDIR /app
COPY . .
RUN turbo prune openportal-api --docker

# Stage 2: Install deps + build (preserve pnpm workspace symlinks for @opensoftware/* packages)
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable pnpm
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --no-frozen-lockfile

# Re-COPY full source after install to bust BuildKit cache (see known-pitfalls.md)
COPY --from=pruner /app/out/full/ .

RUN pnpm turbo build --filter=openportal-api

ENV NODE_ENV=production
ENV PORT=4179
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

USER nodejs

EXPOSE 4179

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:${PORT:-4179}/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "apps/openportal-api/dist/server.js"]
