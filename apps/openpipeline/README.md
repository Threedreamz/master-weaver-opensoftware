# OpenPipeline

Kanban-basiertes Pipeline- und Auftragsmanagement als Trello-Ersatz. Entwickelt als Teil des ETD-Ecosystems (Ersatzteildrucken).

## Stack

- **Framework**: Next.js 16, React 19, TypeScript 5.9
- **Datenbank**: SQLite via Drizzle ORM + better-sqlite3
- **State**: Zustand
- **Drag & Drop**: @hello-pangea/dnd
- **Styling**: Tailwind CSS v4
- **Auth**: FinderAuth OIDC (via @mw/auth-nextauth)
- **Port**: 4177

## Quickstart

```bash
# Aus dem Monorepo-Root
pnpm install
pnpm dev --filter=openpipeline

# Nur Datenbank
pnpm --filter=openpipeline db:generate   # Migrationen generieren
pnpm --filter=openpipeline db:push       # Schema pushen
pnpm --filter=openpipeline db:seed       # System-Vorlagen seeden
pnpm --filter=openpipeline db:studio     # Drizzle Studio starten
```

## Features

### Aktuell implementiert

- Kanban-Board mit Drag & Drop (Karten zwischen Stufen verschieben)
- Pipeline CRUD (erstellen, bearbeiten, archivieren)
- Stufen/Listen mit WIP-Limits und Farbcodes
- Karten mit Titel, Beschreibung, Prioritat, Status, Falligkeit
- Checklisten pro Karte
- Karten-Historie (Verschiebungen, Statuswechsel)
- Pipeline-Vorlagen (Fischer Standard, Software Projekt, Produktion, Leer)
- Pipeline-Generator aus Vorlagen
- Mitgliederverwaltung mit Rollen (Vorgesetzter/Zuarbeiter)
- Listenbeschreibungen pro Stufe (Was/Warum/Wie + Video + Onboarding-Checkliste)
- Webhook-Integration (Teams, OpenBounty)
- Health-Endpoint (`/api/health`)

### Geplant (Trello-Paritat)

- Rich-Text Kommentare mit @Mentions
- Labels pro Pipeline (farbige Tags)
- Custom Fields mit Prio-Anzeige auf Kartenvorschau
- Datei-Anhange
- Mehrere Mitglieder pro Karte
- Falligkeitsdatum mit Warnfarben (rot/gelb)
- Karten-Vorlagen (Template-Karten)
- Filter & Suche (nach Label, Mitglied, Falligkeit, Custom Field)
- Speicherbare Filter-Presets (rollenbasiert)
- Slide-over Detail-Panel (Board bleibt sichtbar)
- In-App Benachrichtigungen
- Automatisierungen (Trigger-basierte Regeln)
- Stufen-Drag & Drop (Spalten-Reihenfolge andern)

## Projektstruktur

```
src/
  app/
    page.tsx                          Dashboard (Pipeline-Liste)
    pipelines/[id]/page.tsx           Kanban-Board
    pipelines/neu/page.tsx            Pipeline erstellen
    vorlagen/page.tsx                 Vorlagen-Ubersicht
    generator/page.tsx                Pipeline-Generator
    api/
      health/                         Health-Check
      pipelines/                      Pipeline CRUD + Mitglieder
      karten/                         Karten CRUD + Verschieben + Checkliste
      stufen/                         Stufenbeschreibungen
      vorlagen/                       Vorlagen + Instanziierung
      generator/                      Pipeline-Generierung
      webhooks/                       Teams + OpenBounty Webhooks
      sync/                           Sync-Log
  components/
    kanban/
      KanbanBoard.tsx                 Board-Hauptkomponente
      KanbanStufe.tsx                 Stufen-Spalte
      KanbanKarte.tsx                 Karten-Komponente
      KarteDetailDialog.tsx           Karten-Detail (Modal)
      NeueKarteDialog.tsx             Neue Karte erstellen
      BeschreibungDetailDialog.tsx    Stufenbeschreibung bearbeiten
      ListenbeschreibungKarte.tsx     Stufenbeschreibung anzeigen
      VideoEmbed.tsx                  Video-Player (YouTube/Vimeo)
    pipeline/
      PipelineNav.tsx                 Breadcrumb-Navigation
  db/
    index.ts                          DB-Verbindung (Lazy-Proxy)
    schema.ts                         Schema Re-Export
    seed.ts                           System-Vorlagen seeden
  lib/
    api-auth.ts                       Auth-Hilfsfunktionen
    permissions.ts                    Rollen-Checks
    sync/status-mapper.ts            Status-Mapping (Teams/OpenBounty)
  stores/
    kanban-store.ts                   Zustand State Management
  instrumentation.ts                  Auto-Migration bei Startup
```

## Datenbank-Schema

| Tabelle | Beschreibung |
|---------|-------------|
| `pip_pipelines` | Pipelines mit Hierarchie (Eltern/Kind) |
| `pip_stufen` | Stufen/Listen mit WIP-Limits |
| `pip_karten` | Karten mit Prio, Status, Zuweisung |
| `pip_karten_historie` | Karten-Bewegungshistorie |
| `pip_mitglieder` | Pipeline-Mitglieder mit Rollen |
| `pip_checklisten` | Checklisten-Items pro Karte |
| `pip_vorlagen` | Pipeline-Vorlagen |
| `pip_sync_log` | Sync-Event-Protokoll |
| `pip_automatisierungen` | Automatisierungsregeln |
| `pip_listenbeschreibung` | Stufenbeschreibungen (Was/Warum/Wie) |

## Environment Variables

```bash
DB_PATH=/app/data/openpipeline.db     # SQLite-Datenbankpfad
FINDERAUTH_ISSUER=                     # FinderAuth OIDC Issuer URL
FINDERAUTH_CLIENT_ID=                  # OIDC Client ID
FINDERAUTH_CLIENT_SECRET=              # OIDC Client Secret
AUTH_SECRET=                           # NextAuth Secret
UPLOAD_DIR=./data/uploads              # Datei-Upload Verzeichnis
```

## Deployment (Railway)

Die App wird uber Railway deployed mit einem Multi-Stage Dockerfile:

1. **Turbo Prune**: `turbo prune openpipeline --docker`
2. **Install + Build**: pnpm install → Next.js Standalone Build
3. **Runner**: Minimaler Alpine Container auf Port 4177
4. **Volume**: SQLite-DB auf `/app/data` (Railway Volume)

Konfiguration uber `railway.toml` und `Dockerfile` im App-Verzeichnis.
