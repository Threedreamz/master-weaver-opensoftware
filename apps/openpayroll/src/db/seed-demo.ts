/**
 * OpenPayroll Demo Seed — Creates Max Mustermann for cross-app testing
 * Run: cd apps/openpayroll && npx tsx src/db/seed-demo.ts
 *
 * NOTE: Max Mustermann canonical data lives in packages/db/src/seed/mustermann.ts
 * For cross-app seeding use: pnpm db:seed (from repo root)
 */
import { createDb } from "@opensoftware/db";
import { mustermannEmployee } from "@opensoftware/db/src/seed/mustermann";
import * as schema from "./schema";

const { db, sqlite } = createDb("openpayroll.db", schema as Record<string, unknown>);

async function seed() {
  console.log("Seeding OpenPayroll demo data...");

  // Demo Mitarbeiter: Max Mustermann — canonical data from packages/db/src/seed/mustermann.ts
  db.insert(schema.payMitarbeiter).values([
    mustermannEmployee,
    {
      personalnummer: "PN-002",
      vorname: "Lisa",
      nachname: "Mueller",
      geburtsdatum: "1992-08-22",
      eintrittsdatum: "2024-03-01",
      steuerklasse: 1,
      bundesland: "NW",
      bruttoGehalt: 4853,
      stundenlohn: 28,
      arbeitsstundenProWoche: 40,
      status: "aktiv",
    },
    {
      personalnummer: "PN-003",
      vorname: "Tom",
      nachname: "Schmidt",
      geburtsdatum: "1995-11-03",
      eintrittsdatum: "2025-02-01",
      steuerklasse: 1,
      bundesland: "NW",
      bruttoGehalt: 2860,
      stundenlohn: 22,
      arbeitsstundenProWoche: 30,
      status: "aktiv",
    },
  ]).run();

  console.log("  3 Mitarbeiter angelegt (Max PN-001, Lisa PN-002, Tom PN-003)");

  // Demo Lohnarten
  db.insert(schema.payLohnarten).values([
    { nummer: "1000", bezeichnung: "Grundgehalt", typ: "brutto", steuerpflichtig: true, svPflichtig: true },
    { nummer: "1500", bezeichnung: "Überstundenvergütung", typ: "brutto", steuerpflichtig: true, svPflichtig: true },
    { nummer: "2000", bezeichnung: "Fahrtkosten", typ: "netto", steuerpflichtig: false, svPflichtig: false },
  ]).run();

  console.log("  3 Lohnarten angelegt");

  // Integration connection for OpenBounty
  db.insert(schema.integrationConnections).values({
    id: "openbounty-sync",
    name: "OpenBounty Stunden-Sync",
    type: "api",
    baseUrl: "http://localhost:4670",
    authType: "api_key",
    status: "active",
    config: { description: "Receives monthly hours from OpenBounty for payroll calculation" },
  }).run();

  console.log("  1 Integration Connection (OpenBounty) angelegt");

  console.log("\nDemo-Seed abgeschlossen!");
  sqlite.close();
}

seed().catch((err) => {
  console.error("Seed fehlgeschlagen:", err);
  process.exit(1);
});
