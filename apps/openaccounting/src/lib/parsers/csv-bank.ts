/**
 * Generic CSV bank statement parser with configurable column mapping.
 *
 * Supports common German bank CSV exports (Sparkasse, Volksbank,
 * Deutsche Bank, etc.) by letting the user map columns to fields.
 *
 * Handles:
 *  - Semicolon and comma delimiters (auto-detected)
 *  - German number format (1.234,56) and international (1,234.56)
 *  - Quoted fields with embedded delimiters
 *  - BOM markers (UTF-8, UTF-16)
 */

import type { BankTransaction, CsvColumnMapping, ParseResult } from "./types";

/**
 * Auto-detect the CSV delimiter by counting occurrences in the header line.
 */
function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;

  if (tabs > semicolons && tabs > commas) return "\t";
  if (semicolons >= commas) return ";";
  return ",";
}

/**
 * Parse a CSV line respecting quoted fields.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parse a German-format number string to a JavaScript number.
 * Handles: "1.234,56" -> 1234.56, "-1.234,56" -> -1234.56
 */
function parseGermanNumber(value: string): number {
  const cleaned = value.replace(/\s/g, "");

  // Detect German format: has comma as decimal separator
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    // Simple: "1234,56"
    return parseFloat(cleaned.replace(",", "."));
  }

  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");

    if (lastComma > lastDot) {
      // German: "1.234,56" — dots are thousands, comma is decimal
      return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
    } else {
      // International: "1,234.56" — commas are thousands, dot is decimal
      return parseFloat(cleaned.replace(/,/g, ""));
    }
  }

  return parseFloat(cleaned);
}

/**
 * Parse a date string in common German bank formats.
 * Returns ISO 8601 date (YYYY-MM-DD).
 */
function parseDate(value: string): string {
  const trimmed = value.trim();

  // DD.MM.YYYY (most common German format)
  const deDot = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (deDot) {
    return `${deDot[3]}-${deDot[2].padStart(2, "0")}-${deDot[1].padStart(2, "0")}`;
  }

  // DD.MM.YY
  const deShort = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/);
  if (deShort) {
    const year = parseInt(deShort[3]) > 50 ? `19${deShort[3]}` : `20${deShort[3]}`;
    return `${year}-${deShort[2].padStart(2, "0")}-${deShort[1].padStart(2, "0")}`;
  }

  // YYYY-MM-DD (ISO)
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return trimmed;
  }

  // DD/MM/YYYY
  const deSlash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (deSlash) {
    return `${deSlash[3]}-${deSlash[2].padStart(2, "0")}-${deSlash[1].padStart(2, "0")}`;
  }

  // Fallback — return as-is, let caller handle
  return trimmed;
}

/**
 * Strip BOM markers from the beginning of a string.
 */
