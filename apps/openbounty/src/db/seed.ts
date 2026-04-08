/**
 * OpenBounty Database Seed — creates initial data
 * Run: pnpm --filter openbounty db:seed
 *
 * NOTE: Max Mustermann canonical data lives in packages/db/src/seed/mustermann.ts
 * For cross-app seeding use: pnpm db:seed (from repo root)
 */
import { createDb } from "@opensoftware/db";
import { maxMustermann } from "@opensoftware/db/src/seed/mustermann";
import * as schema from "./schema";

const { db, sqlite } = createDb("openbounty.db", schema as Record<string, unknown>);

function id() {
  return Math.random().toString(36).substring(2, 14);
}

async function seed() {
  console.log("Seeding OpenBounty database...");

  // --- Mitarbeiter (synced from OpenPayroll) ---
  const maMax = id();
  const maLisa = id();
  const maTom = id();

  db.insert(schema.zleMitarbeiter).values([
    {
      id: maMax,
      openpayrollId: 1,
      personalnummer: maxMustermann.personalNr,
      vorname: maxMustermann.firstName,
      nachname: maxMustermann.lastName,
      email: maxMustermann.email,
      status: "aktiv",
      bundesland: "NW",
      wochenstunden: 40,
      tagstunden: 8,
      stundenlohn: 25,
      bruttoGehalt: 4333,
      hatAktivenVertrag: true,
      syncedAt: new Date(),
      syncHash: "seed-initial",
    },
    {
      id: maLisa,
      openpayrollId: 2,
      personalnummer: "PN-002",
      vorname: "Lisa",
      nachname: "Mueller",
      email: "lisa@example.com",
      status: "aktiv",
      bundesland: "NW",
      wochenstunden: 40,
      tagstunden: 8,
      stundenlohn: 28,
      bruttoGehalt: 4853,
      hatAktivenVertrag: true,
      syncedAt: new Date(),
      syncHash: "seed-initial",
    },
    {
      id: maTom,
      openpayrollId: 3,
      personalnummer: "PN-003",
      vorname: "Tom",
      nachname: "Schmidt",
      email: "tom@example.com",
      status: "aktiv",
      bundesland: "NW",
      wochenstunden: 30,
      tagstunden: 6,
      stundenlohn: 22,
      bruttoGehalt: 2860,
      hatAktivenVertrag: true,
      syncedAt: new Date(),
      syncHash: "seed-initial",
    },
  ]).run();

  console.log("  3 Mitarbeiter erstellt (Max, Lisa, Tom)");

  // --- Teams ---
  const teamCT = id();

  db.insert(schema.zleTeams).values({
    id: teamCT,
    name: "CT-Scanner Team",
    beschreibung: "Team fuer CT-Scan-Auftraege und Qualitaetspruefung",
    leiterId: maMax,
  }).run();

  db.insert(schema.zleTeamMitglieder).values([
    { teamId: teamCT, mitarbeiterId: maMax, rolle: "leiter" },
    { teamId: teamCT, mitarbeiterId: maTom, rolle: "mitglied" },
  ]).run();

  console.log("  1 Team erstellt (CT-Scanner Team: Max + Tom)");

  // --- Arbeitsplaetze ---
  const apCT = id();
  const apBuero = id();
  const apRemote = id();
  const apMarketing = id();

  db.insert(schema.zleArbeitsplaetze).values([
    {
      id: apCT,
      name: "WinWerth CT-Scanner",
      standort: "Halle 2",
      typ: "maschine",
      profilId: "autopilot",
      ecosystemId: "autopilot",
      maschinenTyp: "ct-scanner",
      konfiguration: {
        widgets: ["todos", "dokumentation", "timer", "maschinen-status", "scan-queue"],
        todoKategorien: ["scan-auftrag", "kalibrierung", "wartung", "qualitaetspruefung", "allgemein"],
        eventQuellen: ["autopilot.scan.started", "autopilot.scan.completed", "autopilot.scan.failed"],
      },
      dokumentation: [
        { titel: "CT-Scanner Bedienungsanleitung", typ: "anleitung" as const, inhalt: "Grundlegende Schritte fuer den CT-Scan-Workflow." },
        { titel: "Sicherheitshinweise", typ: "sicherheit" as const, inhalt: "Strahlenschutz-Richtlinien." },
        { titel: "Kalibrierungsprotokoll", typ: "wartung" as const, inhalt: "Hell-/Dunkelkorrektur alle 4h." },
      ],
      autoLogoutMinuten: 480,
      aktiv: true,
    },
    {
      id: apBuero,
      name: "Buero Entwicklung",
      standort: "Buero 1",
      typ: "desktop",
      profilId: "office",
      konfiguration: {
        widgets: ["todos", "timer", "proof-of-work", "meetings"],
        todoKategorien: ["entwicklung", "meeting", "dokumentation", "review", "allgemein"],
        eventQuellen: [],
      },
      dokumentation: [],
      autoLogoutMinuten: 600,
      aktiv: true,
    },
    {
      id: apRemote,
      name: "Home Office Entwicklung",
      standort: "Remote",
      typ: "remote",
      profilId: "remote",
      konfiguration: {
        widgets: ["todos", "timer", "proof-of-work", "meetings"],
        todoKategorien: ["entwicklung", "meeting", "dokumentation", "review", "allgemein"],
        eventQuellen: [],
      },
      dokumentation: [],
      autoLogoutMinuten: 600,
      aktiv: true,
    },
    {
      id: apMarketing,
      name: "Home Office Marketing",
      standort: "Remote",
      typ: "remote",
      profilId: "performance-marketing",
      ecosystemId: "opensoftware",
      konfiguration: {
        widgets: ["todos", "timer", "proof-of-work", "meetings", "seo-dashboard"],
        todoKategorien: ["seo-audit", "keyword-recherche", "competitor-analyse", "content-optimierung", "reporting", "link-building", "allgemein"],
        eventQuellen: ["opensem.audit.completed", "opensem.keyword.tracked", "opensem.report.generated", "opensem.competitor.analyzed"],
      },
      dokumentation: [
        { titel: "SEO-Audit Checkliste", typ: "anleitung" as const, inhalt: "Monatlicher Site-Audit." },
        { titel: "Keyword-Strategie", typ: "anleitung" as const, inhalt: "Keyword-Recherche-Workflow." },
      ],
      autoLogoutMinuten: 600,
      aktiv: true,
    },
  ]).run();

  console.log("  4 Arbeitsplaetze erstellt");

  // --- Projekte ---
  const projCT = id();
  const projMW = id();
  const projSEO = id();

  db.insert(schema.zleProjekte).values([
    { id: projCT, name: "CT-Scanning Auftraege", kunde: "Intern", ecosystemId: "autopilot", status: "aktiv", abrechenbar: true, color: "#3b82f6" },
    { id: projMW, name: "Master Weaver Entwicklung", kunde: "Intern", ecosystemId: "master-weaver", status: "aktiv", abrechenbar: false, color: "#8b5cf6" },
    { id: projSEO, name: "SEO & Performance Marketing", kunde: "Intern", ecosystemId: "opensoftware", status: "aktiv", abrechenbar: true, color: "#10b981" },
  ]).run();

  console.log("  3 Projekte erstellt");

  // --- Aufgaben / TODOs ---
  db.insert(schema.zleAufgaben).values([
    { id: id(), projektId: projCT, userId: maMax, titel: "Scan-Job #42: Gehaeuse-Prototyp", prioritaet: "hoch", status: "offen", quelle: "manuell", arbeitsplatzId: apCT, geschaetztStunden: 2 },
    { id: id(), projektId: projCT, userId: maMax, titel: "Kalibrierung durchfuehren", prioritaet: "mittel", status: "offen", quelle: "manuell", arbeitsplatzId: apCT, geschaetztStunden: 0.5 },
    { id: id(), projektId: projCT, userId: maTom, titel: "Wartungsprotokoll aktualisieren", prioritaet: "niedrig", status: "offen", quelle: "manuell", arbeitsplatzId: apCT },
    { id: id(), projektId: projMW, userId: maTom, titel: "ZLE Meeting-Integration", prioritaet: "hoch", status: "offen", quelle: "manuell", arbeitsplatzId: apBuero, geschaetztStunden: 8 },
    { id: id(), projektId: projMW, userId: maTom, titel: "Proof-of-Work Dashboard UI", prioritaet: "mittel", status: "offen", quelle: "manuell", arbeitsplatzId: apBuero, geschaetztStunden: 4 },
    { id: id(), projektId: projSEO, userId: maLisa, titel: "Monatlicher SEO-Audit: finderfinder.org", prioritaet: "hoch", status: "offen", quelle: "manuell", arbeitsplatzId: apMarketing, geschaetztStunden: 3 },
    { id: id(), projektId: projSEO, userId: maLisa, titel: "Keyword-Recherche: 3D-Druck Ersatzteile", prioritaet: "mittel", status: "offen", quelle: "manuell", arbeitsplatzId: apMarketing, geschaetztStunden: 4 },
    { id: id(), projektId: projSEO, userId: maLisa, titel: "Competitor-Analyse: Wettbewerber-Ranking", prioritaet: "mittel", status: "offen", quelle: "manuell", arbeitsplatzId: apMarketing, geschaetztStunden: 2 },
  ]).run();

  console.log("  8 TODOs erstellt");

  // --- Arbeitsvertraege ---
  db.insert(schema.zleArbeitsvertraege).values([
    { id: id(), userId: maMax, wochenstunden: 40, tagstunden: 8, urlaubstage: 30, gueltigAb: "2026-01-01", ueberstundenRegelung: "beides" },
    { id: id(), userId: maLisa, wochenstunden: 40, tagstunden: 8, urlaubstage: 30, gueltigAb: "2026-01-01", ueberstundenRegelung: "abfeiern" },
    { id: id(), userId: maTom, wochenstunden: 30, tagstunden: 6, urlaubstage: 24, gueltigAb: "2026-02-01", ueberstundenRegelung: "beides" },
  ]).run();

  console.log("  3 Arbeitsvertraege erstellt");

  console.log("\nSeed abgeschlossen!");
  sqlite.close();
}

seed().catch((err) => {
  console.error("Seed fehlgeschlagen:", err);
  process.exit(1);
});
