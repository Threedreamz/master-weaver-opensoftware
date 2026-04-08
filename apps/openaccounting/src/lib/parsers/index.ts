/**
 * Bank statement parser entry point.
 *
 * Detects the file format and delegates to the appropriate parser.
 */

export type { BankTransaction, ParseResult, CsvColumnMapping } from "./types";
export { parseCamt053 } from "./camt053";
export { parseCsvBank, autoDetectMapping } from "./csv-bank";

import type { ParseResult, CsvColumnMapping } from "./types";
import { parseCamt053 } from "./camt053";
import { parseCsvBank } from "./csv-bank";

/**
 * Detect file format from content and filename, then parse accordingly.
 */
export function parseFile(
  content: string,
  filename: string,
  csvMapping?: CsvColumnMapping
): ParseResult {
  const lowerName = filename.toLowerCase();

  // XML-based formats
  if (lowerName.endsWith(".xml") || content.trimStart().startsWith("<?xml") || content.includes("BkToCstmrStmt")) {
    const result = parseCamt053(content);
    result.sourceFile = filename;
    return result;
  }

  // CSV format
  if (lowerName.endsWith(".csv") || lowerName.endsWith(".txt")) {
    const result = parseCsvBank(content, csvMapping);
    result.sourceFile = filename;
    return result;
  }

  // MT940 / SWIFT format (basic detection)
  if (lowerName.endsWith(".mt940") || lowerName.endsWith(".sta") || content.trimStart().startsWith(":20:")) {
    // MT940 is a future extension — return a helpful error for now
    return {
      transactions: [],
      errors: [
        "MT940/SWIFT format detected but not yet supported. " +
          "Please convert to CAMT.053 XML or CSV and re-upload.",
      ],
      sourceFile: filename,
      format: "mt940",
    };
  }

  return {
    transactions: [],
    errors: [`Unsupported file format: "${filename}". Supported formats: .xml (CAMT.053), .csv, .txt`],
    sourceFile: filename,
    format: "unknown",
  };
}
