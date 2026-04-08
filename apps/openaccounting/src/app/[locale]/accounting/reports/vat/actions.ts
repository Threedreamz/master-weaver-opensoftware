"use server";

import {
  calculateUStVA,
  generateElsterXml,
  generateUStVASummaryHtml,
  type UStVAData,
  type UStVAPeriod,
} from "@/lib/vat";
import { db, schema } from "@/db";
import { gte, lte, and } from "drizzle-orm";

/**
 * Calculate UStVA data for the given period by fetching booking entries from DB.
 */
export async function getUStVAData(period: UStVAPeriod): Promise<UStVAData> {
  try {
    const entries = await db
      .select()
      .from(schema.acctBookingEntries)
      .where(
        and(
          gte(schema.acctBookingEntries.datum, period.from),
          lte(schema.acctBookingEntries.datum, period.to)
        )
      );

    return calculateUStVA(
      entries.map((e) => ({
        datum: e.datum,
        betrag: e.betrag,
        sollHaben: e.sollHaben as "S" | "H",
        konto: e.konto,
        gegenkonto: e.gegenkonto,
        buchungstext: e.buchungstext,
        steuerschluessel: e.steuerschluessel,
      })),
      period
    );
  } catch {
    // DB not available — return zero data
    return calculateUStVA([], period);
  }
}

/**
 * Generate ELSTER XML for download.
 */
export async function exportElsterXml(
  period: UStVAPeriod
): Promise<{ content: string; filename: string }> {
  const data = await getUStVAData(period);
  const content = generateElsterXml(data);
  const filename = `UStVA_${data.zeitraum}_ELSTER.xml`;
  return { content, filename };
}

/**
 * Generate a printable HTML summary for download/print.
 */
export async function exportUStVASummary(
  period: UStVAPeriod
): Promise<{ content: string; filename: string }> {
  const data = await getUStVAData(period);
  const content = generateUStVASummaryHtml(data);
  const filename = `UStVA_${data.zeitraum}_Summary.html`;
  return { content, filename };
}
