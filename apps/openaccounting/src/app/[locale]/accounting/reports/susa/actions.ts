"use server";

import { db, schema } from "@/db";
import { and, gte, lte } from "drizzle-orm";

export interface SusaLine {
  konto: string;
  bezeichnung: string;
  sollTotal: number;
  habenTotal: number;
  saldo: number;
}

export interface SusaData {
  period: string;
  lines: SusaLine[];
  totalSoll: number;
  totalHaben: number;
}

/**
 * Get Sum & Balance list (Summen- und Saldenliste) for a given period.
 * Aggregates debit/credit totals per account.
 */
export async function getSusaData(
  year: number,
  month: number
): Promise<SusaData> {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDay = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
  const period = `${String(month).padStart(2, "0")}/${year}`;

  try {
    const entries = await db
      .select()
      .from(schema.acctBookingEntries)
      .where(
        and(
          gte(schema.acctBookingEntries.datum, firstDay),
          lte(schema.acctBookingEntries.datum, endDay)
        )
      );

    // Get account names from Kontenplan
    const accounts = await db.select().from(schema.acctKonten);
    const accountNames = new Map(
      accounts.map((a) => [a.kontonummer, a.bezeichnung])
    );

    // Aggregate by account
    const accountTotals = new Map<
      string,
      { soll: number; haben: number }
    >();

    for (const entry of entries) {
      const current = accountTotals.get(entry.konto) || { soll: 0, haben: 0 };
      if (entry.sollHaben === "S") {
        current.soll += entry.betrag;
      } else {
        current.haben += entry.betrag;
      }
      accountTotals.set(entry.konto, current);
    }

    const lines: SusaLine[] = [];
    let totalSoll = 0;
    let totalHaben = 0;

    // Sort by account number
    const sortedAccounts = Array.from(accountTotals.entries()).sort(
      ([a], [b]) => a.localeCompare(b, undefined, { numeric: true })
    );

    for (const [konto, totals] of sortedAccounts) {
      const saldo = totals.soll - totals.haben;
      totalSoll += totals.soll;
      totalHaben += totals.haben;

      lines.push({
        konto,
        bezeichnung: accountNames.get(konto) || "(Unknown account)",
        sollTotal: totals.soll,
        habenTotal: totals.haben,
        saldo,
      });
    }

    return { period, lines, totalSoll, totalHaben };
  } catch {
    return { period, lines: [], totalSoll: 0, totalHaben: 0 };
  }
}
