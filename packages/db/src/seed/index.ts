/**
 * Seed orchestrator — runs Max Mustermann seed across all OpenSoftware apps.
 *
 * Usage:
 *   npx tsx packages/db/src/seed/index.ts                    # Seed all apps
 *   npx tsx packages/db/src/seed/index.ts --app=openmailer   # Seed single app
 *   npx tsx packages/db/src/seed/index.ts --app=openpayroll --app=openbounty
 */

import { resolve, dirname } from "path";
import { existsSync, mkdirSync } from "fs";
import { createDb } from "../create-db";

// Schema imports (needed for createDb)
import * as sharedSchema from "../shared.schema";
import * as openmailerSchema from "../openmailer.schema";
import * as openaccountingSchema from "../openaccounting.schema";
import * as openlawSchema from "../openlawyer.schema";
import * as opensemSchema from "../opensem.schema";
import * as openpayrollSchema from "../openpayroll.schema";
import * as opendesktopSchema from "../opendesktop.schema";
import * as openpipelineSchema from "../openpipeline.schema";
import * as openbountySchema from "../openbounty.schema";

// Seed functions
import { seedOpenmailer } from "./seed-openmailer";
import { seedOpenaccounting } from "./seed-openaccounting";
import { seedOpenlawyer } from "./seed-openlawyer";
import { seedOpensem } from "./seed-opensem";
import { seedOpenflow } from "./seed-openflow";
import { seedOpenpayroll } from "./seed-openpayroll";
import { seedOpendesktop } from "./seed-opendesktop";
import { seedOpenpipeline } from "./seed-openpipeline";
import { seedOpenbounty } from "./seed-openbounty";
import { seedIes } from "./seed-ies";

// ─── App Registry ───────────────────────────────────────────────────────────

const REPO_ROOT = resolve(__dirname, "../../../../");

interface AppSeedConfig {
  name: string;
  dbPath: string;
  schema: Record<string, unknown>;
  seed: (db: any) => Promise<void>;
}

const apps: AppSeedConfig[] = [
  {
    name: "openmailer",
    dbPath: resolve(REPO_ROOT, "apps/openmailer/data/openmailer.db"),
    schema: { ...sharedSchema, ...openmailerSchema },
    seed: seedOpenmailer,
  },
  {
    name: "openaccounting",
    dbPath: resolve(REPO_ROOT, "apps/openaccounting/data/openaccounting.db"),
    schema: { ...sharedSchema, ...openaccountingSchema },
    seed: seedOpenaccounting,
  },
  {
    name: "openlawyer",
    dbPath: resolve(REPO_ROOT, "apps/openlawyer/data/openlawyer.db"),
    schema: { ...sharedSchema, ...openlawSchema },
    seed: seedOpenlawyer,
  },
  {
    name: "opensem",
    dbPath: resolve(REPO_ROOT, "apps/opensem/data/opensem.db"),
    schema: { ...sharedSchema, ...opensemSchema },
    seed: seedOpensem,
  },
  {
    name: "openflow",
    dbPath: resolve(REPO_ROOT, "apps/openflow/data/openflow.db"),
    schema: {}, // openflow uses its own schema at app level
    seed: seedOpenflow,
  },
  {
    name: "openpayroll",
    dbPath: resolve(REPO_ROOT, "apps/openpayroll/data/openpayroll.db"),
    schema: { ...sharedSchema, ...openpayrollSchema },
    seed: seedOpenpayroll,
  },
  {
    name: "opendesktop",
    dbPath: resolve(REPO_ROOT, "apps/opendesktop/data/opendesktop.db"),
    schema: { ...sharedSchema, ...opendesktopSchema },
    seed: seedOpendesktop,
  },
  {
    name: "openpipeline",
    dbPath: resolve(REPO_ROOT, "apps/openpipeline/data/openpipeline.db"),
    schema: { ...sharedSchema, ...openpipelineSchema },
    seed: seedOpenpipeline,
  },
  {
    name: "openbounty",
    dbPath: resolve(REPO_ROOT, "apps/openbounty/data/openbounty.db"),
    schema: { ...sharedSchema, ...openbountySchema },
    seed: seedOpenbounty,
  },
  {
    // IES Maschinenpark — alternative seed-Variante für OpenDesktop.
    // Schreibt in eine separate DB (opendesktop-ies.db), damit die Mustermann-
    // Demo-Daten nicht überschrieben werden. Aufruf: --app=ies
    // Auf der echten On-Prem-OpenDesktop-Instanz bei IES wird DB_PATH via env
    // gesetzt (IES_OPENDESKTOP_DB) und zeigt auf den lokalen IES-Server.
    name: "ies",
    dbPath: process.env.IES_OPENDESKTOP_DB
      || resolve(REPO_ROOT, "apps/opendesktop/data/opendesktop-ies.db"),
    schema: { ...sharedSchema, ...opendesktopSchema },
    seed: seedIes,
  },
];

// ─── CLI Runner ─────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Parse --app=xxx flags
  const requestedApps = args
    .filter((a) => a.startsWith("--app="))
    .map((a) => a.replace("--app=", ""));

  const targets =
    requestedApps.length > 0
      ? apps.filter((a) => requestedApps.includes(a.name))
      : apps;

  if (targets.length === 0) {
    console.error(`No matching apps found. Available: ${apps.map((a) => a.name).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n🧪 Seeding Max Mustermann into ${targets.length} app(s)...\n`);

  let succeeded = 0;
  let failed = 0;

  for (const app of targets) {
    try {
      // Ensure data directory exists
      const dataDir = dirname(app.dbPath);
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true });
      }

      const { db, sqlite } = createDb(app.dbPath, app.schema);
      await app.seed(db);
      sqlite.close();

      console.log(`  ✅ ${app.name} — seeded successfully`);
      succeeded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ ${app.name} — ${msg}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${succeeded} succeeded, ${failed} failed out of ${targets.length}\n`);

  if (failed > 0) process.exit(1);
}

main();
