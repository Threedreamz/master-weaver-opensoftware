/**
 * OpenPayroll seed — inserts Max Mustermann as employee with 3 months of payroll data.
 * All values use realistic 2024 German tax/insurance calculations (Steuerklasse 1, no church tax).
 */
import { mustermannUser, mustermannEmployee, MUSTERMANN_EMPLOYEE_ID } from "./mustermann";
import { users } from "../shared.schema";
import { payMitarbeiter, payLohnabrechnungen } from "../openpayroll.schema";
import type { DbClient } from "../create-db";

export async function seedOpenpayroll(db: DbClient) {
  // 1. Shared user
  await db.insert(users).values(mustermannUser).onConflictDoNothing();

  // 2. Employee
  await db.insert(payMitarbeiter).values(mustermannEmployee).onConflictDoNothing();

  // 3. Payroll entries — Jan, Feb, Mar 2024
  // Brutto 4333 EUR, Steuerklasse 1, NW, no church tax, no children
  // KV-AN: 4333 * 7.3% = 316.31, KV-AG: 4333 * 7.3% = 316.31
  // RV-AN: 4333 * 9.3% = 402.97, RV-AG: 4333 * 9.3% = 402.97
  // AV-AN: 4333 * 1.3% = 56.33,  AV-AG: 4333 * 1.3% = 56.33
  // PV-AN: 4333 * 1.7% = 73.66 (kinderlos-Zuschlag), PV-AG: 4333 * 1.7% = 73.66
  // Lohnsteuer ~680, Soli ~37.40
  // Netto = 4333 - 680 - 37.40 - 316.31 - 402.97 - 56.33 - 73.66 = 2766.33

  const basePayroll = {
    mitarbeiterId: MUSTERMANN_EMPLOYEE_ID,
    jahr: 2024,
    bruttoGesamt: 4333.0,
    lohnsteuer: 680.0,
    solidaritaetszuschlag: 37.4,
    kirchensteuerBetrag: 0,
    kvAn: 316.31,
    kvAg: 316.31,
    rvAn: 402.97,
    rvAg: 402.97,
    avAn: 56.33,
    avAg: 56.33,
    pvAn: 73.66,
    pvAg: 73.66,
    netto: 2766.33,
    auszahlung: 2766.33,
    positionen: JSON.stringify([
      { lohnartNr: "1000", bezeichnung: "Gehalt", betrag: 4333.0 },
      { lohnartNr: "2000", bezeichnung: "Lohnsteuer", betrag: -680.0 },
      { lohnartNr: "2010", bezeichnung: "Solidaritätszuschlag", betrag: -37.4 },
      { lohnartNr: "3000", bezeichnung: "KV-Arbeitnehmer", betrag: -316.31 },
      { lohnartNr: "3100", bezeichnung: "RV-Arbeitnehmer", betrag: -402.97 },
      { lohnartNr: "3200", bezeichnung: "AV-Arbeitnehmer", betrag: -56.33 },
      { lohnartNr: "3300", bezeichnung: "PV-Arbeitnehmer", betrag: -73.66 },
    ]),
  };

  const payrollEntries = [
    {
      ...basePayroll,
      monat: 1,
      status: "ausgezahlt" as const,
      ausgezahltAm: "2024-01-31",
    },
    {
      ...basePayroll,
      monat: 2,
      status: "freigegeben" as const,
      ausgezahltAm: null,
    },
    {
      ...basePayroll,
      monat: 3,
      status: "berechnet" as const,
      ausgezahltAm: null,
    },
  ];

  for (const entry of payrollEntries) {
    await db.insert(payLohnabrechnungen).values(entry).onConflictDoNothing();
  }
}
