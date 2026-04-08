"use server";

import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";

export type KontoRow = typeof schema.acctKonten.$inferSelect;

export async function getKonten(
  kontenrahmen?: "SKR03" | "SKR04"
): Promise<KontoRow[]> {
  try {
    if (kontenrahmen) {
      return await db
        .select()
        .from(schema.acctKonten)
        .where(eq(schema.acctKonten.kontenrahmen, kontenrahmen))
        .orderBy(schema.acctKonten.kontonummer);
    }
    return await db
      .select()
      .from(schema.acctKonten)
      .orderBy(schema.acctKonten.kontonummer);
  } catch {
    return [];
  }
}

export async function createKonto(data: {
  kontonummer: string;
  bezeichnung: string;
  typ: "aktiv" | "passiv" | "aufwand" | "ertrag";
  kontenrahmen?: "SKR03" | "SKR04";
  kontenklasse?: string;
  parentKonto?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await db.insert(schema.acctKonten).values({
      kontonummer: data.kontonummer,
      bezeichnung: data.bezeichnung,
      typ: data.typ,
      kontenrahmen: data.kontenrahmen || "SKR03",
      kontenklasse: data.kontenklasse || null,
      parentKonto: data.parentKonto || null,
      isActive: true,
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create account",
    };
  }
}

/**
 * Seed default SKR03 accounts if no accounts exist yet.
 * Returns number of accounts created.
 */
export async function seedDefaultKonten(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    // Check if there are already accounts
    const existing = await db.select().from(schema.acctKonten).limit(1);
    if (existing.length > 0) {
      return { success: false, count: 0, error: "Accounts already exist. Seeding skipped." };
    }

    const defaults: Array<{
      kontonummer: string;
      bezeichnung: string;
      typ: "aktiv" | "passiv" | "aufwand" | "ertrag";
      kontenklasse: string;
    }> = [
      // Class 0 - Anlage- und Kapitalkonten
      { kontonummer: "0200", bezeichnung: "Technische Anlagen und Maschinen", typ: "aktiv", kontenklasse: "0" },
      { kontonummer: "0400", bezeichnung: "Betriebsausstattung", typ: "aktiv", kontenklasse: "0" },
      { kontonummer: "0410", bezeichnung: "Geschaeftsausstattung", typ: "aktiv", kontenklasse: "0" },
      { kontonummer: "0650", bezeichnung: "Bueroeinrichtung", typ: "aktiv", kontenklasse: "0" },
      // Class 1 - Finanz- und Privatkonten
      { kontonummer: "1000", bezeichnung: "Kasse", typ: "aktiv", kontenklasse: "1" },
      { kontonummer: "1200", bezeichnung: "Bank", typ: "aktiv", kontenklasse: "1" },
      { kontonummer: "1400", bezeichnung: "Forderungen aus Lieferungen und Leistungen", typ: "aktiv", kontenklasse: "1" },
      { kontonummer: "1600", bezeichnung: "Verbindlichkeiten aus Lieferungen und Leistungen", typ: "passiv", kontenklasse: "1" },
      { kontonummer: "1700", bezeichnung: "Sonstige Verbindlichkeiten", typ: "passiv", kontenklasse: "1" },
      { kontonummer: "1770", bezeichnung: "Umsatzsteuer 7%", typ: "passiv", kontenklasse: "1" },
      { kontonummer: "1776", bezeichnung: "Umsatzsteuer 19%", typ: "passiv", kontenklasse: "1" },
      { kontonummer: "1570", bezeichnung: "Abziehbare Vorsteuer 7%", typ: "aktiv", kontenklasse: "1" },
      { kontonummer: "1576", bezeichnung: "Abziehbare Vorsteuer 19%", typ: "aktiv", kontenklasse: "1" },
      // Class 2 - Abgrenzungskonten
      { kontonummer: "2000", bezeichnung: "Eigenkapital", typ: "passiv", kontenklasse: "2" },
      // Class 3 - Wareneingangskonten
      { kontonummer: "3200", bezeichnung: "Wareneingang 7% Vorsteuer", typ: "aufwand", kontenklasse: "3" },
      { kontonummer: "3300", bezeichnung: "Wareneingang 19% Vorsteuer", typ: "aufwand", kontenklasse: "3" },
      { kontonummer: "3400", bezeichnung: "Wareneingang 19% Vorsteuer", typ: "aufwand", kontenklasse: "3" },
      // Class 4 - Betriebliche Aufwendungen
      { kontonummer: "4100", bezeichnung: "Loehne und Gehaelter", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4120", bezeichnung: "Gehaelter", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4130", bezeichnung: "Gesetzliche soziale Aufwendungen", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4200", bezeichnung: "Raumkosten", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4210", bezeichnung: "Miete", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4240", bezeichnung: "Gas, Strom, Wasser", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4300", bezeichnung: "Beitraege und Versicherungen", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4400", bezeichnung: "Besondere Kosten", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4500", bezeichnung: "Fahrzeugkosten", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4600", bezeichnung: "Werbekosten", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4654", bezeichnung: "Porto", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4663", bezeichnung: "Telefon / Internet", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4700", bezeichnung: "Kosten der Warenabgabe", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4900", bezeichnung: "Sonstige Aufwendungen", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4930", bezeichnung: "Buerokosten", typ: "aufwand", kontenklasse: "4" },
      { kontonummer: "4980", bezeichnung: "Bankgebuehren", typ: "aufwand", kontenklasse: "4" },
      // Class 7 - Bestandsveraenderungen und aktivierte Eigenleistungen
      // Class 8 - Erloeskonten
      { kontonummer: "8100", bezeichnung: "Erloese 7% USt", typ: "ertrag", kontenklasse: "8" },
      { kontonummer: "8200", bezeichnung: "Erloese 7% USt (Kleinunternehmer)", typ: "ertrag", kontenklasse: "8" },
      { kontonummer: "8300", bezeichnung: "Erloese 7% USt", typ: "ertrag", kontenklasse: "8" },
      { kontonummer: "8400", bezeichnung: "Erloese 19% USt", typ: "ertrag", kontenklasse: "8" },
      { kontonummer: "8700", bezeichnung: "Erloese aus Nebenleistungen", typ: "ertrag", kontenklasse: "8" },
      { kontonummer: "8900", bezeichnung: "Sonstige Erloese", typ: "ertrag", kontenklasse: "8" },
    ];

    for (const konto of defaults) {
      await db.insert(schema.acctKonten).values({
        ...konto,
        kontenrahmen: "SKR03",
        isActive: true,
      });
    }

    return { success: true, count: defaults.length };
  } catch (err) {
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : "Failed to seed accounts",
    };
  }
}
