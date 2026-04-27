# OpenPortal → OpenPipeline Webhook Contract

OpenPortal's worker (`apps/openportal-worker`) POSTs extracted meeting tasks to
OpenPipeline's webhook endpoint. This document specifies the shared payload
contract so both sides can evolve without breaking each other.

## Endpoint

OpenPipeline MUST expose an HTTP endpoint configured via env vars:

- `OPENPIPELINE_WEBHOOK_URL` — full URL, e.g. `https://openpipeline.example.com/api/webhooks/openportal`
- `OPENPIPELINE_WEBHOOK_SECRET` — shared secret used for `X-Webhook-Secret` header

OpenPortal only sends to this URL; it never reads back from it.

## Request

```
POST ${OPENPIPELINE_WEBHOOK_URL}
Content-Type: application/json
X-Webhook-Secret: ${OPENPIPELINE_WEBHOOK_SECRET}
```

### Body (canonical)

The body matches `openPipelineWebhookPayloadSchema` in
`@opensoftware/openportal-core/schemas`:

```jsonc
{
  "meetingId": "uuid-v4",
  "orgId": "uuid-v4",
  "workspaceId": "string (bubble identifier, e.g. 'finder')",
  "tasks": [
    {
      "assignee": "email@example.com or null",
      "title": "Short imperative task title",
      "deadline": "ISO 8601 datetime or null",
      "priority": "low | normal | high | urgent"
    }
  ],
  "transcriptUrl": "URL of full transcript or null",
  "source": "openportal"
}
```

Fields are validated with Zod **before** the request leaves the worker. A
schema violation raises in `sendOpenPipelineWebhook` and the BullMQ job fails
loudly (retryable).

## Response

OpenPipeline SHOULD respond:

- `200 OK` with JSON body `{ "createdCardIds": ["..."], "skipped": [] }` on success.
- `401 Unauthorized` if `X-Webhook-Secret` mismatches.
- `400 Bad Request` with Zod error shape if payload fails its own validation.
- Any 5xx → worker retries per BullMQ default backoff.

OpenPortal does not block on the response payload — `createdCardIds` is
informational only. If OpenPipeline wants to confirm individual cards later,
it can POST to a future OpenPortal `/api/meetings/:id/tasks/:taskId/linked`
endpoint (not implemented yet).

## Mapping to OpenPipeline cards

Suggested mapping inside OpenPipeline:

| Payload field | OpenPipeline card field | Notes |
|---------------|-------------------------|-------|
| `tasks[].title` | `title` | 1:1 |
| `tasks[].assignee` | `members[]` | Resolve email → user; if not found, add as "unresolved" marker |
| `tasks[].deadline` | `dueAt` | Null → no due date |
| `tasks[].priority` | `priority` | 1:1 |
| `meetingId` | `metadata.openportal.meetingId` | For back-linking |
| `orgId` | `metadata.openportal.orgId` | |
| `workspaceId` | target pipeline selection | Map workspaceId → pipelineId via OpenPipeline config |
| `transcriptUrl` | `description` (appended link) | |

Which pipeline/stage receives the cards is an OpenPipeline-side concern —
configure it via your existing pipeline-selection config.

## Idempotency

Requests are idempotent by `meetingId`. If OpenPipeline receives the same
`meetingId` twice, it MUST NOT create duplicate cards; instead update or skip.
OpenPortal currently sends once per job completion and records
`extracted_tasks.webhook_sent = true` in its own DB, so retries only happen
when the HTTP call actually fails.

## Version & compatibility

- Current version: **v1** (implicit in `source: "openportal"`).
- Breaking changes MUST bump to `source: "openportal@v2"` and add a migration
  note here.
- Adding optional fields is non-breaking.

## Implementation pointers

- Worker side: `apps/openportal-worker/src/services/openpipeline.ts` —
  `sendOpenPipelineWebhook`.
- Schema: `packages/openportal-core/src/schemas/index.ts` —
  `openPipelineWebhookPayloadSchema`.
- OpenPipeline-side handler (**to be implemented in OpenPipeline repo**): accept
  POST, validate secret, validate body with a copy of the same Zod schema,
  create or update cards.
