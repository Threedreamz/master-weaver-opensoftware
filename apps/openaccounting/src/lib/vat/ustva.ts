/**
 * Umsatzsteuervoranmeldung (UStVA) — German VAT return preparation.
 *
 * Calculates VAT amounts from booking entries, grouped by the standard
 * Kennzahlen (field numbers) used in the German VAT return form.
 *
 * Key Kennzahlen:
 *   81  — Steuerpflichtige Umsätze 19% (taxable revenue at 19%)
 *   86  — Steuerpflichtige Umsätze 7% (taxable revenue at 7%)
 *   43  — Steuerfreie Umsätze (tax-exempt revenue)
 *   41  — Innergemeinschaftliche Lieferungen (intra-community supplies)
 *   66  — Vorsteuer (input tax / deductible VAT)
 *   83  — Verbleibende USt (remaining VAT = output - input)
 */

export interface UStVAData {
  /** Period identifier, e.g. "2026-Q1" or "2026-01" */
  zeitraum: string;
  /** Kz 81: Net revenue taxed at 19% */
  steuerpflichtigeUmsaetze19: number;
  /** Calculated 19% tax on Kz 81 */
  steuer19: number;
  /** Kz 86: Net revenue taxed at 7% */
  steuerpflichtigeUmsaetze7: number;
  /** Calculated 7% tax on Kz 86 */
  steuer7: number;
  /** Kz 43: Tax-exempt revenue */
  steuerfreieUmsaetze: number;
  /** Kz 41: Intra-community supplies (EU, tax-free) */
  innergemeinschaftlich: number;
  /** Kz 66: Deductible input tax (Vorsteuer) */
  vorsteuer: number;
  /** Kz 83: Remaining VAT payable (positive) or refund (negative) */
  verbleibendeUst: number;
}

export interface UStVAPeriod {
  from: string;
  to: string;
}

/**
 * Booking entry shape expected by the calculator.
 * This matches the acctBookingEntries schema from the DB.
 */
export interface BookingEntry {
  datum: string;
  betrag: number;
  sollHaben: "S" | "H";
  konto: string;
  gegenkonto: string;
  buchungstext: string;
  steuerschluessel?: string | null;
}

/**
 * Revenue account ranges used to classify bookings by VAT rate.
 *
 * SKR03 mapping:
 *   8400 — Erlöse 19% USt
 *   8300 — Erlöse 7% USt
 *   8100-8125 — Steuerfreie Umsätze / ig Lieferungen
 *   1576 — Vorsteuer 19%
 *   1570 — Vorsteuer 7%
 *
 * SKR04 mapping:
 *   4400 — Erlöse 19% USt
 *   4300 — Erlöse 7% USt
 *   4100-4120 — Steuerfreie Umsätze / ig Lieferungen
 *   1576 — Vorsteuer 19%
 *   1570 — Vorsteuer 7%
 */

const REVENUE_19_ACCOUNTS = ["8400", "4400"];
const REVENUE_7_ACCOUNTS = ["8300", "4300"];
const REVENUE_FREE_ACCOUNTS = ["8100", "4100"];
const REVENUE_IG_ACCOUNTS = ["8120", "8125", "4120"];
const VORSTEUER_ACCOUNTS = ["1570", "1576", "1580"];

function isInAccountList(konto: string, list: string[]): boolean {
  return list.some((prefix) => konto.startsWith(prefix));
}

function isInPeriod(datum: string, period: UStVAPeriod): boolean {
  return datum >= period.from && datum <= period.to;
}

/**
 * Get the effective amount for a booking entry.
 * Revenue (Haben on revenue accounts) is positive.
 * Expenses (Soll on expense accounts) are positive for Vorsteuer.
 */
function getBookingAmount(entry: BookingEntry): number {
  return entry.betrag;
}

/**
 * Calculate UStVA data from a set of booking entries for a given period.
 */