function stripBom(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/**
 * Try to auto-detect column mapping from header names.
 * Supports German and English header labels.
 */
export function autoDetectMapping(headers: string[]): CsvColumnMapping | null {
  const lower = headers.map((h) => h.toLowerCase().trim());

  const dateAliases = ["buchungstag", "buchungsdatum", "datum", "valuta", "date", "booking date", "wertstellung"];
  const amountAliases = ["betrag", "amount", "umsatz", "saldo", "betrag (eur)", "betrag(eur)"];
  const descAliases = ["verwendungszweck", "buchungstext", "description", "text", "vorgang/verwendungszweck"];
  const refAliases = ["referenz", "reference", "kundenreferenz", "mandatsreferenz"];
  const nameAliases = ["auftraggeber/empfänger", "empfänger", "name", "beguenstigter/zahlungspflichtiger", "counterparty"];
  const ibanAliases = ["iban", "kontonummer", "account"];
  const currencyAliases = ["währung", "currency", "waehrung"];

  function findColumn(aliases: string[]): string | undefined {
    for (const alias of aliases) {
      const idx = lower.findIndex((h) => h === alias || h.includes(alias));
      if (idx !== -1) return headers[idx];
    }
    return undefined;
  }

  const dateCol = findColumn(dateAliases);
  const amountCol = findColumn(amountAliases);

  if (!dateCol || !amountCol) return null;

  return {
    date: dateCol,
    amount: amountCol,
    description: findColumn(descAliases),
    reference: findColumn(refAliases),
    counterpartyName: findColumn(nameAliases),
    iban: findColumn(ibanAliases),
    currency: findColumn(currencyAliases),
  };
}

/**
 * Parse a CSV bank statement with the given column mapping.
 */
export function parseCsvBank(
  csvContent: string,
  mapping?: CsvColumnMapping
): ParseResult {
  const errors: string[] = [];
  const transactions: BankTransaction[] = [];

  try {
    const content = stripBom(csvContent);
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      errors.push("CSV file must have at least a header row and one data row");
      return { transactions: [], errors, format: "csv" };
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = parseCsvLine(lines[0], delimiter);

    // Auto-detect mapping if not provided
    const columnMap = mapping || autoDetectMapping(headers);
    if (!columnMap) {
      errors.push(
        "Could not auto-detect column mapping. Please provide a manual mapping. " +
          `Detected headers: ${headers.join(", ")}`
      );
      return { transactions: [], errors, format: "csv" };
    }

    // Resolve column indices
    const dateIdx = headers.findIndex((h) => h.trim() === columnMap.date);
    const amountIdx = headers.findIndex((h) => h.trim() === columnMap.amount);
    const descIdx = columnMap.description
      ? headers.findIndex((h) => h.trim() === columnMap.description)
      : -1;
    const refIdx = columnMap.reference
      ? headers.findIndex((h) => h.trim() === columnMap.reference)
      : -1;
    const nameIdx = columnMap.counterpartyName
      ? headers.findIndex((h) => h.trim() === columnMap.counterpartyName)
      : -1;
    const ibanIdx = columnMap.iban
      ? headers.findIndex((h) => h.trim() === columnMap.iban)
      : -1;
    const currencyIdx = columnMap.currency
      ? headers.findIndex((h) => h.trim() === columnMap.currency)
      : -1;

    if (dateIdx === -1) {
      errors.push(`Date column "${columnMap.date}" not found in headers`);
      return { transactions: [], errors, format: "csv" };
    }
    if (amountIdx === -1) {
      errors.push(`Amount column "${columnMap.amount}" not found in headers`);
      return { transactions: [], errors, format: "csv" };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const fields = parseCsvLine(lines[i], delimiter);
        if (fields.length <= Math.max(dateIdx, amountIdx)) {
          errors.push(`Row ${i + 1}: insufficient columns (expected ${headers.length}, got ${fields.length})`);
          continue;
        }

        const dateStr = fields[dateIdx];
        const amountStr = fields[amountIdx];

        if (!dateStr || !amountStr) {
          errors.push(`Row ${i + 1}: missing date or amount`);
          continue;
        }

        const amount = parseGermanNumber(amountStr);
        if (isNaN(amount)) {
          errors.push(`Row ${i + 1}: invalid amount "${amountStr}"`);
          continue;
        }

        const date = parseDate(dateStr);
        const description = descIdx >= 0 ? fields[descIdx] : undefined;
        const reference = refIdx >= 0 ? fields[refIdx] : undefined;
        const counterpartyName = nameIdx >= 0 ? fields[nameIdx] : undefined;
        const iban = ibanIdx >= 0 ? fields[ibanIdx] : undefined;
        const currency = currencyIdx >= 0 ? fields[currencyIdx] : "EUR";

        transactions.push({
          id: `csv-${i}-${date}-${amount}`,
          date,
          amount,
          currency: currency || "EUR",
          creditorName: amount > 0 ? undefined : counterpartyName,
          debtorName: amount > 0 ? counterpartyName : undefined,
          reference,
          iban,
          purpose: description,
          bookingStatus: "BOOK",
        });
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    errors.push(`CSV parsing failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { transactions, errors, format: "csv" };
}
