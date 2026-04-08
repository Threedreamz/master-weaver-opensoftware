// ==================== SV-Meldeportal Types ====================
// Sozialversicherungsmeldungen nach DEUEV (Datenerfassungs- und
// -uebermittlungsverordnung) / Datenaustausch Entgeltunterlagen-Verordnung.
// Certificate-based authentication.

// ==================== Certificate Config ====================

/** Certificate-based auth for SV-Meldeportal */
export interface SVMeldeportalConfig {
  /** Path to the certificate file (.pfx / .p12) */
  certificatePath: string;
  /** Certificate password */
  certificatePassword: string;
  /** Betriebsnummer des Arbeitgebers (8-digit employer number) */
  betriebsnummer: string;
  /** Absender-Betriebsnummer (sender, may differ for Abrechnungsstellen) */
  absenderBetriebsnummer?: string;
  /** Use test environment (default: false) */
  testMode?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== DEUEV Meldegruende (reason codes) ====================

/** Meldegrund for Anmeldung (registration) */
export type AnmeldungGrund =
  | "10"  // Beginn einer Beschaeftigung
  | "11"  // Beginn einer versicherungspflichtigen Beschaeftigung nach Unterbrechung >1 Monat
  | "12"  // Wechsel der Einzugsstelle (Krankenkasse)
  | "13"  // Beginn einer Beschaeftigung gleichzeitig mit Ende einer anderen
  | "40"; // Gleichzeitige An- und Abmeldung (kurzfristige Beschaeftigung)

/** Meldegrund for Abmeldung (deregistration) */
export type AbmeldungGrund =
  | "30"  // Ende einer Beschaeftigung
  | "31"  // Ende einer versicherungspflichtigen Beschaeftigung
  | "32"  // Wechsel der Einzugsstelle bei fortbestehender Beschaeftigung
  | "33"  // Ende einer Beschaeftigung gleichzeitig mit Beginn einer neuen
  | "34"  // Ende der Beschaeftigung durch Tod
  | "35"  // Unterbrechung >1 Monat wegen Krankengeldbezug
  | "36"  // Unterbrechung >1 Monat wegen Elternzeit
  | "40"; // Gleichzeitige An- und Abmeldung

/** Meldegrund for Jahresmeldung */
export type JahresmeldungGrund = "50"; // Jahresmeldung (annual notification)

/** Meldegrund for Sofortmeldung */
export type SofortmeldungGrund = "20"; // Sofortmeldung (immediate notification)

/** All possible Meldegruende */
export type Meldegrund =
  | AnmeldungGrund
  | AbmeldungGrund
  | JahresmeldungGrund
  | SofortmeldungGrund;

// ==================== Beitragsgruppen (contribution group keys) ====================

/** Beitragsgruppenschluessel — 4-digit code for KV/RV/ALV/PV contribution groups */
export interface Beitragsgruppenschluessel {
  /** Krankenversicherung (1-digit: 0, 1, 3, 6, 9) */
  krankenversicherung: "0" | "1" | "3" | "6" | "9";
  /** Rentenversicherung (1-digit: 0, 1, 3, 5) */
  rentenversicherung: "0" | "1" | "3" | "5";
  /** Arbeitslosenversicherung (1-digit: 0, 1, 2) */
  arbeitslosenversicherung: "0" | "1" | "2";
  /** Pflegeversicherung (1-digit: 0, 1, 2) */
  pflegeversicherung: "0" | "1" | "2";
}

/** Personengruppenschluessel (personnel group code) */
export type Personengruppenschluessel =
  | "101"  // Sozialversicherungspflichtig Beschaeftigte ohne besondere Merkmale
  | "102"  // Auszubildende
  | "103"  // Beschaeftigte in Altersteilzeit
  | "104"  // Hausgewerbetreibende
  | "105"  // Praktikanten
  | "106"  // Werkstudenten
  | "107"  // Behinderte in anerkannten Werkstaetten
  | "108"  // Bezieher von Vorruhestandsgeld
  | "109"  // Geringfuegig entlohnte Beschaeftigte (Minijob)
  | "110"  // Kurzfristig Beschaeftigte
  | "111"  // Personen in Einrichtungen der Jugendhilfe
  | "112"  // Midijob (Uebergangsbereich)
  | "113"  // Versicherungsfreie Altersvollrentner
  | "114"  // Beschaeftigte mit Entgeltfortzahlung bei Arbeitsunfaehigkeit
  | "119"  // Versicherungsfreie geringfuegig Beschaeftigte (AG-Pauschalbeitrag)
  | "190"; // Knappschaftliche Beschaeftigte

// ==================== DEUEV Message Data Structures ====================

/** Base fields shared by all DEUEV messages */
export interface DEUEVBasisfelder {
  /** Betriebsnummer des Arbeitgebers */
  betriebsnummerArbeitgeber: string;
  /** Betriebsnummer der Einzugsstelle (Krankenkasse) */
  betriebsnummerEinzugsstelle: string;
  /** Versicherungsnummer des Arbeitnehmers (RVNR, 12 chars) */
  versicherungsnummer: string;
  /** Familienname */
  familienname: string;
  /** Vorname */
  vorname: string;
  /** Geburtsdatum (YYYYMMDD) */
  geburtsdatum: string;
  /** Geschlecht */
  geschlecht: "M" | "W" | "D" | "X";
  /** Personengruppenschluessel */
  personengruppe: Personengruppenschluessel;
  /** Beitragsgruppenschluessel (4-digit string, e.g. "1111") */
  beitragsgruppe: string;
  /** Aktenzeichen / Referenz des Arbeitgebers */
  aktenzeichen?: string;
}

/** DEUEV Anmeldung (registration) */
export interface DEUEVAnmeldung extends DEUEVBasisfelder {
  /** Meldegrund */
  meldegrund: AnmeldungGrund;
  /** Beschaeftigungsbeginn (YYYYMMDD) */
  beschaeftigungsbeginn: string;
  /** Beitragsgruppenschluessel (structured) */
  beitragsgruppenschluessel: Beitragsgruppenschluessel;
  /** Taetigkeitsschluessel (9-digit occupation key) */
  taetigkeitsschluessel: string;
  /** Staatsangehoerigkeit (3-digit country code) */
  staatsangehoerigkeit: string;
  /** Betriebsnummer des vorigen Arbeitgebers (bei Meldegrund 13) */
  betriebsnummerVorigerArbeitgeber?: string;
  /** Anschrift: Strasse */
  strasse?: string;
  /** Anschrift: Hausnummer */
  hausnummer?: string;
  /** Anschrift: PLZ */
  postleitzahl?: string;
  /** Anschrift: Ort */
  ort?: string;
  /** Anschrift: Laenderkennzeichen */
  laenderkennzeichen?: string;
}

/** DEUEV Abmeldung (deregistration) */
export interface DEUEVAbmeldung extends DEUEVBasisfelder {
  /** Meldegrund */
  meldegrund: AbmeldungGrund;
  /** Beschaeftigungsbeginn im aktuellen Zeitraum (YYYYMMDD) */
  beschaeftigungsbeginn: string;
  /** Beschaeftigungsende (YYYYMMDD) */
  beschaeftigungsende: string;
  /** Beitragspflichtiges Bruttoentgelt im Abmeldezeitraum (in Cent) */
  beitragspflichtigesEntgelt: number;
  /** Beitragsgruppenschluessel (structured) */
  beitragsgruppenschluessel: Beitragsgruppenschluessel;
  /** Einmalentgelte im Abmeldezeitraum (in Cent) */
  einmalentgelt?: number;
  /** Betriebsnummer des nachfolgenden Arbeitgebers (bei Meldegrund 33) */
  betriebsnummerNachfolgerArbeitgeber?: string;
}

/** DEUEV Jahresmeldung (annual notification) */
export interface DEUEVJahresmeldung extends DEUEVBasisfelder {
  /** Meldegrund — always "50" */
  meldegrund: JahresmeldungGrund;
  /** Meldejahr */
  meldejahr: number;
  /** Beschaeftigungsbeginn im Meldejahr (YYYYMMDD) */
  beschaeftigungsbeginn: string;
  /** Beschaeftigungsende im Meldejahr (YYYYMMDD, usually 31.12.) */
  beschaeftigungsende: string;
  /** Beitragspflichtiges Bruttoentgelt im Meldezeitraum (in Cent) */
  beitragspflichtigesEntgelt: number;
  /** Beitragsgruppenschluessel (structured) */
  beitragsgruppenschluessel: Beitragsgruppenschluessel;
  /** Einmalentgelte (in Cent) */
  einmalentgelt?: number;
}

/** DEUEV Sofortmeldung (immediate notification, per §28a Abs. 4 SGB IV) */
export interface DEUEVSofortmeldung {
  /** Betriebsnummer des Arbeitgebers */
  betriebsnummerArbeitgeber: string;
  /** Meldegrund — always "20" */
  meldegrund: SofortmeldungGrund;
  /** Familienname */
  familienname: string;
  /** Vorname */
  vorname: string;
  /** Geburtsdatum (YYYYMMDD) */
  geburtsdatum: string;
  /** Versicherungsnummer (RVNR), falls bekannt */
  versicherungsnummer?: string;
  /** Staatsangehoerigkeit (3-digit country code) */
  staatsangehoerigkeit: string;
  /** Beschaeftigungsbeginn (YYYYMMDD) */
  beschaeftigungsbeginn: string;
  /** Geschlecht */
  geschlecht: "M" | "W" | "D" | "X";
  /** Branche (NACE section code, for branchen with Sofortmeldepflicht) */
  branchenSchluessel?: string;
  /** Anschrift: Strasse */
  strasse?: string;
  /** Anschrift: Hausnummer */
  hausnummer?: string;
  /** Anschrift: PLZ */
  postleitzahl?: string;
  /** Anschrift: Ort */
  ort?: string;
}

// ==================== Submission / Response ====================

/** Meldung submission result */
export interface SVMeldungErgebnis {
  /** Whether the submission succeeded */
  erfolg: boolean;
  /** Datensatz-ID / tracking reference */
  datensatzId?: string;
  /** Response message from the portal */
  serverAntwort?: string;
  /** Errors on failure */
  fehler?: SVMeldungFehler[];
  /** Warnings (non-blocking) */
  warnungen?: SVMeldungFehler[];
}

/** Error from SV-Meldeportal */
export interface SVMeldungFehler {
  /** Error code */
  code: string;
  /** Error message (German) */
  nachricht: string;
  /** Affected field name */
  feldname?: string;
  /** Severity */
  schweregrad: "fehler" | "warnung" | "hinweis";
}

/** Batch submission for multiple DEUEV messages */
export interface DEUEVDatenaustauschBatch {
  /** Absender-Betriebsnummer */
  absenderBetriebsnummer: string;
  /** Empfaenger-Betriebsnummer (Einzugsstelle) */
  empfaengerBetriebsnummer: string;
  /** Erstellungsdatum (YYYYMMDD) */
  erstellungsdatum: string;
  /** Dateinummer (sequential file number, 1-999999) */
  dateinummer: number;
  /** Individual messages in the batch */
  meldungen: Array<DEUEVAnmeldung | DEUEVAbmeldung | DEUEVJahresmeldung | DEUEVSofortmeldung>;
}

/** Status of a submitted batch */
export interface DEUEVDatenaustauschStatus {
  /** Datensatz-ID */
  datensatzId: string;
  /** Status */
  status: "eingereicht" | "verarbeitung" | "angenommen" | "teilweise_angenommen" | "abgelehnt" | "fehler";
  /** Timestamp of last status update */
  letzteAktualisierung: string;
  /** Per-message results (if available) */
  einzelergebnisse?: SVMeldungErgebnis[];
}

/** Query parameters for retrieving submission history */
export interface SVMeldungAbfrage {
  /** Filter by Betriebsnummer */
  betriebsnummer?: string;
  /** Filter by date range start (YYYYMMDD) */
  vonDatum?: string;
  /** Filter by date range end (YYYYMMDD) */
  bisDatum?: string;
  /** Filter by message type */
  meldungsart?: "anmeldung" | "abmeldung" | "jahresmeldung" | "sofortmeldung";
  /** Maximum results */
  limit?: number;
}
