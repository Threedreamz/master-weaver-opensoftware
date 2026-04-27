# ============================================================
# OpenPortal (Next.js UI) — Turbo Prune Monorepo Dockerfile
# Build from monorepo root: docker build -f apps/openportal/Dockerfile .
# ============================================================

# Stage 1: Prune monorepo to only what openportal needs
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo@^2.5.0
WORKDIR /app
COPY . .
RUN turbo prune openportal --docker

# Stage 2: Install dependencies from pruned lockfile
FROM node:22-alpine AS installer
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable pnpm
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --no-frozen-lockfile

# Stage 3: Build the app
FROM installer AS builder
WORKDIR /app

# Re-COPY pruned source after install to bust BuildKit cache (see known-pitfalls.md)
COPY --from=pruner /app/out/full/ .

ENV DOCKER_BUILD=true
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm turbo build --filter=openportal

# Ensure public and static dirs exist for COPY in runner
RUN mkdir -p /app/apps/openportal/public
RUN mkdir -p /app/apps/openportal/.next/static

# Stage 4: Production runner (minimal image, Next.js standalone)
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4178
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone output
COPY --from=builder /app/apps/openportal/.next/standalone ./
COPY --from=builder /app/apps/openportal/.next/static ./apps/openportal/.next/static
COPY --from=builder /app/apps/openportal/public ./apps/openportal/public

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 4178

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:4178/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "apps/openportal/server.js"]
