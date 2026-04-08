"use server";

import { db, schema } from "@/db";
import { and, gte, lte, sql } from "drizzle-orm";

export interface BilanzItem {
  label: string;
  amount: number;
  indent?: number;
  isTotal?: boolean;
}

export interface BilanzData {
  period: string;
  aktiva: BilanzItem[];
  passiva: BilanzItem[];
  totalAktiva: number;
  totalPassiva: number;
}

/**
 * Get balance sheet data by aggregating booking entries up to the given date.
 * Groups by account type (aktiv/passiv) based on the Kontenplan.
 */
export async function getBilanzData(year: number, month: number): Promise<BilanzData> {
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
  const period = `${String(month).padStart(2, "0")}/${year}`;

  try {
    // Get all booking entries up to the period end
    const entries = await db
      .select()
      .from(schema.acctBookingEntries)
      .where(lte(schema.acctBookingEntries.datum, endDate));

    // Get account metadata
    const accounts = await db.select().from(schema.acctKonten);
    const accountMap = new Map(accounts.map((a) => [a.kontonummer, a]));

    // Accumulate balances by account
    const balances = new Map<string, number>();
    for (const entry of entries) {
      const current = balances.get(entry.konto) || 0;
      const amount = entry.sollHaben === "S" ? entry.betrag : -entry.betrag;
      balances.set(entry.konto, current + amount);
    }

    // Group by type
    let anlagevermoegen = 0;
    let umlaufvermoegen = 0;
    let kasseBank = 0;
    let forderungen = 0;
    let eigenkapital = 0;
    let rueckstellungen = 0;
    let verbindlichkeiten = 0;
    let bankVerbindlichkeiten = 0;

    for (const [kontoNr, balance] of balances) {
      const konto = parseInt(kontoNr, 10);
      const meta = accountMap.get(kontoNr);
      const typ = meta?.typ;

      if (typ === "aktiv" || (!typ && konto < 3000)) {
        if (konto >= 0 && konto < 500) anlagevermoegen += balance;
        else if (konto >= 1000 && konto < 1200) kasseBank += balance;
        else if (konto >= 1200 && konto < 1500) forderungen += balance;
        else umlaufvermoegen += balance;
      } else if (typ === "passiv" || (!typ && konto >= 3000 && konto < 4000)) {
        if (konto >= 800 && konto < 900) eigenkapital += Math.abs(balance);
        else if (konto >= 900 && konto < 1000) rueckstellungen += Math.abs(balance);
        else if (konto >= 1600 && konto < 1700) bankVerbindlichkeiten += Math.abs(balance);
        else verbindlichkeiten += Math.abs(balance);
      }
    }

    const totalAktiva = anlagevermoegen + umlaufvermoegen + kasseBank + forderungen;
    const totalPassiva = eigenkapital + rueckstellungen + verbindlichkeiten + bankVerbindlichkeiten;

    const aktiva: BilanzItem[] = [
      { label: "A. Anlagevermoegen", amount: anlagevermoegen },
      { label: "I. Sachanlagen", amount: anlagevermoegen, indent: 1 },
      { label: "B. Umlaufvermoegen", amount: umlaufvermoegen + kasseBank + forderungen },
      { label: "I. Forderungen", amount: forderungen, indent: 1 },
      { label: "II. Kasse / Bank", amount: kasseBank, indent: 1 },
      { label: "III. Sonstige", amount: umlaufvermoegen, indent: 1 },
      { label: "Summe Aktiva", amount: totalAktiva, isTotal: true },
    ];

    const passiva: BilanzItem[] = [
      { label: "A. Eigenkapital", amount: eigenkapital },
      { label: "B. Rueckstellungen", amount: rueckstellungen },
      { label: "C. Verbindlichkeiten", amount: verbindlichkeiten + bankVerbindlichkeiten },
      { label: "I. Bankverbindlichkeiten", amount: bankVerbindlichkeiten, indent: 1 },
      { label: "II. Sonstige Verbindlichkeiten", amount: verbindlichkeiten, indent: 1 },
      { label: "Summe Passiva", amount: totalPassiva, isTotal: true },
    ];

    return { period, aktiva, passiva, totalAktiva, totalPassiva };
  } catch {
    return { period, aktiva: [], passiva: [], totalAktiva: 0, totalPassiva: 0 };
  }
}
