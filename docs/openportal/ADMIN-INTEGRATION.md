# Integrating OpenPortal into an Admin Panel

OpenPortal offers two integration modes. Pick per admin panel — switching
later is just swapping the adapter factory.

| Mode | Who hosts the DB? | Use when |
|------|-------------------|----------|
| **Embedded** | The admin panel | Each bubble has its own Postgres and wants org data isolated in that DB |
| **Remote** | Central OpenPortal API service | Multiple admin panels share one team/org namespace |

Both modes render the same UI (`@opensoftware/openportal-ui`). The only thing
that differs is which adapter you pass to the panels.

---

## Embedded mode

The admin panel's own DB gains the OpenPortal tables, and the adapter reads/
writes them directly (no HTTP hop).

### 1. Depend on the packages

In `admin-starter/apps/admin/package.json`:

```jsonc
{
  "dependencies": {
    "@opensoftware/openportal-core": "workspace:*",
    "@opensoftware/openportal-db": "workspace:*",
    "@opensoftware/openportal-ui": "workspace:*"
  }
}
```

### 2. Wire the schema into your migrations

`@opensoftware/openportal-db/schema` re-exports every `pgTable`. Import them
in your admin's Drizzle config so its migrations create them:

```ts
// admin/src/db/schema.ts
export * from "@opensoftware/openportal-db/schema";
// ...admin-specific tables
```

### 3. Render a panel

Each Next.js route gets a freshly built adapter keyed to the current workspace
and user. Server Component example:

```tsx
// admin/src/app/[locale]/teams/page.tsx
import { TeamsPanel } from "@opensoftware/openportal-ui";
import { createLocalAdapter } from "@opensoftware/openportal-db";
import { db } from "@/db";
import { auth } from "@/auth";

export default async function TeamsPage() {
  const session = await auth();
  const adapter = createLocalAdapter({
    db,
    workspaceId: process.env.BUBBLE_NAME ?? "admin",
    actorUserId: session?.user?.id,
  });
  return <TeamsPanel adapter={adapter} />;
}
```

### 4. Module toggle

In `admin/src/modules.config.ts`:

```ts
export const modules = {
  // ...
  openportal: {
    enabled: true,
    mode: "embedded",
  },
};
```

The admin's nav/sidebar should gate the `/teams`, `/members`, `/channels`,
`/meetings`, `/audit` routes on `modules.openportal.enabled`.

---

## Remote mode

The admin panel calls a central `openportal-api` service over HTTP.

### 1. Depend on the UI + client

```jsonc
{
  "dependencies": {
    "@opensoftware/openportal-core": "workspace:*",
    "@opensoftware/openportal-ui": "workspace:*",
    "@opensoftware/openportal-client": "workspace:*"
  }
}
```

### 2. Env vars

```bash
OPENPORTAL_API_URL=https://openportal-api-dev.up.railway.app
OPENPORTAL_WORKSPACE_ID=finder
```

### 3. Render a panel

```tsx
// admin/src/app/[locale]/teams/page.tsx
"use client";
import { TeamsPanel } from "@opensoftware/openportal-ui";
import { createRemoteAdapter } from "@opensoftware/openportal-client";
import { useSession } from "next-auth/react";

export default function TeamsPage() {
  const { data: session } = useSession();
  const adapter = createRemoteAdapter({
    baseUrl: process.env.NEXT_PUBLIC_OPENPORTAL_API_URL!,
    workspaceId: process.env.NEXT_PUBLIC_OPENPORTAL_WORKSPACE_ID!,
    getAuthToken: async () => (session as { accessToken?: string })?.accessToken ?? "",
  });
  return <TeamsPanel adapter={adapter} />;
}
```

(A Server-Component variant can use a server-side fetch of the access token
from the session store instead of `useSession`.)

### 4. Module toggle

```ts
openportal: {
  enabled: true,
  mode: "remote",
  apiUrl: process.env.OPENPORTAL_API_URL,
}
```

---

## Auth contract (both modes)

- Admin panels already use `@mw/auth-nextauth` → FinderAuth OIDC.
- Embedded mode reuses the admin's session directly (no network boundary).
- Remote mode attaches the session's access token as `Authorization: Bearer ...`
  and the OpenPortal API verifies it against FinderAuth JWKS
  (`apps/openportal-api/src/middleware/auth.ts`).
- Workspace scoping: every request to the API must carry
  `X-Workspace-ID: <bubble>`. The admin panel sets this once via the adapter.

## Real-time (optional, both modes)

- Embedded mode: start a Socket.io server inside the admin's Node runtime
  using `createRealtimeServer()` from `@opensoftware/openportal-realtime/server`,
  attached to the admin's HTTP server.
- Remote mode: the `openportal-api` process hosts Socket.io at
  `wss://${OPENPORTAL_API_URL}/socket.io`. Admin clients connect with
  `connectRealtime()` from `@opensoftware/openportal-realtime/client`.

## AI/meetings (remote-only for MVP)

The AI worker (`openportal-worker`) requires a BullMQ/Redis pair and talks to
OpenAI Whisper. This infrastructure only makes sense in remote mode. In
embedded mode, the Meetings panel can still record audio and upload it to
storage, but transcription + OpenPipeline fanout will be queued to the remote
worker — set `OPENPORTAL_API_URL` even in embedded deployments that want
meetings.

## Migration between modes

Switching from embedded → remote:
1. Dump relevant tables from admin's DB.
2. Load them into the central OpenPortal Postgres.
3. Flip `mode: "embedded"` → `mode: "remote"` + set env vars.
4. Stop the embedded Socket.io server (if any).

Switching from remote → embedded: reverse the dump/load step.
