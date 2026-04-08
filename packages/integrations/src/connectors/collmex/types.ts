// ==================== Collmex API Types ====================
// German accounting and ERP platform (collmex.de)
// CSV-based API with custom authentication (customer ID + username + password)

/** Collmex customer (CMXKND) */
export interface CollmexCustomer {
  Satzart: "CMXKND";
  Kundennummer?: number;
  Firma_Nr?: number;
  Anrede?: string;
  Titel?: string;
  Vorname?: string;
  Name: string;
  Firma?: string;
  Abteilung?: string;
  Strasse?: string;
  PLZ?: string;
  Ort?: string;
  Land?: string;
  Telefon?: string;
  Telefax?: string;
  EMail?: string;
  Kontonr?: string;
  BLZ?: string;
  IBAN?: string;
  BIC?: string;
  Bankname?: string;
  Steuernummer?: string;
  USt_IdNr?: string;
  Zahlungsbedingung?: number;
  Rabattgruppe?: number;
  Lieferbedingung?: number;
  Lieferbedingung_Zusatz?: string;
  Ausgabemedium?: number;
  Kontoinhaber?: string;
  Adressgruppe?: number;
  Waehrung?: string;
  Bemerkung?: string;
  Inaktiv?: number;
}

/** Collmex invoice (CMXINV) */
export interface CollmexInvoice {
  Satzart: "CMXINV";
  Rechnungsnummer?: number;
  Position?: number;
  Rechnungsart?: CollmexInvoiceType;
  Firma_Nr?: number;
  Auftragsnummer?: number;
  Kundennummer: number;
  Anrede_Rechnungsadresse?: string;
  Titel_Rechnungsadresse?: string;
  Vorname_Rechnungsadresse?: string;
  Name_Rechnungsadresse?: string;
  Firma_Rechnungsadresse?: string;
  Abteilung_Rechnungsadresse?: string;
  Strasse_Rechnungsadresse?: string;
  PLZ_Rechnungsadresse?: string;
  Ort_Rechnungsadresse?: string;
  Land_Rechnungsadresse?: string;
  Rechnungsdatum?: string; // YYYYMMDD
  Preisdatum?: string;
  Zahlungsbedingung?: number;
  Waehrung?: string;
  Preisgruppe?: number;
  Rabattgruppe?: number;
  Schlusstext?: string;
  Internes_Memo?: string;
  Artikelnummer?: string;
  Artikelbeschreibung?: string;
  Menge?: number;
  Mengeneinheit?: string;
  Einzelpreis?: number;
  Preismenge?: number;
  Positionsrabatt?: number;
  Positionswert?: number;
  Produktart?: number;
  Steuerklassifikation?: number;
  Steuersatz?: number;
  Status?: CollmexInvoiceStatus;
  Erloeskonto?: string;
  Nettobetrag?: number;
  Steuerbetrag?: number;
  Bruttobetrag?: number;
}

export type CollmexInvoiceType = 0 | 1 | 2 | 3;
// 0 = invoice, 1 = credit note, 2 = down payment invoice, 3 = cancellation

export type CollmexInvoiceStatus = 0 | 10 | 20;
// 0 = new/open, 10 = deleted, 20 = locked

/** Collmex product (CMXPRD) */
export interface CollmexProduct {
  Satzart: "CMXPRD";
  Produktnummer: string;
  Firma_Nr?: number;
  Bezeichnung: string;
  Bezeichnung_Eng?: string;
  Mengeneinheit?: string;
  Produktgruppe?: number;
  Verkaufspreis?: number;
  Einkaufspreis?: number;
  Produktart?: number; // 0 = product, 1 = service
  Steuerklassifikation?: number;
  Gewicht?: number;
  Gewichteinheit?: string;
  EAN?: string;
  Bemerkung?: string;
  Inaktiv?: number;
}

/** Collmex booking (CMXBK) */
export interface CollmexBooking {
  Satzart: "CMXBK";
  Belegnummer?: number;
  Position?: number;
  Firma_Nr?: number;
  Buchungsdatum: string; // YYYYMMDD
  Belegdatum?: string;
  Konto_Soll: string;
  Konto_Haben: string;
  Betrag: number;
  Waehrung?: string;
  Buchungstext?: string;
  Steuersatz?: number;
  Kostenstelle?: string;
  Kundennummer?: number;
  Lieferantennummer?: number;
  Belegnummer_Extern?: string;
  Systemname?: string;
}

// ==================== CSV Protocol Types ====================

/**
 * Collmex uses a CSV-based HTTP API. All requests POST CSV data
 * to a single endpoint. The first field of each CSV row is the
 * record type (Satzart). Authentication is done by sending a
 * LOGIN record as the first line.
 */
export interface CollmexLoginRecord {
  Satzart: "LOGIN";
  Benutzer: string;
  Kennwort: string;
}

export interface CollmexFilterRecord {
  Satzart: string; // e.g. "CUSTOMER_GET", "INVOICE_GET"
  [key: string]: string | number | undefined;
}

export interface CollmexResponse {
  /** Parsed rows from the CSV response */
  rows: Record<string, string | number>[];
  /** Whether the response contains an error message */
  hasError: boolean;
  /** Error messages from the response */
  errors: string[];
  /** Success messages from the response */
  messages: string[];
}

export interface CollmexClientConfig {
  /** Collmex customer number (Kundennummer) */
  customerId: string;
  /** Collmex username */
  username: string;
  /** Collmex password */
  password: string;
  /** Company number within the Collmex account (default: 1) */
  companyNr?: number;
  /** Request timeout in ms */
  timeout?: number;
}
