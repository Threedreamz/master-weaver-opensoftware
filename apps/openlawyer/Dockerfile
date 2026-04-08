# ============================================
# OpenLawyer - Turbo Prune Monorepo Dockerfile
# ============================================
# Build from monorepo root: docker build -f apps/openlawyer/Dockerfile .

# Stage 1: Prune monorepo to only this app and its dependencies
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo@^2.5.0
WORKDIR /app
COPY . .
RUN turbo prune openlawyer --docker

# Stage 2: Install dependencies and build
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
RUN corepack enable pnpm
WORKDIR /app
ENV DOCKER_BUILD=true

# Install dependencies from pruned lockfile
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/full/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --no-frozen-lockfile

# Copy full source from pruned output
COPY --from=pruner /app/out/full/ .

# Build the Next.js app (standalone output with outputFileTracingRoot)
RUN pnpm turbo build --filter=openlawyer

# Ensure optional directories exist for COPY in runner stage
RUN mkdir -p /app/apps/openlawyer/public /app/apps/openlawyer/drizzle

# Stage 3: Production runner
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (mirrors monorepo structure due to outputFileTracingRoot)
COPY --from=builder /app/apps/openlawyer/.next/standalone/ /app/
COPY --from=builder /app/apps/openlawyer/.next/static /app/apps/openlawyer/.next/static
COPY --from=builder /app/apps/openlawyer/public /app/apps/openlawyer/public

# Ensure cache directories are writable
RUN chown -R nextjs:nodejs /app

WORKDIR /app/apps/openlawyer

USER nextjs

EXPOSE 4164
ENV PORT=4164
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4164/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
