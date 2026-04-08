"use server";

import { db, schema } from "@/db";
import { desc, and, gte, lte, eq, sql } from "drizzle-orm";

export async function getExportHistory() {
  try {
    const exports = await db
      .select()
      .from(schema.acctExports)
      .orderBy(desc(schema.acctExports.createdAt))
      .limit(20);
    return exports;
  } catch {
    return [];
  }
}

export async function createCsvExport(options: {
  fromDate: string;
  toDate: string;
}) {
  try {
    // Fetch booking entries for the period
    const entries = await db
      .select()
      .from(schema.acctBookingEntries)
      .where(
        and(
          gte(schema.acctBookingEntries.datum, options.fromDate),
          lte(schema.acctBookingEntries.datum, options.toDate)
        )
      )
      .orderBy(schema.acctBookingEntries.datum);

    // Generate CSV content
    const header = `"Datum","Betrag","Soll/Haben","Konto","Gegenkonto","Buchungstext","Belegnummer","Status"`;
    const rows = entries.map(
      (e) =>
        `"${e.datum}","${e.betrag.toFixed(2)}","${e.sollHaben}","${e.konto}","${e.gegenkonto}","${(e.buchungstext || "").replace(/"/g, '""')}","${e.belegnummer || ""}","${e.status || ""}"`
    );
    const csvContent = `${header}\n${rows.join("\n")}`;

    // Record the export
    const filename = `CSV_Export_${options.fromDate}_${options.toDate}.csv`;

    await db.insert(schema.acctExports).values({
      exportType: "csv",
      fromDate: options.fromDate,
      toDate: options.toDate,
      transactionsCount: entries.length,
      status: "erstellt",
      filePath: filename,
    });

    return {
      success: true,
      content: csvContent,
      filename,
      entryCount: entries.length,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
