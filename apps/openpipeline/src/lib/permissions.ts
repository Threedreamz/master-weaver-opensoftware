import type { PipelineMitglied } from "@opensoftware/db/openpipeline";

export function getPipelineRolle(
  userId: string,
  mitglieder: PipelineMitglied[],
): "vorgesetzter" | "zuarbeiter" | null {
  const mitglied = mitglieder.find((m) => m.userId === userId);
  return mitglied?.rolle ?? null;
}

export function kannBeschreibungBearbeiten(rolle: string | null): boolean {
  return rolle === "vorgesetzter";
}

export function kannKarteBearbeiten(
  rolle: string | null,
  stufeId: string,
  zugewieseneStufen: string[] | null,
): boolean {
  if (rolle === "vorgesetzter") return true;
  if (rolle !== "zuarbeiter") return false;
  // Zuarbeiter ohne Stufenzuweisung darf in allen Stufen arbeiten
  if (!zugewieseneStufen || zugewieseneStufen.length === 0) return true;
  return zugewieseneStufen.includes(stufeId);
}

export function kannStufeVerwalten(rolle: string | null): boolean {
  return rolle === "vorgesetzter";
}

export function kannMitgliederVerwalten(rolle: string | null): boolean {
  return rolle === "vorgesetzter";
}
