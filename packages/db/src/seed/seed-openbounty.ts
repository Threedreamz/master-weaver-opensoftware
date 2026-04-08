/**
 * OpenBounty (ZLE) seed — inserts Max Mustermann as employee with 2 tasks
 * and 5 work days of time entries (8h each).
 */
import { mustermannUser, mustermannBountyEmployee, MUSTERMANN_USER_ID } from "./mustermann";
import { users } from "../shared.schema";
import { zleMitarbeiter, zleAufgaben, zleProjekte, zleZeiteintraege } from "../openbounty.schema";
import type { DbClient } from "../create-db";

// Stable deterministic IDs
const EMPLOYEE_ID = "zle_ma_mustermann_001";
const PROJECT_ID = "zle_proj_ct_scanner_001";
const TASK_KALIBRIERUNG_ID = "zle_task_kalibrierung_001";
const TASK_FIRMWARE_ID = "zle_task_firmware_001";

/**
 * Returns a Date for {daysAgo} workdays before the reference date (2024-03-15),
 * skipping weekends.
 */
function workdaysBefore(daysAgo: number): Date {
  const ref = new Date("2024-03-15T08:00:00");
  let remaining = daysAgo;
  const d = new Date(ref);
  while (remaining > 0) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return d;
}

export async function seedOpenbounty(db: DbClient) {
  // 1. Shared user
  await db.insert(users).values(mustermannUser).onConflictDoNothing();

  // 2. Employee (zleMitarbeiter — the ZLE-local employee mirror)
  await db.insert(zleMitarbeiter).values({
    id: EMPLOYEE_ID,
    personalnummer: "PN-001",
    vorname: mustermannBountyEmployee.firstname,
    nachname: mustermannBountyEmployee.lastname,
    email: mustermannBountyEmployee.email,
    status: "aktiv",
    bundesland: "NW",
    wochenstunden: 40,
    tagstunden: 8,
    stundenlohn: 25,
    bruttoGehalt: 4333,
    hatAktivenVertrag: true,
  }).onConflictDoNothing();

  // 3. Project
  await db.insert(zleProjekte).values({
    id: PROJECT_ID,
    name: "CT-Scanner Wartung",
    kunde: "Mustermann GmbH",
    beschreibung: "Regelmäßige Wartung und Updates der CT-Scanner-Infrastruktur",
    budgetStunden: 160,
    stundensatz: 25,
    abrechenbar: true,
    status: "aktiv",
  }).onConflictDoNothing();

  // 4. Two tasks
  await db.insert(zleAufgaben).values([
    {
      id: TASK_KALIBRIERUNG_ID,
      projektId: PROJECT_ID,
      userId: MUSTERMANN_USER_ID,
      titel: "CT-Scanner Kalibrierung",
      beschreibung: "Quartalsweise Kalibrierung aller CT-Scanner-Einheiten gemäß Herstellervorgaben",
      prioritaet: "hoch" as const,
      status: "in_arbeit" as const,
      geschaetztStunden: 24,
      tatsaechlichStunden: 16,
      quelle: "manuell" as const,
      faelligAm: new Date("2024-03-22"),
    },
    {
      id: TASK_FIRMWARE_ID,
      projektId: PROJECT_ID,
      userId: MUSTERMANN_USER_ID,
      titel: "Firmware Update Drucker",
      beschreibung: "Firmware aller 3D-Drucker auf Version 4.2.1 aktualisieren und Testdrucke durchführen",
      prioritaet: "mittel" as const,
      status: "offen" as const,
      geschaetztStunden: 8,
      quelle: "manuell" as const,
      faelligAm: new Date("2024-03-29"),
    },
  ]).onConflictDoNothing();

  // 5. Five time entries — past 5 workdays, 8h each
  const timeEntries = [];
  for (let i = 0; i < 5; i++) {
    const day = workdaysBefore(i);
    const start = new Date(day);
    start.setHours(8, 0, 0, 0);
    const end = new Date(day);
    end.setHours(16, 0, 0, 0);

    // Alternate tasks: first 3 days on Kalibrierung, last 2 on Firmware
    const aufgabeId = i < 3 ? TASK_KALIBRIERUNG_ID : TASK_FIRMWARE_ID;

    timeEntries.push({
      id: `zle_zeit_mustermann_${String(i + 1).padStart(3, "0")}`,
      userId: MUSTERMANN_USER_ID,
      projektId: PROJECT_ID,
      aufgabeId,
      startzeit: start,
      endzeit: end,
      dauer: 8 * 3600, // 8 hours in seconds
      beschreibung: i < 3
        ? "Kalibrierungsarbeiten an CT-Scanner-Einheit"
        : "Firmware-Update Vorbereitung und Tests",
      abrechenbar: true,
      typ: "arbeitsplatz" as const,
      quelle: "manuell" as const,
      geloescht: false,
    });
  }

  for (const entry of timeEntries) {
    await db.insert(zleZeiteintraege).values(entry).onConflictDoNothing();
  }
}
