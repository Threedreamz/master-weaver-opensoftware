# Migrating crowds-teams → OpenPortal

This guide describes the step-by-step migration of the existing
`crowds-starter/apps/crowds-teams` Next.js app onto OpenPortal running in
**embedded mode**. The goal is to empty `crowds-teams/` to a thin wrapper
around OpenPortal without losing features the Crowds team already ships.

## Why embedded

Crowds already has its own Postgres and its own NextAuth + FinderAuth setup.
Rewiring to a remote OpenPortal service would add deployment surface without
clear benefit. Embedded keeps Crowds self-contained while giving it the
generic OpenPortal feature-set.

## Preconditions

- `@opensoftware/openportal-{core,db,ui,realtime}` published (or reachable
  via workspace link from Grand-Master-Weaver).
- `feat/openportal` branch merged to `dev` in master-weaver-opensoftware-starter.
- Crowds Postgres reachable by the new schema (no column naming collisions
  with existing `user` / `chat` / `message` tables — resolve via table prefix
  if needed).

## Phase 1 — additive: install + shadow-mount (no user-visible change)

1. Add workspace deps to `crowds-starter/apps/crowds-teams/package.json`:
   ```jsonc
   "@opensoftware/openportal-core": "workspace:*",
   "@opensoftware/openportal-db": "workspace:*",
   "@opensoftware/openportal-ui": "workspace:*",
   "@opensoftware/openportal-realtime": "workspace:*"
   ```
2. Import the OpenPortal schema into `crowds-starter/packages/crowds-db/src/index.ts`:
   ```ts
   export * from "@opensoftware/openportal-db/schema";
   ```
3. Generate and apply migrations into the Crowds DB:
   ```bash
   pnpm --filter crowds-teams db:generate
   pnpm --filter crowds-teams db:push   # dev only — production via migrations
   ```
4. Build the adapter factory once, in `src/lib/portal-adapter.ts`:
   ```ts
   import { createLocalAdapter } from "@opensoftware/openportal-db";
   import { db } from "@/db";

   export function portalAdapter(userId?: string) {
     return createLocalAdapter({
       db,
       workspaceId: "crowds",
       actorUserId: userId,
     });
   }
   ```

At this point nothing is user-facing yet. The new tables exist but aren't
read.

## Phase 2 — behind-a-flag mount of the new UI

Expose the OpenPortal panels at `/teams-next/*` while the existing screens
stay at `/teams/*`:

```tsx
// crowds-teams/src/app/[locale]/teams-next/page.tsx
import { TeamsPanel } from "@opensoftware/openportal-ui";
import { auth } from "@/auth";
import { portalAdapter } from "@/lib/portal-adapter";

export default async function Page() {
  const session = await auth();
  return <TeamsPanel adapter={portalAdapter(session?.user?.id)} />;
}
```

Repeat for `/members-next`, `/channels-next`, `/meetings-next`, `/audit-next`.
Verify side-by-side with existing pages.

## Phase 3 — data backfill

Run a one-off script to copy legacy Crowds data into OpenPortal tables:

| Legacy (crowds-db) | New (openportal-db) | Notes |
|--------------------|---------------------|-------|
| `agency` | `orgs` | `workspace_id='crowds'` |
| `agencyMember` | `org_members` | role mapping: owner/admin/member/guest |
| `chat` | `channels` | kind: `chat.type` → `public/private/direct` |
| `chatParticipant` | `channel_members` | |
| `message` | `messages` | |
| `auditLog` | `audit_log` | |
| `notification` | `notifications` | |
| `gdprExport` | `gdpr_exports` | |
| `versionHistory` | `version_history` | |

Stays in Crowds (no migration):
`order`, `orderApplication`, `counterOffer`, `orderContent`, `subscription`,
`transaction`, `paymentMethod`, `managedProfile`.

The backfill script lives in
`crowds-starter/scripts/migrate-to-openportal.ts` (to be written). Dry-run
first, confirm row counts, then run for real.

## Phase 4 — cutover

1. Switch Crowds nav: `/teams` routes point at the new panels, `/teams-legacy`
   temporarily keeps the old screens.
2. Remove the old screens after a sprint of soak time.
3. Drop legacy tables (`agency`, `agencyMember`, `chat`, `chatParticipant`,
   `message`, etc.) in a separate migration once nothing reads them.

## Phase 5 — reduce crowds-teams to a thin shell

Once all organization/team features live in OpenPortal, `crowds-teams` only
needs to host:
- Crowds-specific marketplace flows (orders, counter-offers)
- The 3-mode workspace shell (Admin/Comms/Teams) which can be a
  Crowds-specific layer that composes OpenPortal panels.
- Crowds-specific auth/login customization (none anticipated — just reuse).

The "Teams" workspace tab in Crowds becomes a wrapper that mounts
`@opensoftware/openportal-ui` panels; the "Comms" workspace tab does the same
for channels/meetings.

## Rollback plan

If anything goes wrong in Phases 2–3:
- Disable `/teams-next` routes via a feature flag.
- Stop writes into OpenPortal tables (keep reads for debugging).
- Roll back migrations only if OpenPortal tables are empty.

If Phase 4 is already live:
- Keep `/teams-legacy` reachable for 30 days; point nav back.
- Legacy tables are untouched until Phase 5 migration.

## Open questions

- Realtime: Crowds currently runs its own Socket.io server. Does it adopt
  `@opensoftware/openportal-realtime/server` or keep its own and emit
  OpenPortal-shaped events? Recommendation: adopt OpenPortal's server to
  avoid forking protocols.
- Billing: `subscription` stays in Crowds DB until OpenPortal ships an
  `openportal-billing` package (not planned for MVP).
- 3-mode sidebar: remains a Crowds-UI layer, not an OpenPortal concern.
