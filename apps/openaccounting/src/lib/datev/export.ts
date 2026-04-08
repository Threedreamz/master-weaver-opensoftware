/**
 * DATEV export generator.
 *
 * Produces DATEV-compatible CSV files (Buchungsstapel format) that can be
 * imported into DATEV software used by German tax advisors (Steuerberater).
 *
 * Format specification:
 *  - Header line: metadata (Berater-Nr, Mandanten-Nr, date range, etc.)
 *  - Column header line
 *  - Data lines: one per booking entry
 *  - Semicolon-separated, German number format (comma as decimal separator)
 *  - Encoding: Windows-1252 (legacy DATEV requirement, but UTF-8 works for modern imports)
 */

import { lookupAccount, SKR03, SKR04, SKR03_TO_SKR04 } from "./skr-mapping";

export interface DatevExportOptions {
  /** Start date (ISO 8601) */
  dateFrom: string;
  /** End date (ISO 8601) */
  dateTo: string;
  /** Export format */
  format: "csv" | "xml";
  /** Standard chart of accounts */
  kontenrahmen: "SKR03" | "SKR04";
  /** Berater-Nummer (tax advisor number, 4-7 digits) */
  beraterNummer?: string;
  /** Mandanten-Nummer (client number, 1-5 digits) */
  mandantenNummer?: string;
  /** Wirtschaftsjahr-Beginn (fiscal year start, defaults to Jan 1) */
  wirtschaftsjahrBeginn?: string;
  /** Sachkontennummernlaenge (account number length, typically 4) */
  sachkontenLaenge?: number;
}

export interface DatevBuchung {
  /** Umsatz (amount, always positive) */
  umsatz: number;
  /** Soll/Haben indicator: S = debit, H = credit */
  sollHaben: "S" | "H";
  /** Account number (Konto) */
  kontoNummer: string;
  /** Counter-account number (Gegenkonto) */
  gegenKonto: string;
  /** Booking date (ISO 8601 date string) */
  datum: string;
  /** Booking text / description */
  buchungstext: string;
  /** Document/receipt number */
  belegNummer?: string;
  /** Tax key (Steuerschlüssel), e.g. "9" for 19% USt */
  steuerschluessel?: string;
  /** Cost center (Kostenstelle) */
  kostenstelle?: string;
}

/**
 * Format a number in German format (comma as decimal separator).
 * DATEV requires exactly 2 decimal places.
 */
function formatGermanNumber(value: number): string {
  return value
    .toFixed(2)
    .replace(".", ",");
}

/**
 * Format an ISO date to DATEV date format (DDMM, 4 digits, no separators).
 * DATEV uses short dates within the fiscal year.
 */
function formatDatevDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return "";
  const day = parts[2].padStart(2, "0");
  const month = parts[1].padStart(2, "0");
  return `${day}${month}`;
}

/**
 * Format an ISO date for the DATEV header (YYYYMMDD).
 */
function formatDatevHeaderDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

/**
 * Escape a string for DATEV CSV (wrap in quotes if it contains semicolons or quotes).
 */
