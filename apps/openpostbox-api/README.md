# OpenPostbox API

Virtual mailbox service. Accepts scanned physical mail (PDF), stores it in a
GoBD-compliant hash-chained archive, enqueues OCR + classification jobs, and
exposes a REST API for the host hub (3Dreamz Hub) to render an inbox UI.

Port **4167**. Worker counterpart: `openpostbox-worker` (port 4169).

## Paywall

This service is paywalled in the 3Dreamz Hub via the `openpostbox.business`
entitlement. See:

- GMW `registry.json` → `3dreamz.starter.sources.openpostbox-api.catalog.requiresEntitlement`
- `plans.ts` → `PLANS.pro.limits.opensoftware.openpostbox`
- opensoftware-gateway → `middleware/entitlement.ts` (server-side enforcement)
- threedreamz-hub → `components/opensoftware/paywall-gate.tsx` (client-side UX)

## Endpoints

All endpoints require `X-API-Key` (shared per-bubble secret) and
`X-Tenant-Id` (the paying user's id — scoped by the gateway from the OIDC
session).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health probe |
| GET | `/api/appstore/manifest` | AppStore sidebar/widgets/entitlement manifest |
| GET | `/api/entitlement` | Self-report entitlement key |
| POST | `/api/scans/upload` | Multipart PDF ingest (ScanSnap webhook target) |
| POST | `/api/scans` | JSON ingest (replay / internal re-queue) |
| GET | `/api/scans` | List mail. `?unread=1&limit=N&count=1` |
| GET | `/api/scans/:id` | One scan + its event log |
| PATCH | `/api/scans/:id` | Update mutable fields (unread, tags, classification, shredded) |
| GET | `/api/scans/:id/pdf` | Serve stored PDF inline |

## Env Vars

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `4167` | Listen port |
| `HOSTNAME` | `0.0.0.0` | Required for Railway health checks |
| `DATABASE_URL` | `file:./data/openpostbox.db` | SQLite path |
| `OPENPOSTBOX_BLOB_ROOT` | `./data/blobs` | PDF storage root (mount a Railway volume here) |
| `OPENSOFTWARE_API_KEY` | — | Shared per-bubble secret (must match gateway) |
| `REDIS_URL` | — | Required for OCR enqueue; worker reads the same var |

## Quota

Monthly page quota is enforced per tenant. The gateway passes
`X-Plan-Scan-Pages: <n>` from the user's plan. Ingests that would push the
tenant over the cap return **402 Payment Required** with `{ used, cap,
remaining, pageCount }`.

- Pro / Lifetime Pro: 500 pages/month
- Business (planned): 500 pages/month + 10-year GoBD archive
- Enterprise: unlimited

## GoBD Hash Chain

Every `scanned_mail` row stores:

```
prev_hash = previous row's this_hash (per tenant)
this_hash = sha256(prev_hash || tenant_id || received_at_ms || blob_url || page_count)
```

Auditors replay the chain to prove the archive hasn't been edited. Breaking
any link invalidates every subsequent hash.

## ScanSnap iX1600 Setup

The iX1600 can post scanned PDFs directly to the upload endpoint using its
"Cloud Service" or the ScanSnap Home HTTP post profile. Configure:

1. Open **ScanSnap Home** → **Profiles** → **Add new profile**
2. Name: `OpenPostbox` · Document type: `Documents` · File format: `PDF`
3. Save destination: **Web service** (HTTP POST)
4. URL: `https://openpostbox-api.<your-domain>.up.railway.app/api/scans/upload`
5. Request method: `POST` · Content type: `multipart/form-data`
6. Form field name for the file: `pdf`
7. Custom headers:
   ```
   X-API-Key: <OPENSOFTWARE_API_KEY>
   X-Tenant-Id: <the user's tenant id>
   X-Plan-Scan-Pages: <cap from plan — omit for no cap>
   X-Source: scansnap-ix1600
   ```
8. Save profile. The scanner now routes its output to OpenPostbox.

### Manual smoke test

```bash
curl -X POST \
  -H "X-API-Key: $OPENSOFTWARE_API_KEY" \
  -H "X-Tenant-Id: demo-tenant" \
  -H "X-Plan-Scan-Pages: 500" \
  -H "X-Source: curl" \
  -F "pdf=@./sample.pdf" \
  -F "subject=Rechnung März" \
  -F "senderName=Musterfirma GmbH" \
  https://openpostbox-api-production.up.railway.app/api/scans/upload
```

Response: `201 { id, thisHash, blobUrl, pageCount, sizeBytes, sha256, quotaUsed, quotaCap }`

## Local Dev

```bash
pnpm --filter openpostbox-api dev   # port 4167
pnpm --filter openpostbox-worker dev # port 4169, needs REDIS_URL
```

Migrations run on first boot via `instrumentation.ts` (Next.js). Blob
storage falls back to `./data/blobs`, SQLite to `./data/openpostbox.db`.

## Production Deployment (Railway)

Deployed from the GMW root:

```bash
node scripts/deploy-bubble.cjs 3dreamz starter production --status
node scripts/deploy-bubble.cjs 3dreamz starter production --fix-sources --deploy
```

Mount a Railway volume at `/app/data` and set
`OPENPOSTBOX_BLOB_ROOT=/app/data/blobs` so PDFs survive deploys. SQLite
lives in the same volume at `/app/data/openpostbox.db`.

## Follow-Ups (not in MVP)

- Real OCR (Tesseract or Cloud) — currently the worker logs the job and
  returns `{ ocrTextLength: 0, pageCount: 0 }`. Wire in Tesseract via the
  worker's `processOcr` job.
- DATEV export for `classification = rechnung` rows (Pro/Business tiers)
- Fristen-Extraktion → Kalender-Event on `due_date`
- Physical shredding service integration (Clevver / Docufy) after scan
- S3/R2 blob store alternative to disk volume for multi-region
