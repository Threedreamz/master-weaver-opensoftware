# OpenSoftware Monorepo

Open-source admin tools monorepo containing 4 standalone Next.js 16 applications, built with Turborepo and pnpm workspaces.

## Apps

| App | Port | Description |
|-----|------|-------------|
| **OpenMailer** | 4160 | IMAP/SMTP email client |
| **OpenAccounting** | 4162 | Double-entry bookkeeping (SKR03/SKR04, BWA, Bilanz, GuV) |
| **OpenLawyer** | 4164 | Legal project management with document review |
| **OpenSEM** | 4166 | Search Engine Marketing |

## Quick Start

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start all apps
pnpm dev:mailer       # Start only OpenMailer (port 4160)
pnpm dev:accounting   # Start only OpenAccounting (port 4162)
pnpm dev:lawyer       # Start only OpenLawyer (port 4164)
pnpm dev:sem          # Start only OpenSEM (port 4166)
```

## Stack

- **Runtime**: Node.js 22+, pnpm 10+
- **Framework**: Next.js 16, React 19, TypeScript 5.9
- **Styling**: Tailwind CSS v4
- **Database**: SQLite via Drizzle ORM (better-sqlite3)
- **Auth**: NextAuth v5 + FinderAuth OIDC (optional, dev credentials fallback)
- **i18n**: next-intl with 10 locales (cs, de, en, es, fr, it, nl, pl, pt, sv)
- **Build**: Turborepo

## Project Structure

```
apps/
  openmailer/         IMAP email client
  openaccounting/     Double-entry bookkeeping
  openlawyer/         Legal project management
  opensem/            Search Engine Marketing
packages/
  config/             Shared configuration (ports, locales, env)
  db/                 Drizzle schemas + SQLite connection
  tsconfig/           Shared TypeScript configs
  ui/                 Shared UI components (AppShell, Sidebar, DataTable, etc.)
```

## Database

Each app has its own SQLite database file. Push schemas with:

```bash
pnpm db:push          # Push all schemas
pnpm db:generate      # Generate migrations
```

## Auth

Auth is optional. Apps work without any auth configuration (dev mode auto-login). For production:

```env
AUTH_SECRET=your-secret
FINDERAUTH_ISSUER=https://auth.finderfinder.org/oidc
FINDERAUTH_CLIENT_ID=your-client-id
FINDERAUTH_CLIENT_SECRET=your-client-secret
```

## Shared Packages

- **@opensoftware/config** — App configs, port registry, locale list, env helpers
- **@opensoftware/db** — Drizzle schemas (shared auth tables + per-app domain tables)
- **@opensoftware/ui** — AppShell, Sidebar, PageHeader, DataTable, StatusBadge, EmptyState
- **@opensoftware/tsconfig** — Base and Next.js TypeScript configurations
