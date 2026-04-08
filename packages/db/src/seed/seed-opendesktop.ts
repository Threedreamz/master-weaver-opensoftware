/**
 * OpenDesktop seed — inserts a building, zone, workstation, and equipment
 * for Max Mustermann's office workspace.
 */
import { mustermannUser, mustermannWorkstation, MUSTERMANN_USER_ID } from "./mustermann";
import { users } from "../shared.schema";
import { deskBuildings, deskZones, deskWorkstations, deskEquipment } from "../opendesktop.schema";
import type { DbClient } from "../create-db";

// Stable deterministic IDs for cross-seed consistency
const BUILDING_ID = "bld_mustermann_hauptsitz_001";
const ZONE_ID = "zone_buero_eg_001";
const WORKSTATION_ID = "ws_max_mustermann_001";
const EQUIPMENT_COMPUTER_ID = "eq_computer_001";
const EQUIPMENT_MONITOR_ID = "eq_monitor_001";

export async function seedOpendesktop(db: DbClient) {
  // 1. Shared user
  await db.insert(users).values(mustermannUser).onConflictDoNothing();

  // 2. Building
  await db.insert(deskBuildings).values({
    id: BUILDING_ID,
    name: "Mustermann GmbH Hauptsitz",
    address: "Musterstraße 1, 40210 Düsseldorf",
    description: "Hauptgebäude der Mustermann GmbH mit Büro- und Produktionsflächen",
    isActive: true,
  }).onConflictDoNothing();

  // 3. Zone
  await db.insert(deskZones).values({
    id: ZONE_ID,
    buildingId: BUILDING_ID,
    name: "Büro Erdgeschoss",
    type: "room",
    floor: 0,
    capacity: 8,
    description: "Offenes Büro im Erdgeschoss für das Kernteam",
    color: "#4A90D9",
    sortOrder: 1,
    isActive: true,
  }).onConflictDoNothing();

  // 4. Workstation (from mustermann.ts canonical data)
  await db.insert(deskWorkstations).values({
    id: WORKSTATION_ID,
    zoneId: ZONE_ID,
    ...mustermannWorkstation,
  }).onConflictDoNothing();

  // 5. Equipment — computer + monitor
  await db.insert(deskEquipment).values([
    {
      id: EQUIPMENT_COMPUTER_ID,
      workstationId: WORKSTATION_ID,
      name: "Dell OptiPlex 7090",
      category: "computer" as const,
      serialNumber: "DELL-7090-MX001",
      status: "operational" as const,
      purchaseDate: new Date("2024-01-15"),
      warrantyUntil: new Date("2027-01-15"),
      notes: "i7-11700, 32GB RAM, 1TB NVMe — Hauptrechner Teamleiter",
    },
    {
      id: EQUIPMENT_MONITOR_ID,
      workstationId: WORKSTATION_ID,
      name: "Dell UltraSharp U2723QE",
      category: "monitor" as const,
      serialNumber: "DELL-U2723-MX001",
      status: "operational" as const,
      purchaseDate: new Date("2024-01-15"),
      warrantyUntil: new Date("2027-01-15"),
      notes: "27\" 4K IPS — USB-C Hub-Monitor",
    },
  ]).onConflictDoNothing();
}