function escapeField(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate the DATEV CSV header line with metadata.
 *
 * This follows the DATEV Buchungsstapel (posting batch) format specification.
 * The header contains 26 fields with metadata about the export.
 */
function generateHeader(options: DatevExportOptions): string {
  const now = new Date();
  const created = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const createdTime = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}000`;

  const berater = options.beraterNummer || "0001";
  const mandant = options.mandantenNummer || "00001";
  const wjBeginn = options.wirtschaftsjahrBeginn
    ? formatDatevHeaderDate(options.wirtschaftsjahrBeginn)
    : `${options.dateFrom.substring(0, 4)}0101`;
  const sachkontenLaenge = options.sachkontenLaenge || 4;
  const dateFrom = formatDatevHeaderDate(options.dateFrom);
  const dateTo = formatDatevHeaderDate(options.dateTo);

  // DATEV header fields (26 columns)
  const headerFields = [
    '"EXTF"',         // 1: Format identifier (EXTF = external format)
    "700",            // 2: Version number
    "21",             // 3: Data category (21 = Buchungsstapel)
    `"Buchungsstapel"`, // 4: Format name
    "13",             // 5: Format version
    created,          // 6: Created date
    "",               // 7: Import date (empty)
    `"OA"`,           // 8: Origin (OpenAccounting)
    `""`,             // 9: Exported by
    `""`,             // 10: Imported by
    berater,          // 11: Berater-Nummer
    mandant,          // 12: Mandanten-Nummer
    wjBeginn,         // 13: Wirtschaftsjahr-Beginn
    String(sachkontenLaenge), // 14: Sachkontennummernlänge
    dateFrom,         // 15: Datum von
    dateTo,           // 16: Datum bis
    `""`,             // 17: Bezeichnung
    `""`,             // 18: Diktatkürzel
    "1",              // 19: Buchungstyp (1 = Finanzbuchführung)
    "0",              // 20: Rechnungslegungszweck
    "0",              // 21: Reserved
    `""`,             // 22: Reserved
    `""`,             // 23: Reserved
    `""`,             // 24: Reserved
    `""`,             // 25: Reserved
    `""`,             // 26: Reserved
  ];

  return headerFields.join(";");
}

/**
 * DATEV Buchungsstapel column headers.
 * These are the standard column names for the data rows.
 */
const DATEV_COLUMNS = [
  "Umsatz (ohne Soll/Haben-Kz)",
  "Soll/Haben-Kennzeichen",
  "WKZ Umsatz",
  "Kurs",
  "Basis-Umsatz",
  "WKZ Basis-Umsatz",
  "Konto",
  "Gegenkonto (ohne BU-Schlüssel)",
  "BU-Schlüssel",
  "Belegdatum",
  "Belegfeld 1",
  "Belegfeld 2",
  "Skonto",
  "Buchungstext",
  "Postensperre",
  "Diverse Adressnummer",
  "Geschäftspartnerbank",
  "Sachverhalt",
  "Zinssperre",
  "Beleglink",
  "Beleginfo - Art 1",
  "Beleginfo - Inhalt 1",
  "Beleginfo - Art 2",
  "Beleginfo - Inhalt 2",
  "Beleginfo - Art 3",
  "Beleginfo - Inhalt 3",
  "Beleginfo - Art 4",
  "Beleginfo - Inhalt 4",
  "Beleginfo - Art 5",
  "Beleginfo - Inhalt 5",
  "Beleginfo - Art 6",
  "Beleginfo - Inhalt 6",
  "Beleginfo - Art 7",
  "Beleginfo - Inhalt 7",
  "Beleginfo - Art 8",
  "Beleginfo - Inhalt 8",
  "KOST1 - Kostenstelle",
  "KOST2 - Kostenstelle",
  "KOST-Menge",
  "EU-Mitgliedstaat u. UStID (Bestimmung)",
  "EU-Steuersatz (Bestimmung)",
  "Abw. Versteuerungsart",
  "Sachverhalt L+L",
  "Funktionsergänzung L+L",
  "BU 49 Hauptfunktionstyp",
  "BU 49 Hauptfunktionsnummer",
  "BU 49 Funktionsergänzung",
  "Zusatzinformation - Art 1",
  "Zusatzinformation - Inhalt 1",
  "Zusatzinformation - Art 2",
  "Zusatzinformation - Inhalt 2",
  "Zusatzinformation - Art 3",
  "Zusatzinformation - Inhalt 3",
  "Zusatzinformation - Art 4",
  "Zusatzinformation - Inhalt 4",
  "Zusatzinformation - Art 5",
  "Zusatzinformation - Inhalt 5",
  "Zusatzinformation - Art 6",
  "Zusatzinformation - Inhalt 6",
  "Zusatzinformation - Art 7",
  "Zusatzinformation - Inhalt 7",
  "Zusatzinformation - Art 8",
  "Zusatzinformation - Inhalt 8",
  "Zusatzinformation - Art 9",
  "Zusatzinformation - Inhalt 9",
  "Zusatzinformation - Art 10",
  "Zusatzinformation - Inhalt 10",
  "Zusatzinformation - Art 11",
  "Zusatzinformation - Inhalt 11",
  "Zusatzinformation - Art 12",
  "Zusatzinformation - Inhalt 12",
  "Zusatzinformation - Art 13",
  "Zusatzinformation - Inhalt 13",
  "Zusatzinformation - Art 14",
  "Zusatzinformation - Inhalt 14",
  "Zusatzinformation - Art 15",
  "Zusatzinformation - Inhalt 15",
  "Zusatzinformation - Art 16",
  "Zusatzinformation - Inhalt 16",
  "Zusatzinformation - Art 17",
  "Zusatzinformation - Inhalt 17",
  "Zusatzinformation - Art 18",
  "Zusatzinformation - Inhalt 18",
  "Zusatzinformation - Art 19",
  "Zusatzinformation - Inhalt 19",
  "Zusatzinformation - Art 20",
  "Zusatzinformation - Inhalt 20",
  "Stück",
  "Gewicht",
  "Zahlweise",
  "Forderungsart",
  "Veranlagungsjahr",
  "Zugeordnete Fälligkeit",
  "Skontotyp",
  "Auftragsnummer",
  "Buchungstyp",
  "USt-Schlüssel (Anzahlungen)",
  "EU-Mitgliedstaat (Anzahlungen)",
  "Sachverhalt L+L (Anzahlungen)",
  "EU-Steuersatz (Anzahlungen)",
  "Erlöskonto (Anzahlungen)",
  "Herkunft-Kz",
  "Buchungs GUID",
  "KOST-Datum",
  "SEPA-Mandatsreferenz",
  "Skontosperre",
  "Gesellschaftername",
  "Beteiligtennummer",
  "Identifikationsnummer",
  "Zeichnernummer",
  "Postensperre bis",
  "Bezeichnung SoBil-Sachverhalt",
  "Kennzeichen SoBil-Buchung",
  "Festschreibung",
  "Leistungsdatum",
  "Datum Zuord. Steuerperiode",
  "Fälligkeit",
  "Generalumkehr (GU)",
  "Steuersatz",
  "Land",
];

/**
 * Format a single Buchung (booking entry) as a DATEV CSV data line.
 */
function formatBuchungLine(buchung: DatevBuchung): string {
  // Build a sparse array of 116 fields, most empty
  const fields: string[] = new Array(DATEV_COLUMNS.length).fill("");

  fields[0] = formatGermanNumber(buchung.umsatz);         // Umsatz
  fields[1] = buchung.sollHaben;                            // Soll/Haben
  fields[2] = "EUR";                                        // WKZ
  // fields[3-5] empty (Kurs, Basis-Umsatz, WKZ Basis)
  fields[6] = buchung.kontoNummer;                          // Konto
  fields[7] = buchung.gegenKonto;                           // Gegenkonto
  fields[8] = buchung.steuerschluessel || "";               // BU-Schlüssel
  fields[9] = formatDatevDate(buchung.datum);               // Belegdatum
  fields[10] = buchung.belegNummer || "";                   // Belegfeld 1
  // fields[11] empty (Belegfeld 2)
  // fields[12] empty (Skonto)
  fields[13] = escapeField(buchung.buchungstext.substring(0, 60)); // Buchungstext (max 60 chars)
  // Most remaining fields are empty for standard bookings
  fields[36] = buchung.kostenstelle || "";                  // KOST1

  return fields.join(";");
}

/**
 * Generate a DATEV CSV export (Buchungsstapel format).
 *
 * Returns the complete CSV content as a string, ready for download.
 */
export function generateDatevCsv(
  buchungen: DatevBuchung[],
  options: DatevExportOptions
): string {
  const lines: string[] = [];

  // Line 1: Header with metadata
  lines.push(generateHeader(options));

  // Line 2: Column headers
  lines.push(DATEV_COLUMNS.join(";"));

  // Data lines
  for (const buchung of buchungen) {
    lines.push(formatBuchungLine(buchung));
  }

  // DATEV expects Windows line endings (CRLF)
  return lines.join("\r\n") + "\r\n";
}

/**
 * Generate a DATEV XML export.
 *
 * This produces a simplified XML representation suitable for
 * DATEV XML-Schnittstelle import. For full compliance, the
 * official DATEV XML schema should be used.
 */
export function generateDatevXml(
  buchungen: DatevBuchung[],
  options: DatevExportOptions
): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push("<DatevExport>");
  lines.push("  <Header>");
  lines.push(`    <Version>1.0</Version>`);
  lines.push(`    <BeraterNummer>${options.beraterNummer || "0001"}</BeraterNummer>`);
  lines.push(`    <MandantenNummer>${options.mandantenNummer || "00001"}</MandantenNummer>`);
  lines.push(`    <Kontenrahmen>${options.kontenrahmen}</Kontenrahmen>`);
  lines.push(`    <DatumVon>${options.dateFrom}</DatumVon>`);
  lines.push(`    <DatumBis>${options.dateTo}</DatumBis>`);
  lines.push(`    <Quelle>OpenAccounting</Quelle>`);
  lines.push("  </Header>");
  lines.push("  <Buchungen>");

  for (const buchung of buchungen) {
    lines.push("    <Buchung>");
    lines.push(`      <Umsatz>${buchung.umsatz.toFixed(2)}</Umsatz>`);
    lines.push(`      <SollHaben>${buchung.sollHaben}</SollHaben>`);
    lines.push(`      <Konto>${buchung.kontoNummer}</Konto>`);
    lines.push(`      <Gegenkonto>${buchung.gegenKonto}</Gegenkonto>`);
    lines.push(`      <Datum>${buchung.datum}</Datum>`);
    lines.push(`      <Buchungstext>${escapeXml(buchung.buchungstext)}</Buchungstext>`);
    if (buchung.belegNummer) {
      lines.push(`      <Belegnummer>${escapeXml(buchung.belegNummer)}</Belegnummer>`);
    }
    if (buchung.steuerschluessel) {
      lines.push(`      <Steuerschluessel>${buchung.steuerschluessel}</Steuerschluessel>`);
    }
    if (buchung.kostenstelle) {
      lines.push(`      <Kostenstelle>${buchung.kostenstelle}</Kostenstelle>`);
    }

    // Include account names for readability
    const kontoInfo = lookupAccount(buchung.kontoNummer, options.kontenrahmen);
    const gegenkontoInfo = lookupAccount(buchung.gegenKonto, options.kontenrahmen);
    if (kontoInfo) {
      lines.push(`      <KontoBezeichnung>${escapeXml(kontoInfo.name)}</KontoBezeichnung>`);
    }
    if (gegenkontoInfo) {
      lines.push(`      <GegenkontoBezeichnung>${escapeXml(gegenkontoInfo.name)}</GegenkontoBezeichnung>`);
    }

    lines.push("    </Buchung>");
  }

  lines.push("  </Buchungen>");
  lines.push(`  <Zusammenfassung>`);
  lines.push(`    <AnzahlBuchungen>${buchungen.length}</AnzahlBuchungen>`);
  lines.push(`    <GesamtSoll>${buchungen.filter((b) => b.sollHaben === "S").reduce((s, b) => s + b.umsatz, 0).toFixed(2)}</GesamtSoll>`);
  lines.push(`    <GesamtHaben>${buchungen.filter((b) => b.sollHaben === "H").reduce((s, b) => s + b.umsatz, 0).toFixed(2)}</GesamtHaben>`);
  lines.push(`  </Zusammenfassung>`);
  lines.push("</DatevExport>");

  return lines.join("\n");
}

/**
 * Map an internal account number to the target SKR standard account.
 * If the account is already in the target SKR, return as-is.
 */
export function mapToSkr(
  kontoNummer: string,
  kontenrahmen: "SKR03" | "SKR04"
): string {
  const mapping = kontenrahmen === "SKR03" ? SKR03 : SKR04;

  // If the account exists in the target SKR, use it directly
  if (mapping[kontoNummer]) {
    return kontoNummer;
  }

  // Try cross-reference mapping (SKR03 <-> SKR04)
  if (kontenrahmen === "SKR04") {
    // Look up SKR03->SKR04 mapping
    const mapped = SKR03_TO_SKR04[kontoNummer];
    if (mapped) return mapped;
  } else {
    // Reverse lookup for SKR04->SKR03
    for (const [skr03, skr04] of Object.entries(SKR03_TO_SKR04)) {
      if (skr04 === kontoNummer) return skr03;
    }
  }

  // Fallback: return original number
  return kontoNummer;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
