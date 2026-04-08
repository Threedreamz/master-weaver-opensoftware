// ==================== Deutsche Rentenversicherung (DRV/DSRV) Types ====================
// Rentenversicherungsmeldungen, Beitragsgrundlagen, DSRV-Datenaustausch.
// Certificate-based authentication.

// ==================== Certificate Config ====================

/** Certificate-based auth for DSRV communication */
export interface DRVConfig {
  /** Path to the certificate file (.pfx / .p12) */
  certificatePath: string;
  /** Certificate password */
  certificatePassword: string;
  /** Betriebsnummer des Arbeitgebers (8-digit employer number) */
  betriebsnummer: string;
  /** Absender-Betriebsnummer (for Abrechnungsstellen) */
  absenderBetriebsnummer?: string;
  /** Use test environment (default: false) */
  testMode?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== DSRV Meldegruende ====================

/** Abgabegrund for RV-Meldungen */
export type RVAbgabegrund =
  | "01"  // Anmeldung
  | "02"  // Sofortmeldung
  | "03"  // Abmeldung wegen Ende der Beschaeftigung
  | "04"  // Abmeldung wegen Tod
  | "05"  // Jahresmeldung
  | "06"  // Unterbrechungsmeldung
  | "09"  // Abmeldung wegen Aenderung der Beitragsgruppe
  | "10"  // Meldung von einmalig gezahltem Arbeitsentgelt
  | "30"  // Abgabe von Beitragsgrundlagen (DEÜV §28a)
  | "31"  // Berichtigung einer Meldung
  | "32"  // Stornierung einer Meldung
  | "36"  // GKV-Monatsmeldung
  | "40"  // Antrag auf Kontenklärung
  | "50"  // Meldung von UV-Entgelt
  | "51"  // Korrektur UV-Entgelt
  | "57"  // Bestandsabfrage VSNR
  | "58"; // Vergabe einer Versicherungsnummer

// ==================== Versicherungsnummer ====================

/** VSNR-Anfrage — request for Versicherungsnummer from DSRV */
export interface VSNRAnfrage {
  /** Betriebsnummer des Arbeitgebers */
  betriebsnummerArbeitgeber: string;
  /** Familienname */
  familienname: string;
  /** Geburtsname (maiden name), if different */
  geburtsname?: string;
  /** Vorname */
  vorname: string;
  /** Geburtsdatum (YYYYMMDD) */
  geburtsdatum: string;
  /** Geschlecht */
  geschlecht: "M" | "W" | "D" | "X";
  /** Geburtsort */
  geburtsort?: string;
  /** Staatsangehoerigkeit (3-digit country code) */
  staatsangehoerigkeit: string;
  /** Anschrift: Strasse */
  strasse?: string;
  /** Anschrift: Hausnummer */
  hausnummer?: string;
  /** Anschrift: PLZ */
  postleitzahl?: string;
  /** Anschrift: Ort */
  ort?: string;
}

/** VSNR-Ergebnis — result of a Versicherungsnummer query or assignment */
export interface VSNRErgebnis {
  /** Whether a VSNR was found or assigned */
  erfolg: boolean;
  /** Versicherungsnummer (12 chars), if found/assigned */
  versicherungsnummer?: string;
  /** Status of the query */
  status: "gefunden" | "vergeben" | "nicht_gefunden" | "mehrdeutig" | "fehler";
  /** If mehrdeutig: list of possible matches */
  kandidaten?: VSNRKandidat[];
  /** Errors */
  fehler?: DRVFehler[];
}

/** A candidate match when VSNR query is ambiguous */
export interface VSNRKandidat {
  /** Versicherungsnummer */
  versicherungsnummer: string;
  /** Familienname */
  familienname: string;
  /** Vorname */
  vorname: string;
  /** Geburtsdatum (YYYYMMDD) */
  geburtsdatum: string;
}

// ==================== RV-Meldungen ====================

/** Base fields for Rentenversicherungsmeldungen */
export interface RVMeldungBasisfelder {
  /** Betriebsnummer des Arbeitgebers */
  betriebsnummerArbeitgeber: string;
  /** Versicherungsnummer des Arbeitnehmers (12 chars) */
  versicherungsnummer: string;
  /** Familienname */
  familienname: string;
  /** Vorname */
  vorname: string;
  /** Geburtsdatum (YYYYMMDD) */
  geburtsdatum: string;
  /** Personengruppenschluessel (3-digit) */
  personengruppe: string;
  /** Abgabegrund */
  abgabegrund: RVAbgabegrund;
  /** Aktenzeichen des Arbeitgebers */
  aktenzeichen?: string;
}

/** RV-Meldung: Beitragsgrundlagen (contribution base data) */
export interface RVBeitragsgrundlagen extends RVMeldungBasisfelder {
  /** Meldezeitraum Beginn (YYYYMMDD) */
  meldezeitraumBeginn: string;
  /** Meldezeitraum Ende (YYYYMMDD) */
  meldezeitraumEnde: string;
  /** Beitragspflichtiges Bruttoentgelt RV (in Cent) */
  beitragspflichtigesEntgeltRV: number;
  /** Beitragspflichtiges Bruttoentgelt KnRV (knappschaftliche RV, in Cent) */
  beitragspflichtigesEntgeltKnRV?: number;
  /** Beitragsgruppe Rentenversicherung (1-digit: 0, 1, 3, 5) */
  beitragsgruppeRV: "0" | "1" | "3" | "5";
  /** Taetigkeitsschluessel (9-digit occupation key) */
  taetigkeitsschluessel: string;
  /** Betriebsnummer der Einzugsstelle (Krankenkasse) */
  betriebsnummerEinzugsstelle: string;
  /** Einmalentgelt (in Cent) */
  einmalentgelt?: number;
  /** Berichtigungskennzeichen */
  berichtigung?: boolean;
  /** Stornierungskennzeichen */
  stornierung?: boolean;
}

/** RV-Meldung: UV-Entgelt (Unfallversicherung wage data) */
export interface RVUVEntgelt extends RVMeldungBasisfelder {
  /** UV-Meldejahr */
  uvMeldejahr: number;
  /** UV-Entgelt (in Cent) */
  uvEntgelt: number;
  /** Arbeitsstunden im Meldejahr */
  arbeitsstunden: number;
  /** Gefahrtarifstelle */
  gefahrtarifstelle: string;
  /** Mitgliedsnummer UV-Traeger */
  mitgliedsnummerUV: string;
  /** Betriebsnummer des UV-Traegers */
  betriebsnummerUVTraeger: string;
}

/** RV-Meldung: Unterbrechungsmeldung */
export interface RVUnterbrechungsmeldung extends RVMeldungBasisfelder {
  /** Beginn der Unterbrechung (YYYYMMDD) */
  unterbrechungBeginn: string;
  /** Ende der Unterbrechung (YYYYMMDD), if known */
  unterbrechungEnde?: string;
  /** Grund der Unterbrechung */
  unterbrechungsgrund: UnterbrechungsGrund;
  /** Letzter Tag mit Entgelt (YYYYMMDD) */
  letzterTagMitEntgelt: string;
  /** Beitragspflichtiges Entgelt bis zur Unterbrechung (in Cent) */
  beitragspflichtigesEntgelt: number;
}

/** Grund fuer Unterbrechungsmeldung */
export type UnterbrechungsGrund =
  | "51"  // Krankengeld / Verletztengeld
  | "52"  // Elternzeit
  | "53"  // Wehrdienst / Bundesfreiwilligendienst
  | "54"  // Pflegezeit nach PflegeZG
  | "55"  // Bezug von Uebergangsgeld
  | "56"  // Kurzarbeitergeld (Kurzarbeit Null)
  | "59"; // Sonstige Unterbrechung

// ==================== Kontenklärung ====================

/** Anfrage zur Kontenklaerung */
export interface KontenklärungsAnfrage {
  /** Versicherungsnummer */
  versicherungsnummer: string;
  /** Betriebsnummer des Arbeitgebers */
  betriebsnummerArbeitgeber: string;
  /** Zeitraum der Klaerung: Von (YYYYMMDD) */
  klaerungszeitraumVon: string;
  /** Zeitraum der Klaerung: Bis (YYYYMMDD) */
  klaerungszeitraumBis: string;
}

/** Ergebnis einer Kontenklaerung */
export interface KontenklärungsErgebnis {
  /** Versicherungsnummer */
  versicherungsnummer: string;
  /** Whether the query was successful */
  erfolg: boolean;
  /** Gespeicherte Beitragszeiten */
  beitragszeiten?: BeitragszeitEintrag[];
  /** Luecken (gaps) in the insurance record */
  luecken?: Zeitluecke[];
  /** Errors */
  fehler?: DRVFehler[];
}

/** A contribution period entry from the insurance record */
export interface BeitragszeitEintrag {
  /** Zeitraum Beginn (YYYYMMDD) */
  zeitraumBeginn: string;
  /** Zeitraum Ende (YYYYMMDD) */
  zeitraumEnde: string;
  /** Betriebsnummer des Arbeitgebers */
  betriebsnummerArbeitgeber: string;
  /** Beitragspflichtiges Entgelt (in Cent) */
  beitragspflichtigesEntgelt: number;
  /** Art der Beitragszeit */
  art: "pflichtbeitrag" | "freiwilliger_beitrag" | "anrechnungszeit" | "zurueckgelegteZeit";
}

/** A gap in the insurance record */
export interface Zeitluecke {
  /** Luecke Beginn (YYYYMMDD) */
  beginn: string;
  /** Luecke Ende (YYYYMMDD) */
  ende: string;
  /** Dauer in Monaten */
  dauerMonate: number;
}

// ==================== Submission / Response ====================

/** Submission result for DRV data exchange */
export interface DRVSubmissionResult {
  /** Whether the submission succeeded */
  erfolg: boolean;
  /** Datensatz-ID / tracking reference */
  datensatzId?: string;
  /** Server response */
  serverAntwort?: string;
  /** Errors */
  fehler?: DRVFehler[];
  /** Warnings */
  warnungen?: DRVFehler[];
}

/** Error from DRV / DSRV */
export interface DRVFehler {
  /** Error code (DSRV error catalogue) */
  code: string;
  /** Error message (German) */
  nachricht: string;
  /** Affected field */
  feldname?: string;
  /** Severity */
  schweregrad: "fehler" | "warnung" | "hinweis";
}

/** Batch of DRV messages */
export interface DRVDatenaustauschBatch {
  /** Absender-Betriebsnummer */
  absenderBetriebsnummer: string;
  /** Empfaenger (DRV-Traeger Betriebsnummer) */
  empfaengerBetriebsnummer: string;
  /** Erstellungsdatum (YYYYMMDD) */
  erstellungsdatum: string;
  /** Dateinummer */
  dateinummer: number;
  /** Beitragsgrundlagen-Meldungen */
  beitragsgrundlagen?: RVBeitragsgrundlagen[];
  /** UV-Entgelt-Meldungen */
  uvEntgelte?: RVUVEntgelt[];
  /** Unterbrechungsmeldungen */
  unterbrechungsmeldungen?: RVUnterbrechungsmeldung[];
  /** VSNR-Anfragen */
  vsnrAnfragen?: VSNRAnfrage[];
}

/** Status of a DRV submission */
export interface DRVDatenaustauschStatus {
  /** Datensatz-ID */
  datensatzId: string;
  /** Status */
  status: "eingereicht" | "verarbeitung" | "angenommen" | "teilweise_angenommen" | "abgelehnt" | "fehler";
  /** Timestamp of last status change */
  letzteAktualisierung: string;
  /** Per-record results */
  einzelergebnisse?: DRVSubmissionResult[];
}

/** Query parameters for DRV message history */
export interface DRVAbfrage {
  /** Filter by Betriebsnummer */
  betriebsnummer?: string;
  /** Filter by Abgabegrund */
  abgabegrund?: RVAbgabegrund;
  /** Filter by date range start (YYYYMMDD) */
  vonDatum?: string;
  /** Filter by date range end (YYYYMMDD) */
  bisDatum?: string;
  /** Maximum results */
  limit?: number;
}
