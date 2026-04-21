# ============================================
# OpenCAD - Turbo Prune Monorepo Dockerfile
# ============================================
# Build from monorepo root: docker build -f apps/opencad/Dockerfile .

# -- Stage 1: Prune monorepo for this app only --------------------------------
FROM node:22-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo@^2.5.0
WORKDIR /app
COPY . .
RUN turbo prune @opensoftware/opencad-app --docker

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

# Re-COPY pruned source (BuildKit cache-invalidation hygiene — see
# Grand-Master-Weaver/.claude/rules/known-pitfalls.md "Landing Page Starter").
COPY --from=pruner /app/out/full/ .

ENV DOCKER_BUILD=true
ENV NODE_ENV=production

# Migrations are pre-generated and committed under apps/opencad/drizzle/.
# DO NOT run `drizzle-kit generate` here — it emits new migrations whenever
# the committed snapshot drifts from schema.ts (e.g. hand-edited migrations
# without a matching *_snapshot.json), which causes duplicate-column /
# no-such-table errors at runtime. Trust the committed migrations folder.
WORKDIR /app/apps/opencad
RUN mkdir -p data drizzle

# Build the Next.js app (standalone output)
WORKDIR /app
RUN pnpm turbo build --filter=@opensoftware/opencad-app

# Ensure optional dirs exist so COPY in runner stage doesn't fail
RUN mkdir -p /app/apps/opencad/public
RUN mkdir -p /app/apps/opencad/.next/static

# Prepare better-sqlite3 runtime deps
RUN mkdir -p /tmp/runtime-node-modules && \
    BSQL_STORE=$(find node_modules/.pnpm -maxdepth 1 -name "better-sqlite3@*" -type d | head -1) && \
    cp -rL "$BSQL_STORE/node_modules/better-sqlite3" /tmp/runtime-node-modules/better-sqlite3 && \
    BIND_STORE=$(find node_modules/.pnpm -maxdepth 1 -name "bindings@*" -type d | head -1) && \
    if [ -n "$BIND_STORE" ]; then \
      cp -rL "$BIND_STORE/node_modules/bindings" /tmp/runtime-node-modules/bindings 2>/dev/null || true; \
      cp -rL "$BIND_STORE/node_modules/file-uri-to-path" /tmp/runtime-node-modules/file-uri-to-path 2>/dev/null || true; \
    fi

# Prepare replicad + replicad-opencascadejs (WASM) runtime deps.
# replicad is declared in serverExternalPackages in next.config.ts, so Next.js
# does NOT bundle it — we must copy the module tree AND its WASM asset so the
# dynamic import in replicad-wrapper.ts resolves at runtime.
RUN RC_STORE=$(find node_modules/.pnpm -maxdepth 1 -name "replicad@*" -type d | head -1) && \
    if [ -n "$RC_STORE" ]; then \
      cp -rL "$RC_STORE/node_modules/replicad" /tmp/runtime-node-modules/replicad; \
    fi && \
    OC_STORE=$(find node_modules/.pnpm -maxdepth 1 -name "replicad-opencascadejs@*" -type d | head -1) && \
    if [ -n "$OC_STORE" ]; then \
      cp -rL "$OC_STORE/node_modules/replicad-opencascadejs" /tmp/runtime-node-modules/replicad-opencascadejs; \
    fi && \
    # Stage the OCCT WASM binary under /public/wasm so it is served as a
    # static asset and OpenCascade's `locateFile()` can resolve it via a
    # same-origin fetch at runtime.
    mkdir -p /app/apps/opencad/public/wasm && \
    if [ -f /tmp/runtime-node-modules/replicad-opencascadejs/dist/opencascade.full.wasm ]; then \
      cp /tmp/runtime-node-modules/replicad-opencascadejs/dist/opencascade.full.wasm /app/apps/opencad/public/wasm/opencascade.wasm; \
    elif [ -f /tmp/runtime-node-modules/replicad-opencascadejs/dist/opencascade.wasm ]; then \
      cp /tmp/runtime-node-modules/replicad-opencascadejs/dist/opencascade.wasm /app/apps/opencad/public/wasm/opencascade.wasm; \
    else \
      echo "[opencad:dockerfile] WARN: opencascade.wasm not found in replicad-opencascadejs/dist — BREP ops will fall back to mesh approximation"; \
    fi

# -- Stage 4: Production runner -----------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4174
ENV HOSTNAME=0.0.0.0
# SQLite file on Railway volume mount — volume is mounted at /app/data.
ENV DATABASE_URL=/app/data/opencad.db
# Runtime migration folder (src/instrumentation.ts reads this).
ENV OPENCAD_MIGRATIONS_DIR=/app/apps/opencad/drizzle/migrations

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output (Next.js standalone mirrors the monorepo structure)
COPY --from=builder /app/apps/opencad/.next/standalone ./
COPY --from=builder /app/apps/opencad/.next/static ./apps/opencad/.next/static
COPY --from=builder /app/apps/opencad/public ./apps/opencad/public

# Copy generated SQL migration files for runtime instrumentation.ts
COPY --from=builder /app/apps/opencad/drizzle /app/apps/opencad/drizzle

# Copy better-sqlite3 native module for runtime
COPY --from=builder /tmp/runtime-node-modules/ /app/node_modules/

# Create data directory for SQLite (volume mount point on Railway)
RUN mkdir -p /app/data /app/apps/opencad/drizzle

# Ensure nextjs user owns the app directory for cache writes
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 4174

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4174/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "apps/opencad/server.js"]
