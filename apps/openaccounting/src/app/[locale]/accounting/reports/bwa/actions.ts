"use server";

import { db, schema } from "@/db";
import { and, gte, lte, eq, sql } from "drizzle-orm";

export interface BwaLine {
  label: string;
  amount: number;
  isTotal?: boolean;
  isSeparator?: boolean;
  indent?: number;
}

export interface BwaData {
  period: string;
  lines: BwaLine[];
}

/**
 * Get BWA (Betriebswirtschaftliche Auswertung) data for a given month/year.
 * Uses standard German BWA structure based on booking entries.
 */
export async function getBwaData(year: number, month: number): Promise<BwaData> {
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

    // Categorize by account ranges (SKR03 typical)
    let umsatzerloese = 0;
    let bestandsveraenderungen = 0;
    let aktivierteEigenleistungen = 0;
    let sonstigeErtraege = 0;
    let materialaufwand = 0;
    let personalaufwand = 0;
    let raumkosten = 0;
    let versicherungen = 0;
    let fahrzeugkosten = 0;
    let werbekosten = 0;
    let reisekosten = 0;
    let abschreibungen = 0;
    let zinsenAufwand = 0;
    let sonstigerAufwand = 0;
    let steuern = 0;

    for (const entry of entries) {
      const konto = parseInt(entry.konto, 10);
      const amount = entry.sollHaben === "H" ? entry.betrag : -entry.betrag;

      if (konto >= 8000 && konto < 8100) umsatzerloese += amount;
      else if (konto >= 8100 && konto < 8200) bestandsveraenderungen += amount;
      else if (konto >= 8200 && konto < 8300) aktivierteEigenleistungen += amount;
      else if (konto >= 8300 && konto < 9000) sonstigeErtraege += amount;
      else if (konto >= 3000 && konto < 4000) materialaufwand += Math.abs(amount);
      else if (konto >= 4000 && konto < 4200) personalaufwand += Math.abs(amount);
      else if (konto >= 4200 && konto < 4300) raumkosten += Math.abs(amount);
      else if (konto >= 4300 && konto < 4400) versicherungen += Math.abs(amount);
      else if (konto >= 4500 && konto < 4600) fahrzeugkosten += Math.abs(amount);
      else if (konto >= 4600 && konto < 4700) werbekosten += Math.abs(amount);
      else if (konto >= 4660 && konto < 4700) reisekosten += Math.abs(amount);
      else if (konto >= 4800 && konto < 4900) abschreibungen += Math.abs(amount);
      else if (konto >= 7000 && konto < 7100) zinsenAufwand += Math.abs(amount);
      else if (konto >= 4400 && konto < 4500) sonstigerAufwand += Math.abs(amount);
      else if (konto >= 7600 && konto < 7700) steuern += Math.abs(amount);
    }

    const gesamtleistung =
      umsatzerloese + bestandsveraenderungen + aktivierteEigenleistungen;
    const rohertrag = gesamtleistung - materialaufwand;
    const gesamtkosten =
      personalaufwand +
      raumkosten +
      versicherungen +
      fahrzeugkosten +
      werbekosten +
      reisekosten +
      abschreibungen +
      sonstigerAufwand;
    const betriebsergebnis = rohertrag + sonstigeErtraege - gesamtkosten;
    const ergebnisVorSteuern = betriebsergebnis - zinsenAufwand;
    const jahresueberschuss = ergebnisVorSteuern - steuern;

    const lines: BwaLine[] = [
      { label: "1. Umsatzerloese", amount: umsatzerloese },
      { label: "2. Bestandsveraenderungen", amount: bestandsveraenderungen, indent: 1 },
      { label: "3. Aktivierte Eigenleistungen", amount: aktivierteEigenleistungen, indent: 1 },
      { label: "Gesamtleistung", amount: gesamtleistung, isTotal: true },
      { label: "", amount: 0, isSeparator: true },
      { label: "4. Materialaufwand / Wareneinsatz", amount: -materialaufwand },
      { label: "Rohertrag / Rohgewinn", amount: rohertrag, isTotal: true },
      { label: "", amount: 0, isSeparator: true },
      { label: "5. Sonstige betriebliche Ertraege", amount: sonstigeErtraege, indent: 1 },
      { label: "", amount: 0, isSeparator: true },
      { label: "6. Personalaufwand", amount: -personalaufwand },
      { label: "7. Raumkosten", amount: -raumkosten, indent: 1 },
      { label: "8. Versicherungen / Beitraege", amount: -versicherungen, indent: 1 },
      { label: "9. Fahrzeugkosten", amount: -fahrzeugkosten, indent: 1 },
      { label: "10. Werbe- / Reisekosten", amount: -(werbekosten + reisekosten), indent: 1 },
      { label: "11. Abschreibungen", amount: -abschreibungen, indent: 1 },
      { label: "12. Sonstiger Aufwand", amount: -sonstigerAufwand, indent: 1 },
      { label: "", amount: 0, isSeparator: true },
      { label: "Betriebsergebnis", amount: betriebsergebnis, isTotal: true },
      { label: "", amount: 0, isSeparator: true },
      { label: "13. Zinsaufwand", amount: -zinsenAufwand, indent: 1 },
      { label: "Ergebnis vor Steuern", amount: ergebnisVorSteuern, isTotal: true },
      { label: "", amount: 0, isSeparator: true },
      { label: "14. Steuern vom Einkommen / Ertrag", amount: -steuern, indent: 1 },
      { label: "Jahresueberschuss / -fehlbetrag", amount: jahresueberschuss, isTotal: true },
    ];

    return { period, lines };
  } catch {
    return { period, lines: [] };
  }
}
