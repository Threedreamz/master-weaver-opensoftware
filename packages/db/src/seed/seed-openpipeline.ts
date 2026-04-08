/**
 * OpenPipeline seed — inserts an Onboarding pipeline with 4 stages and 3 cards
 * for Max Mustermann's employee onboarding process.
 */
import { mustermannUser, mustermannPipeline, MUSTERMANN_USER_ID } from "./mustermann";
import { users } from "../shared.schema";
import { pipPipelines, pipStufen, pipKarten } from "../openpipeline.schema";
import type { DbClient } from "../create-db";

// Stable deterministic IDs
const PIPELINE_ID = "pip_onboarding_mustermann_001";
const STUFE_VORBEREITUNG_ID = "stufe_vorbereitung_001";
const STUFE_EINARBEITUNG_ID = "stufe_einarbeitung_001";
const STUFE_SCHULUNG_ID = "stufe_schulung_001";
const STUFE_ABGESCHLOSSEN_ID = "stufe_abgeschlossen_001";
const KARTE_VERTRAG_ID = "karte_vertrag_001";
const KARTE_IT_ID = "karte_it_equipment_001";
const KARTE_SCHULUNG_ID = "karte_sicherheit_001";

export async function seedOpenpipeline(db: DbClient) {
  // 1. Shared user
  await db.insert(users).values(mustermannUser).onConflictDoNothing();

  // 2. Pipeline (from mustermann.ts canonical data)
  await db.insert(pipPipelines).values({
    id: PIPELINE_ID,
    ...mustermannPipeline,
  }).onConflictDoNothing();

  // 3. Four stages
  const stufen = [
    {
      id: STUFE_VORBEREITUNG_ID,
      pipelineId: PIPELINE_ID,
      name: "Vorbereitung",
      beschreibung: "Vorbereitende Aufgaben vor dem ersten Arbeitstag",
      position: 0,
      farbe: "#F59E0B",
      istEndStufe: false,
    },
    {
      id: STUFE_EINARBEITUNG_ID,
      pipelineId: PIPELINE_ID,
      name: "Einarbeitung",
      beschreibung: "Erste Wochen — Arbeitsplatz, Tools, Prozesse kennenlernen",
      position: 1,
      farbe: "#3B82F6",
      istEndStufe: false,
    },
    {
      id: STUFE_SCHULUNG_ID,
      pipelineId: PIPELINE_ID,
      name: "Schulung",
      beschreibung: "Pflichtschulungen und Zertifizierungen",
      position: 2,
      farbe: "#8B5CF6",
      istEndStufe: false,
    },
    {
      id: STUFE_ABGESCHLOSSEN_ID,
      pipelineId: PIPELINE_ID,
      name: "Abgeschlossen",
      beschreibung: "Erledigte Aufgaben",
      position: 3,
      farbe: "#10B981",
      istEndStufe: true,
    },
  ];

  for (const stufe of stufen) {
    await db.insert(pipStufen).values(stufe).onConflictDoNothing();
  }

  // 4. Three cards across different stages
  const karten = [
    {
      id: KARTE_VERTRAG_ID,
      pipelineId: PIPELINE_ID,
      stufeId: STUFE_ABGESCHLOSSEN_ID,
      titel: "Arbeitsvertrag unterschreiben",
      beschreibung: "Arbeitsvertrag prüfen und unterschrieben an HR zurücksenden",
      prioritaet: "hoch" as const,
      status: "erledigt" as const,
      position: 0,
      zugewiesenAn: MUSTERMANN_USER_ID,
      geschaetztStunden: 1,
      tatsaechlichStunden: 0.5,
      erledigtAm: new Date("2024-01-02"),
      quelle: "manuell" as const,
    },
    {
      id: KARTE_IT_ID,
      pipelineId: PIPELINE_ID,
      stufeId: STUFE_EINARBEITUNG_ID,
      titel: "IT-Equipment einrichten",
      beschreibung: "Laptop, Monitore, VPN-Zugang und Entwicklungsumgebung konfigurieren",
      prioritaet: "hoch" as const,
      status: "in_arbeit" as const,
      position: 0,
      zugewiesenAn: MUSTERMANN_USER_ID,
      geschaetztStunden: 4,
      tatsaechlichStunden: 2,
      faelligAm: new Date("2024-01-10"),
      quelle: "manuell" as const,
    },
    {
      id: KARTE_SCHULUNG_ID,
      pipelineId: PIPELINE_ID,
      stufeId: STUFE_VORBEREITUNG_ID,
      titel: "Sicherheitsschulung",
      beschreibung: "Arbeitssicherheits- und Brandschutzunterweisung gemäß ArbSchG",
      prioritaet: "mittel" as const,
      status: "offen" as const,
      position: 0,
      zugewiesenAn: MUSTERMANN_USER_ID,
      geschaetztStunden: 2,
      faelligAm: new Date("2024-01-15"),
      quelle: "manuell" as const,
    },
  ];

  for (const karte of karten) {
    await db.insert(pipKarten).values(karte).onConflictDoNothing();
  }
}
