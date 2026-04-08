// ==================== ELSTER Lohnsteuer (Payroll Tax) Types ====================
// Lohnsteueranmeldung (LStA) and ELStAM (Elektronische Lohnsteuerabzugsmerkmale)
// Certificate-based authentication via ERiC library.

// ==================== Certificate Config ====================

/** Certificate-based auth configuration for ELSTER payroll operations */
export interface ElsterPayrollCertificateConfig {
  /** Path to the .pfx ELSTER certificate file */
  certificatePath: string;
  /** PIN for the certificate */
  certificatePin: string;
  /** Employer tax number (Steuernummer des Arbeitgebers) */
  arbeitgeberSteuernummer: string;
  /** Tax office number (Finanzamtsnummer) */
  finanzamtsnummer: string;
  /** Path to ERiC shared libraries */
  ericLibraryPath?: string;
  /** Use ELSTER test environment (default: false) */
  testMode?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Lohnsteueranmeldung (LStA) ====================

/** Filing period for Lohnsteueranmeldung */
export type LStAAnmeldungszeitraum = "monatlich" | "vierteljaehrlich" | "jaehrlich";

/** Lohnsteueranmeldung — payroll tax declaration (main XML data model) */
export interface LohnsteueranmeldungDaten {
  /** Steuernummer des Arbeitgebers */
  steuernummer: string;
  /** Finanzamtsnummer */
  finanzamtsnummer: string;
  /** Anmeldungszeitraum (monthly / quarterly / annual) */
  anmeldungszeitraum: LStAAnmeldungszeitraum;
  /** Kalenderjahr */
  jahr: number;
  /** Zeitraum (1-12 for monthly, 1-4 for quarterly, 0 for annual) */
  zeitraum: number;

  // Kennzahlen (KZ) for LStA XML fields
  /** KZ 41 — Anzahl der Arbeitnehmer */
  anzahlArbeitnehmer: number;
  /** KZ 42 — Summe der Lohnsteuer (in Cent) */
  summeLohnsteuer: number;
  /** KZ 43 — Solidaritaetszuschlag (in Cent) */
  solidaritaetszuschlag: number;
  /** KZ 44 — Evangelische Kirchensteuer (in Cent) */
  kirchensteuerEvangelisch: number;
  /** KZ 45 — Roemisch-Katholische Kirchensteuer (in Cent) */
  kirchensteuerKatholisch: number;
  /** KZ 46 — Pauschale Lohnsteuer § 37b EStG (in Cent) */
  pauschaleLohnsteuer37b?: number;
  /** KZ 47 — Pauschale Lohnsteuer § 40 EStG (in Cent) */
  pauschaleLohnsteuer40?: number;
  /** KZ 48 — Pauschale Lohnsteuer § 40a EStG (in Cent) */
  pauschaleLohnsteuer40a?: number;
  /** KZ 49 — Pauschale Lohnsteuer § 40b EStG (in Cent) */
  pauschaleLohnsteuer40b?: number;
  /** KZ 50 — Anrechnung Lohnsteuer aus § 41a Abs. 4 EStG (in Cent) */
  anrechnungLohnsteuer?: number;

  /** Zusaetzliche Kennzahlen (key: KZ number, value: Betrag in Cent) */
  zusaetzlicheKennzahlen?: Record<string, number>;