export function calculateUStVA(
  entries: BookingEntry[],
  period: UStVAPeriod
): UStVAData {
  let steuerpflichtigeUmsaetze19 = 0;
  let steuerpflichtigeUmsaetze7 = 0;
  let steuerfreieUmsaetze = 0;
  let innergemeinschaftlich = 0;
  let vorsteuer = 0;

  const periodEntries = entries.filter((e) => isInPeriod(e.datum, period));

  for (const entry of periodEntries) {
    const amount = getBookingAmount(entry);
    const konto = entry.konto;
    const gegenkonto = entry.gegenkonto;

    // Check the revenue/expense account (could be in konto or gegenkonto)
    const revenueAccount = isInAccountList(konto, [...REVENUE_19_ACCOUNTS, ...REVENUE_7_ACCOUNTS, ...REVENUE_FREE_ACCOUNTS, ...REVENUE_IG_ACCOUNTS])
      ? konto
      : isInAccountList(gegenkonto, [...REVENUE_19_ACCOUNTS, ...REVENUE_7_ACCOUNTS, ...REVENUE_FREE_ACCOUNTS, ...REVENUE_IG_ACCOUNTS])
        ? gegenkonto
        : null;

    if (revenueAccount) {
      if (isInAccountList(revenueAccount, REVENUE_19_ACCOUNTS)) {
        steuerpflichtigeUmsaetze19 += amount;
      } else if (isInAccountList(revenueAccount, REVENUE_7_ACCOUNTS)) {
        steuerpflichtigeUmsaetze7 += amount;
      } else if (isInAccountList(revenueAccount, REVENUE_IG_ACCOUNTS)) {
        innergemeinschaftlich += amount;
      } else if (isInAccountList(revenueAccount, REVENUE_FREE_ACCOUNTS)) {
        steuerfreieUmsaetze += amount;
      }
      continue;
    }

    // Check Vorsteuer accounts
    const vorsteuerAccount = isInAccountList(konto, VORSTEUER_ACCOUNTS)
      ? konto
      : isInAccountList(gegenkonto, VORSTEUER_ACCOUNTS)
        ? gegenkonto
        : null;

    if (vorsteuerAccount) {
      vorsteuer += amount;
    }
  }

  const steuer19 = Math.round(steuerpflichtigeUmsaetze19 * 0.19 * 100) / 100;
  const steuer7 = Math.round(steuerpflichtigeUmsaetze7 * 0.07 * 100) / 100;
  const verbleibendeUst = Math.round((steuer19 + steuer7 - vorsteuer) * 100) / 100;

  // Format period label
  const fromDate = new Date(period.from);
  const toDate = new Date(period.to);
  const year = fromDate.getFullYear();
  const fromMonth = fromDate.getMonth() + 1;
  const toMonth = toDate.getMonth() + 1;

  let zeitraum: string;
  if (toMonth - fromMonth === 2) {
    const quarter = Math.ceil(fromMonth / 3);
    zeitraum = `${year}-Q${quarter}`;
  } else {
    zeitraum = `${year}-${String(fromMonth).padStart(2, "0")}`;
  }

  return {
    zeitraum,
    steuerpflichtigeUmsaetze19: Math.round(steuerpflichtigeUmsaetze19 * 100) / 100,
    steuer19,
    steuerpflichtigeUmsaetze7: Math.round(steuerpflichtigeUmsaetze7 * 100) / 100,
    steuer7,
    steuerfreieUmsaetze: Math.round(steuerfreieUmsaetze * 100) / 100,
    innergemeinschaftlich: Math.round(innergemeinschaftlich * 100) / 100,
    vorsteuer: Math.round(vorsteuer * 100) / 100,
    verbleibendeUst,
  };
}

/**
 * Generate ELSTER-compatible XML for the UStVA.
 *
 * Note: Full ELSTER integration requires the ERiC library and digital
 * certificates. This generates the data XML portion that can be submitted
 * via the ELSTER online portal or through a tax advisor's software.
 */
