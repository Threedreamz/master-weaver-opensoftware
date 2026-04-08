"use server";

import { db, schema } from "@/db";
import { and, gte, lte } from "drizzle-orm";

export interface GuvLine {
  label: string;
  amount: number;
  isTotal?: boolean;
  isSeparator?: boolean;
  indent?: number;
}

export interface GuvData {
  period: string;
  lines: GuvLine[];
  totalErtraege: number;
  totalAufwendungen: number;
  gewinnVerlust: number;
}

/**
 * Get Profit & Loss statement for a given period.
 */
export async function getGuvData(
  year: number,
  month: number
): Promise<GuvData> {
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

    // Revenue categories
    let umsatzerloese = 0;
    let sonstigeErtraege = 0;
    let zinsertraege = 0;

    // Expense categories
    let materialaufwand = 0;
    let personalaufwand = 0;
    let abschreibungen = 0;
    let sonstigeAufwendungen = 0;
    let zinsaufwand = 0;
    let steuern = 0;

    for (const entry of entries) {
      const konto = parseInt(entry.konto, 10);
      const amount = entry.sollHaben === "H" ? entry.betrag : -entry.betrag;

      // Revenue (Ertraege)
      if (konto >= 8000 && konto < 8400) umsatzerloese += amount;
      else if (konto >= 8400 && konto < 8800) sonstigeErtraege += amount;
      else if (konto >= 8800 && konto < 9000) zinsertraege += amount;
      // Expenses (Aufwendungen)
      else if (konto >= 3000 && konto < 4000) materialaufwand += Math.abs(amount);
      else if (konto >= 4000 && konto < 4200) personalaufwand += Math.abs(amount);
      else if (konto >= 4800 && konto < 4900) abschreibungen += Math.abs(amount);
      else if (konto >= 4200 && konto < 4800) sonstigeAufwendungen += Math.abs(amount);
      else if (konto >= 7000 && konto < 7100) zinsaufwand += Math.abs(amount);
      else if (konto >= 7600 && konto < 7700) steuern += Math.abs(amount);
    }

    const totalErtraege = umsatzerloese + sonstigeErtraege + zinsertraege;
    const totalAufwendungen =
      materialaufwand +
      personalaufwand +
      abschreibungen +
      sonstigeAufwendungen +
      zinsaufwand +
      steuern;
    const gewinnVerlust = totalErtraege - totalAufwendungen;

    const lines: GuvLine[] = [
      { label: "Ertraege (Revenue)", amount: 0, isSeparator: true },
      { label: "1. Umsatzerloese", amount: umsatzerloese, indent: 1 },
      { label: "2. Sonstige betriebliche Ertraege", amount: sonstigeErtraege, indent: 1 },
      { label: "3. Zinsertraege", amount: zinsertraege, indent: 1 },
      { label: "Summe Ertraege", amount: totalErtraege, isTotal: true },
      { label: "", amount: 0, isSeparator: true },
      { label: "Aufwendungen (Expenses)", amount: 0, isSeparator: true },
      { label: "4. Materialaufwand", amount: -materialaufwand, indent: 1 },
      { label: "5. Personalaufwand", amount: -personalaufwand, indent: 1 },
      { label: "6. Abschreibungen", amount: -abschreibungen, indent: 1 },
      { label: "7. Sonstige betriebliche Aufwendungen", amount: -sonstigeAufwendungen, indent: 1 },
      { label: "8. Zinsaufwand", amount: -zinsaufwand, indent: 1 },
      { label: "9. Steuern vom Einkommen / Ertrag", amount: -steuern, indent: 1 },
      { label: "Summe Aufwendungen", amount: -totalAufwendungen, isTotal: true },
      { label: "", amount: 0, isSeparator: true },
      {
        label: gewinnVerlust >= 0 ? "Gewinn (Profit)" : "Verlust (Loss)",
        amount: gewinnVerlust,
        isTotal: true,
      },
    ];

    return { period, lines, totalErtraege, totalAufwendungen, gewinnVerlust };
  } catch {
    return { period, lines: [], totalErtraege: 0, totalAufwendungen: 0, gewinnVerlust: 0 };
  }
}
