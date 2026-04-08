"use server";

import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import type { PayLohnabrechnung } from "@opensoftware/db/openpayroll";

// ==================== German Payroll Tax Constants (2026 simplified) ====================

/** Social insurance rates (percentage of gross, split 50/50 AN/AG) */
const SV_RATES = {
  kv: 14.6,  // Krankenversicherung (base rate, without Zusatzbeitrag)
  rv: 18.6,  // Rentenversicherung
  av: 2.6,   // Arbeitslosenversicherung
  pv: 3.4,   // Pflegeversicherung
};

/** Beitragsbemessungsgrenzen (monthly, West Germany 2026 approximate) */
const BBG = {
  kvPv: 5175,   // KV + PV ceiling
  rvAv: 7550,   // RV + AV ceiling
};

/** Simplified income tax brackets (monthly gross, approximate) */
function calculateLohnsteuer(monthlyBrutto: number, steuerklasse: number): number {
  // Simplified progressive tax calculation for German Lohnsteuer
  // This is a simplified model — production systems use BMF formulas
  let taxableIncome = monthlyBrutto;

  // Basic tax-free allowance (Grundfreibetrag) varies by Steuerklasse
  const freibetrag: Record<number, number> = {
    1: 1029, // ~12348/12
    2: 1029 + 348, // with Entlastungsbetrag
    3: 2058, // doubled for married filing jointly
    4: 1029,
    5: 0,
    6: 0,
  };

  taxableIncome -= freibetrag[steuerklasse] ?? 0;
  if (taxableIncome <= 0) return 0;

  // Simplified progressive rates
  let tax = 0;
  if (taxableIncome <= 1200) {
    tax = taxableIncome * 0.14;
  } else if (taxableIncome <= 2500) {
    tax = 1200 * 0.14 + (taxableIncome - 1200) * 0.24;
  } else if (taxableIncome <= 5000) {
    tax = 1200 * 0.14 + 1300 * 0.24 + (taxableIncome - 2500) * 0.36;
  } else {
    tax = 1200 * 0.14 + 1300 * 0.24 + 2500 * 0.36 + (taxableIncome - 5000) * 0.42;
  }

  return Math.round(tax * 100) / 100;
}

function calculateSoli(lohnsteuer: number): number {
  // Solidaritaetszuschlag: 5.5% of Lohnsteuer, but only if above threshold
  // Freigrenze ~18130/year = ~1511/month Lohnsteuer
  if (lohnsteuer <= 1511 / 12) return 0;
  return Math.round(lohnsteuer * 0.055 * 100) / 100;
}

function calculateKirchensteuer(lohnsteuer: number, hasKirchensteuer: boolean, bundesland: string): number {
  if (!hasKirchensteuer) return 0;
  // 8% in Bayern and Baden-Wuerttemberg, 9% everywhere else
  const rate = ["BY", "BW"].includes(bundesland) ? 0.08 : 0.09;
  return Math.round(lohnsteuer * rate * 100) / 100;
}

interface PayrollCalcResult {
  bruttoGesamt: number;
  lohnsteuer: number;
  solidaritaetszuschlag: number;
  kirchensteuerBetrag: number;
  kvAn: number;
  kvAg: number;
  rvAn: number;
  rvAg: number;
  avAn: number;
  avAg: number;
  pvAn: number;
  pvAg: number;
  netto: number;
  auszahlung: number;
}