export function generateElsterXml(data: UStVAData): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">');
  lines.push("  <TransferHeader>");
  lines.push("    <Verfahren>ElsterAnmeldung</Verfahren>");
  lines.push("    <DatenArt>UStVA</DatenArt>");
  lines.push(`    <Vorgang>send</Vorgang>`);
  lines.push("  </TransferHeader>");
  lines.push("  <DatenTeil>");
  lines.push("    <Nutzdatenblock>");
  lines.push("      <Nutzdaten>");
  lines.push("        <Anmeldungssteuern art=\"UStVA\">");
  lines.push(`          <Zeitraum>${data.zeitraum}</Zeitraum>`);

  // Kz 81 — Steuerpflichtige Umsätze 19%
  if (data.steuerpflichtigeUmsaetze19 !== 0) {
    lines.push(`          <Kz81>${formatElsterAmount(data.steuerpflichtigeUmsaetze19)}</Kz81>`);
  }

  // Kz 86 — Steuerpflichtige Umsätze 7%
  if (data.steuerpflichtigeUmsaetze7 !== 0) {
    lines.push(`          <Kz86>${formatElsterAmount(data.steuerpflichtigeUmsaetze7)}</Kz86>`);
  }

  // Kz 43 — Steuerfreie Umsätze
  if (data.steuerfreieUmsaetze !== 0) {
    lines.push(`          <Kz43>${formatElsterAmount(data.steuerfreieUmsaetze)}</Kz43>`);
  }

  // Kz 41 — Innergemeinschaftliche Lieferungen
  if (data.innergemeinschaftlich !== 0) {
    lines.push(`          <Kz41>${formatElsterAmount(data.innergemeinschaftlich)}</Kz41>`);
  }

  // Kz 66 — Vorsteuer
  if (data.vorsteuer !== 0) {
    lines.push(`          <Kz66>${formatElsterAmount(data.vorsteuer)}</Kz66>`);
  }

  // Kz 83 — Verbleibende USt
  lines.push(`          <Kz83>${formatElsterAmount(data.verbleibendeUst)}</Kz83>`);

  lines.push("        </Anmeldungssteuern>");
  lines.push("      </Nutzdaten>");
  lines.push("    </Nutzdatenblock>");
  lines.push("  </DatenTeil>");
  lines.push("</Elster>");

  return lines.join("\n");
}

/**
 * Generate a printable PDF-style HTML summary of the UStVA.
 * Returns an HTML string that can be rendered or converted to PDF.
 */
export function generateUStVASummaryHtml(data: UStVAData): string {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Umsatzsteuervoranmeldung ${data.zeitraum}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2cm; color: #333; }
    h1 { font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { font-size: 14px; margin-top: 24px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .amount { text-align: right; font-family: 'Courier New', monospace; }
    .total { font-weight: bold; background: #f0f9f0; }
    .negative { color: #d32f2f; }
    .footer { margin-top: 32px; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <h1>Umsatzsteuervoranmeldung</h1>
  <p><strong>Zeitraum:</strong> ${data.zeitraum}</p>

  <h2>Steuerpflichtige Umsaetze</h2>
  <table>
    <tr><th>Kennzahl</th><th>Bezeichnung</th><th class="amount">Bemessungsgrundlage</th><th class="amount">Steuer</th></tr>
    <tr><td>81</td><td>Lieferungen und Leistungen 19%</td><td class="amount">${formatCurrency(data.steuerpflichtigeUmsaetze19)}</td><td class="amount">${formatCurrency(data.steuer19)}</td></tr>
    <tr><td>86</td><td>Lieferungen und Leistungen 7%</td><td class="amount">${formatCurrency(data.steuerpflichtigeUmsaetze7)}</td><td class="amount">${formatCurrency(data.steuer7)}</td></tr>
    <tr><td>43</td><td>Steuerfreie Umsaetze</td><td class="amount">${formatCurrency(data.steuerfreieUmsaetze)}</td><td class="amount">-</td></tr>
    <tr><td>41</td><td>Innergemeinschaftliche Lieferungen</td><td class="amount">${formatCurrency(data.innergemeinschaftlich)}</td><td class="amount">-</td></tr>
  </table>

  <h2>Abziehbare Vorsteuer</h2>
  <table>
    <tr><th>Kennzahl</th><th>Bezeichnung</th><th class="amount">Betrag</th></tr>
    <tr><td>66</td><td>Vorsteuerbetraege</td><td class="amount">${formatCurrency(data.vorsteuer)}</td></tr>
  </table>

  <h2>Berechnung</h2>
  <table>
    <tr><td>Umsatzsteuer gesamt</td><td class="amount">${formatCurrency(data.steuer19 + data.steuer7)}</td></tr>
    <tr><td>abzueglich Vorsteuer</td><td class="amount">- ${formatCurrency(data.vorsteuer)}</td></tr>
    <tr class="total"><td>Kz 83: Verbleibende Umsatzsteuer</td><td class="amount ${data.verbleibendeUst < 0 ? "negative" : ""}">${formatCurrency(data.verbleibendeUst)}</td></tr>
  </table>

  <p class="footer">
    Erstellt mit OpenAccounting. Dieses Dokument dient der Vorbereitung und
    ersetzt nicht die offizielle Abgabe ueber ELSTER.
  </p>
</body>
</html>
  `.trim();
}

function formatElsterAmount(value: number): string {
  // ELSTER uses integer cent values
  return Math.round(value * 100).toString();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
