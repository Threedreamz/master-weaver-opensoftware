# OpenSoftware API Gateway — Dockerfile for Railway
# Multi-stage build with turbo prune

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

# Stage 1: Turbo prune
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune @opensoftware/api-gateway --docker

# Stage 2: Install dependencies
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/full/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --no-frozen-lockfile

# Stage 3: Build
FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
ENV DOCKER_BUILD=true
ENV NODE_ENV=production
RUN pnpm turbo build --filter=@opensoftware/api-gateway

# Stage 4: Runner
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/api-gateway/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/api-gateway/.next/static ./apps/api-gateway/.next/static
# public/ may not exist for API-only apps — create empty dir
RUN mkdir -p ./apps/api-gateway/public

ENV NODE_ENV=production
ENV PORT=4150
ENV HOSTNAME=0.0.0.0

USER nextjs
EXPOSE 4150

CMD ["node", "apps/api-gateway/server.js"]
