/**
 * Shared types for bank transaction parsers.
 *
 * All parsers (CAMT.053, CSV, MT940) produce this common BankTransaction
 * shape so upstream import logic can treat them uniformly.
 */

export interface BankTransaction {
  /** Unique transaction identifier (from bank or generated) */
  id: string;
  /** Booking date (ISO 8601 date string, e.g. "2026-01-15") */
  date: string;
  /** Transaction amount — positive = credit, negative = debit */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Name of the creditor (payee) */
  creditorName?: string;
  /** Name of the debtor (payer) */
  debtorName?: string;
  /** Payment reference / Verwendungszweck */
  reference?: string;
  /** Counterparty IBAN */
  iban?: string;
  /** Counterparty BIC */
  bic?: string;
  /** Unstructured remittance / purpose text */
  purpose?: string;
  /** Booking status from the bank statement */
  bookingStatus: "BOOK" | "PDNG" | "INFO";
}

export interface ParseResult {
  transactions: BankTransaction[];
  errors: string[];
  /** Original filename for audit trail */
  sourceFile?: string;
  /** Detected format */
  format: "camt053" | "csv" | "mt940" | "unknown";
}

export interface CsvColumnMapping {
  date: string;
  amount: string;
  description?: string;
  reference?: string;
  counterpartyName?: string;
  iban?: string;
  currency?: string;
}