function calculatePayrollForEmployee(
  brutto: number,
  steuerklasse: number,
  kirchensteuer: boolean,
  bundesland: string,
  kvBeitragssatz: number,
  kinderfreibetraege: number
): PayrollCalcResult {
  const bruttoGesamt = brutto;

  // Social insurance contributions
  const kvBase = Math.min(bruttoGesamt, BBG.kvPv);
  const rvBase = Math.min(bruttoGesamt, BBG.rvAv);

  // Use the employee's specific KV rate (includes Zusatzbeitrag)
  const kvTotal = kvBase * (kvBeitragssatz / 100);
  const kvAn = Math.round(kvTotal / 2 * 100) / 100;
  const kvAg = Math.round(kvTotal / 2 * 100) / 100;

  const rvTotal = rvBase * (SV_RATES.rv / 100);
  const rvAn = Math.round(rvTotal / 2 * 100) / 100;
  const rvAg = Math.round(rvTotal / 2 * 100) / 100;

  const avTotal = rvBase * (SV_RATES.av / 100);
  const avAn = Math.round(avTotal / 2 * 100) / 100;
  const avAg = Math.round(avTotal / 2 * 100) / 100;

  // PV: surcharge for childless employees over 23
  const pvRate = kinderfreibetraege > 0 ? SV_RATES.pv : SV_RATES.pv + 0.6;
  const pvTotal = kvBase * (pvRate / 100);
  const pvAn = Math.round(pvTotal / 2 * 100) / 100;
  const pvAg = Math.round((kvBase * (SV_RATES.pv / 100)) / 2 * 100) / 100; // AG always pays base rate

  // Tax calculations
  const lohnsteuer = calculateLohnsteuer(bruttoGesamt, steuerklasse);
  const solidaritaetszuschlag = calculateSoli(lohnsteuer);
  const kirchensteuerBetrag = calculateKirchensteuer(lohnsteuer, kirchensteuer, bundesland);

  // Netto = Brutto - AN social contributions - taxes
  const totalAnSv = kvAn + rvAn + avAn + pvAn;
  const totalTax = lohnsteuer + solidaritaetszuschlag + kirchensteuerBetrag;
  const netto = Math.round((bruttoGesamt - totalAnSv - totalTax) * 100) / 100;
  const auszahlung = netto; // Same as netto unless there are additional deductions

  return {
    bruttoGesamt,
    lohnsteuer,
    solidaritaetszuschlag,
    kirchensteuerBetrag,
    kvAn, kvAg,
    rvAn, rvAg,
    avAn, avAg,
    pvAn, pvAg,
    netto,
    auszahlung,
  };
}

// ==================== Server Actions ====================

export interface PayrollEntry extends PayLohnabrechnung {
  mitarbeiterName?: string;
  personalnummer?: string;
}

export async function getPayrollForPeriod(monat: number, jahr: number): Promise<PayrollEntry[]> {
  const entries = await db
    .select()
    .from(schema.payLohnabrechnungen)
    .where(
      and(
        eq(schema.payLohnabrechnungen.monat, monat),
        eq(schema.payLohnabrechnungen.jahr, jahr)
      )
    );

  // Enrich with employee names
  const enriched: PayrollEntry[] = [];
  for (const entry of entries) {
    const emp = await db
      .select({ vorname: schema.payMitarbeiter.vorname, nachname: schema.payMitarbeiter.nachname, personalnummer: schema.payMitarbeiter.personalnummer })
      .from(schema.payMitarbeiter)
      .where(eq(schema.payMitarbeiter.id, entry.mitarbeiterId))
      .limit(1);

    enriched.push({
      ...entry,
      mitarbeiterName: emp[0] ? `${emp[0].vorname} ${emp[0].nachname}` : "Unknown",
      personalnummer: emp[0]?.personalnummer ?? "",
    });
  }

  return enriched;
}

export async function calculatePayroll(monat: number, jahr: number): Promise<{ created: number; updated: number; errors: string[] }> {
  const activeEmployees = await db
    .select()
    .from(schema.payMitarbeiter)
    .where(eq(schema.payMitarbeiter.status, "aktiv"));

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const emp of activeEmployees) {
    try {
      const result = calculatePayrollForEmployee(
        emp.bruttoGehalt,
        emp.steuerklasse,
        emp.kirchensteuer ?? false,
        emp.bundesland ?? "NW",
        emp.krankenkasseBeitragssatz ?? 14.6,
        emp.kinderfreibetraege ?? 0
      );

      // Check if entry already exists
      const existing = await db
        .select()
        .from(schema.payLohnabrechnungen)
        .where(
          and(
            eq(schema.payLohnabrechnungen.mitarbeiterId, emp.id),
            eq(schema.payLohnabrechnungen.monat, monat),
            eq(schema.payLohnabrechnungen.jahr, jahr)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.payLohnabrechnungen)
          .set({ ...result, status: "berechnet" })
          .where(eq(schema.payLohnabrechnungen.id, existing[0]!.id));
        updated++;
      } else {
        await db
          .insert(schema.payLohnabrechnungen)
          .values({
            mitarbeiterId: emp.id,
            monat,
            jahr,
            ...result,
            status: "berechnet",
          });
        created++;
      }
    } catch (err) {
      errors.push(`${emp.personalnummer} ${emp.nachname}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { created, updated, errors };
}

export async function approvePayroll(monat: number, jahr: number): Promise<number> {
  const result = await db
    .update(schema.payLohnabrechnungen)
    .set({ status: "freigegeben" })
    .where(
      and(
        eq(schema.payLohnabrechnungen.monat, monat),
        eq(schema.payLohnabrechnungen.jahr, jahr),
        eq(schema.payLohnabrechnungen.status, "berechnet")
      )
    )
    .returning();

  return result.length;
}
