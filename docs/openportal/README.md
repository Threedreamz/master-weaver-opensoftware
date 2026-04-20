# OpenPortal

Generic team / organization / meeting portal that any admin panel in the
ecosystem can mount. Extracted from `crowds-starter/apps/crowds-teams` into
portable OpenSoftware building blocks.

## Modules

| Module | Purpose | Port |
|--------|---------|------|
| `apps/openportal` | Standalone Next.js UI for hosted deployments | 4178 |
| `apps/openportal-api` | Hono REST API (FinderAuth JWKS, workspace-scoped) | 4179 |
| `apps/openportal-worker` | BullMQ worker — meeting transcription, OpenPipeline fanout | 4180 |
| `packages/openportal-core` | Types, Zod schemas, `PortalAdapter` interface | — |
| `packages/openportal-db` | Drizzle + Postgres schema, `createLocalAdapter` | — |
| `packages/openportal-ui` | Embeddable React panels | — |
| `packages/openportal-client` | `createRemoteAdapter` — typed HTTP client | — |
| `packages/openportal-realtime` | Socket.io server + client helpers | — |
| `packages/openportal-ai` | Whisper + LLM task extraction | — |

## Architecture (Hybrid)

```
┌─────────────────┐           ┌─────────────────────────┐
│  Admin Panel A  │           │  Admin Panel B          │
│  (Finder)       │           │  (ETD, ODYN, Crowds…)   │
│                 │           │                         │
│  openportal-ui  │           │  openportal-ui          │
│       │         │           │       │                 │
│  createLocal…() │           │  createRemoteAdapter()  │
│       │         │           │       │                 │
│   (same DB)     │           │   HTTP + JWT + WS       │
│       ▼         │           │       ▼                 │
│  Admin's Postgres            │  openportal-api + DB    │
└─────────────────┘           └─────────────────────────┘
                                      │
                                      ▼
                              openportal-worker ──► OpenPipeline webhook
                                      │
                                      ▼
                              Whisper + LLM
```

## Data Model (no Crowds leakage)

`orgs`, `org_members`, `invitations`, `channels`, `channel_members`,
`messages`, `meetings`, `meeting_recordings`, `meeting_transcripts`,
`extracted_tasks`, `audit_log`, `notifications`, `gdpr_exports`,
`version_history`, `users`, `workspaces`.

Crowds-specific tables (orders, agencies, marketplace, payments) stay in
Crowds — NOT migrated.

## Docs

- [WEBHOOK-CONTRACT.md](./WEBHOOK-CONTRACT.md) — OpenPipeline integration contract
- [ADMIN-INTEGRATION.md](./ADMIN-INTEGRATION.md) — How to embed or remote-mount from any admin panel
- [CROWDS-MIGRATION.md](./CROWDS-MIGRATION.md) — Step-by-step migration of crowds-teams onto OpenPortal

## Env Vars

| Var | Service | Purpose |
|-----|---------|---------|
| `OPENPORTAL_DATABASE_URL` | api / db | Postgres connection (required) |
| `OPENPORTAL_API_URL` | admin panels | Remote-mode base URL |
| `OPENPORTAL_WORKSPACE_ID` | all | Workspace/tenant identifier |
| `OPENPORTAL_SERVICE_KEY` | api | Shared secret for S2S auth bypass |
| `FINDERAUTH_ISSUER` | api | OIDC issuer URL |
| `FINDERAUTH_JWKS_URI` | api | Override for JWKS endpoint |
| `REDIS_URL` | worker | BullMQ connection |
| `WHISPER_PROVIDER` | worker | `openai` (default) |
| `WHISPER_API_KEY` | worker | Whisper API key |
| `LLM_API_KEY` | worker | OpenAI key for task extraction |
| `LLM_MODEL` | worker | Default `gpt-4o-mini` |
| `OPENPIPELINE_WEBHOOK_URL` | worker | Where to POST extracted tasks |
| `OPENPIPELINE_WEBHOOK_SECRET` | worker | Shared secret |
| `CORS_ORIGINS` | api | Comma-separated allowed origins |

## Quickstart

```bash
# Install from opensoftware-starter root
pnpm install

# Typecheck everything
pnpm --filter='openportal*' typecheck
pnpm --filter='@opensoftware/openportal-*' typecheck

# Run locally (in 3 terminals)
pnpm --filter=openportal dev            # http://localhost:4178
pnpm --filter=openportal-api dev        # http://localhost:4179
pnpm --filter=openportal-worker dev     # http://localhost:4180
```