  /** Berichtigte Anmeldung (corrected filing)? */
  berichtigteAnmeldung?: boolean;
  /** Verrechnung erwuenscht (offset desired)? */
  verrechnungErwuenscht?: boolean;
}

/** Validated LStA ready for submission */
export interface LStASubmission {
  /** The declaration data */
  daten: LohnsteueranmeldungDaten;
  /** Generated XML content */
  xmlInhalt: string;
  /** Whether this is a test submission (Testfall) */
  testfall: boolean;
}

/** LStA submission result */
export interface LStASubmissionResult {
  /** Whether the submission succeeded */
  erfolg: boolean;
  /** Transfer ticket number from ELSTER */
  transferTicket?: string;
  /** ELSTER server response */
  serverAntwort?: string;
  /** Error details on failure */
  fehler?: ElsterPayrollFehler[];
}

// ==================== ELStAM ====================

/** ELStAM request type */
export type ELStAMAnfragetyp =
  | "anmeldung"           // New employee registration
  | "abmeldung"           // Employee deregistration
  | "ummeldung"           // Transfer between employers
  | "abruf"               // Retrieve current tax data
  | "aenderungsliste";    // Retrieve changes list

/** Steuerklasse (tax bracket) */
export type Steuerklasse = 1 | 2 | 3 | 4 | 5 | 6;

/** Kirchensteuer-Merkmal (church tax indicator) */
export type Konfession =
  | "ev"    // Evangelisch
  | "rk"    // Roemisch-Katholisch
  | "ak"    // Altkatholisch
  | "fb"    // Freireligioese Gemeinde Baden
  | "fg"    // Freireligioese Gemeinde Offenbach
  | "fr"    // Freireligioese Gemeinde
  | "fl"    // Freireligioese Landesgemeinde Pfalz
  | "is"    // Israelitische Religionsgemeinschaft
  | "jd"    // Juedische Kultussteuer
  | "lt"    // Freirreligioese Landesgemeinde
  | "none"; // Keine Kirchensteuerpflicht

/** ELStAM Anmeldung — register a new employee for tax data retrieval */
export interface ELStAMAnmeldung {
  /** Identifikationsnummer des Arbeitnehmers (IdNr, 11-digit) */
  identifikationsnummer: string;
  /** Geburtsdatum (YYYY-MM-DD) */
  geburtsdatum: string;
  /** Erstes Dienstverhaeltnis (primary employment)? */
  erstesDienstverhaeltnis: boolean;
  /** Referenznummer (employer's internal reference for the employee) */
  referenznummer: string;
  /** Beginn des Dienstverhaeltnisses (YYYY-MM-DD) */
  beschaeftigungsbeginn: string;
  /** Steuernummer des Arbeitgebers */
  arbeitgeberSteuernummer: string;
}

/** ELStAM Abmeldung — deregister an employee */
export interface ELStAMAbmeldung {
  /** Identifikationsnummer des Arbeitnehmers */
  identifikationsnummer: string;
  /** Referenznummer */
  referenznummer: string;
  /** Ende des Dienstverhaeltnisses (YYYY-MM-DD) */
  beschaeftigungsende: string;
  /** Arbeitgebersteuernummer */
  arbeitgeberSteuernummer: string;
}

/** ELStAM Abruf — retrieved electronic tax deduction data */
export interface ELStAMDaten {
  /** Identifikationsnummer des Arbeitnehmers */
  identifikationsnummer: string;
  /** Referenznummer */
  referenznummer: string;
  /** Steuerklasse */
  steuerklasse: Steuerklasse;
  /** Faktor (for Steuerklasse 4 with Faktor) */
  faktor?: number;
  /** Kinderfreibetraege (child allowances, e.g. 0.5, 1.0, 1.5) */
  kinderfreibetraege: number;
  /** Konfession des Arbeitnehmers */
  konfessionArbeitnehmer: Konfession;
  /** Konfession des Ehegatten/Lebenspartners */
  konfessionEhegatte?: Konfession;
  /** Freibetrag monatlich (in Cent) */
  freibetragMonatlich?: number;
  /** Freibetrag jaehrlich (in Cent) */
  freibetragJaehrlich?: number;
  /** Hinzurechnungsbetrag monatlich (in Cent) */
  hinzurechnungsbetragMonatlich?: number;
  /** Hinzurechnungsbetrag jaehrlich (in Cent) */
  hinzurechnungsbetragJaehrlich?: number;
  /** Gueltig ab (valid from, YYYY-MM-DD) */
  gueltigAb: string;
  /** Gueltig bis (valid until, YYYY-MM-DD) — optional, open-ended if absent */
  gueltigBis?: string;
}

/** ELStAM Aenderungsliste — a change record for an employee */
export interface ELStAMAenderung {
  /** Identifikationsnummer des Arbeitnehmers */
  identifikationsnummer: string;
  /** Referenznummer */
  referenznummer: string;
  /** Aenderungsdatum (YYYY-MM-DD) */
  aenderungsdatum: string;
  /** Updated ELStAM data */
  neueDaten: ELStAMDaten;
  /** Previous ELStAM data (for comparison) */
  alteDaten?: ELStAMDaten;
}

/** Result of an ELStAM operation */
export interface ELStAMErgebnis {
  erfolg: boolean;
  /** Returned ELStAM data (for abruf / aenderungsliste) */
  daten?: ELStAMDaten[];
  /** Changes list (for aenderungsliste) */
  aenderungen?: ELStAMAenderung[];
  /** Transfer ticket from ELSTER */
  transferTicket?: string;
  /** Errors */
  fehler?: ElsterPayrollFehler[];
}

// ==================== Shared / Utility ====================

/** ELSTER payroll error */
export interface ElsterPayrollFehler {
  /** ERiC error code */
  code: number;
  /** Error message (German) */
  nachricht: string;
  /** Affected field reference (Kennzahl) */
  feldReferenz?: string;
  /** Severity level */
  schweregrad: "fehler" | "warnung" | "hinweis";
}

/** Validation result for LStA or ELStAM data */
export interface ElsterPayrollValidierung {
  /** Whether the data passed validation */
  gueltig: boolean;
  /** Validation errors */
  fehler: ElsterPayrollFehler[];
  /** Validated XML output (if valid) */
  validierterXmlInhalt?: string;
}

/** ELSTER payroll protocol / receipt */
export interface ElsterPayrollProtokoll {
  /** Transfer ticket */
  transferTicket: string;
  /** Type of operation */
  vorgangstyp: "lsta" | "elstam_anmeldung" | "elstam_abmeldung" | "elstam_abruf";
  /** Timestamp of submission */
  zeitstempel: string;
  /** Status */
  status: "eingereicht" | "angenommen" | "abgelehnt" | "fehler";
  /** Server response XML */
  serverAntwortXml?: string;
}
