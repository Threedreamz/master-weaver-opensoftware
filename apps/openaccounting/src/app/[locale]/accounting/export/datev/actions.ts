"use server";

import { db, schema } from "@/db";
import { gte, lte, and } from "drizzle-orm";
import {
  generateDatevCsv,
  generateDatevXml,
  type DatevExportOptions,
  type DatevBuchung,
} from "@/lib/datev";
import type { BookingEntry } from "@/lib/vat";

/**
 * Fetch booking entries from the database for the given date range,
 * map them to DATEV Buchungen, and generate the export.
 */
export async function exportDatev(
  options: DatevExportOptions
): Promise<{ content: string; filename: string; entryCount: number }> {
  const buchungen = await fetchBuchungen(options);

  const ext = options.format === "xml" ? "xml" : "csv";
  const filename = `DATEV_${options.kontenrahmen}_${options.dateFrom}_${options.dateTo}.${ext}`;

  const content =
    options.format === "xml"
      ? generateDatevXml(buchungen, options)
      : generateDatevCsv(buchungen, options);

  return { content, filename, entryCount: buchungen.length };
}

/**
 * Fetch booking entries from DB and convert to DatevBuchung format.
 */
async function fetchBuchungen(
  options: DatevExportOptions
): Promise<DatevBuchung[]> {
  try {
    const entries = await db
      .select()
      .from(schema.acctBookingEntries)
      .where(
        and(
          gte(schema.acctBookingEntries.datum, options.dateFrom),
          lte(schema.acctBookingEntries.datum, options.dateTo)
        )
      )
      .orderBy(schema.acctBookingEntries.datum);

    return entries.map((entry) => ({
      umsatz: Math.abs(entry.betrag),
      sollHaben: entry.sollHaben as "S" | "H",
      kontoNummer: entry.konto,
      gegenKonto: entry.gegenkonto,
      datum: entry.datum,
      buchungstext: entry.buchungstext,
      belegNummer: entry.belegnummer || undefined,
      steuerschluessel: entry.steuerschluessel || undefined,
      kostenstelle: entry.kostenstelle || undefined,
    }));
  } catch {
    // DB not available — return empty
    return [];
  }
}

/**
 * Get a preview of account mappings for the selected Kontenrahmen.
 * Shows which internal accounts map to which SKR accounts.
 */
export async function getAccountMappingPreview(
  kontenrahmen: "SKR03" | "SKR04"
): Promise<
  Array<{
    kontonummer: string;
    bezeichnung: string;
    skrName: string;
    category: string;
  }>
> {
  const { lookupAccount } = await import("@/lib/datev");

  try {
    const accounts = await db.select().from(schema.acctKonten);

    return accounts.map((acct) => {
      const skrInfo = lookupAccount(acct.kontonummer, kontenrahmen);
      return {
        kontonummer: acct.kontonummer,
        bezeichnung: acct.bezeichnung,
        skrName: skrInfo?.name || "(unmapped)",
        category: skrInfo?.category || "Unknown",
      };
    });
  } catch {
    return [];
  }
}
