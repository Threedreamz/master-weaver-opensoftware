// ==================== ITSG GKV Datenaustausch Types ====================
// Krankenkassen-Datenaustausch: Beitragsnachweise, Meldungen, Erstattungsantraege.
// GKV = Gesetzliche Krankenversicherung (statutory health insurance).
// Certificate-based authentication.

// ==================== Certificate Config ====================

/** Certificate-based auth for ITSG GKV communication */
export interface ITSGGKVConfig {
  /** Path to the certificate file (.pfx / .p12) */
  certificatePath: string;
  /** Certificate password */
  certificatePassword: string;
  /** Betriebsnummer des Arbeitgebers (8-digit employer number) */
  betriebsnummer: string;
  /** Absender-Betriebsnummer (sender, for Abrechnungsstellen) */
  absenderBetriebsnummer?: string;
  /** Use test environment (default: false) */
  testMode?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Beitragsnachweis (contribution proof) ====================

/** Beitragsnachweis — monthly proof of social insurance contributions */
export interface Beitragsnachweis {
  /** Betriebsnummer des Arbeitgebers */
  betriebsnummerArbeitgeber: string;
  /** Betriebsnummer der Einzugsstelle (Krankenkasse) */
  betriebsnummerEinzugsstelle: string;
  /** Beitragsmonat (YYYYMM) */
  beitragsmonat: string;
  /** Erstellungsdatum (YYYYMMDD) */
  erstellungsdatum: string;

  // Beitraege (all amounts in Cent)

  /** KV-Beitrag allgemein (general health insurance contribution) */
  kvBeitragAllgemein: number;
  /** KV-Beitrag ermaessigt (reduced health insurance contribution) */
  kvBeitragErmaessigt: number;
  /** KV-Zusatzbeitrag (supplementary health insurance contribution) */
  kvZusatzbeitrag: number;
  /** RV-Beitrag (pension insurance contribution) */
  rvBeitrag: number;
  /** ALV-Beitrag (unemployment insurance contribution) */
  alvBeitrag: number;
  /** PV-Beitrag (nursing care insurance contribution) */
  pvBeitrag: number;
  /** PV-Zuschlag fuer Kinderlose (childless surcharge) */
  pvZuschlagKinderlose: number;

  /** Insolvenzgeldumlage */
  insolvenzgeldumlage: number;
  /** U1-Umlage (Aufwendungsausgleich Krankheit) */
  umlageU1: number;
  /** U2-Umlage (Aufwendungsausgleich Mutterschaft) */
  umlageU2: number;

  /** Gesamtbeitrag (total contribution, in Cent) */
  gesamtbeitrag: number;

  /** Pauschale Beitraege fuer geringfuegig Beschaeftigte (Minijob) */
  pauschalBeitraegeMinijob?: number;

  /** Berichtigte Meldung (corrected filing)? */
  berichtigteMeldung?: boolean;
  /** Stornierung (cancellation)? */
  stornierung?: boolean;

  /** Einzelpositionen (individual employee breakdowns, optional) */
  einzelpositionen?: BeitragsnachweisEinzelposition[];
}

/** Single employee's contribution line in a Beitragsnachweis */
export interface BeitragsnachweisEinzelposition {
  /** Versicherungsnummer (RVNR) */
  versicherungsnummer: string;
  /** Familienname */
  familienname: string;
  /** Vorname */
  vorname: string;
  /** Personengruppenschluessel */
  personengruppe: string;
  /** Beitragsgruppenschluessel (4-digit) */
  beitragsgruppe: string;
  /** Beitragspflichtiges Bruttoentgelt (in Cent) */
  beitragspflichtigesEntgelt: number;
  /** KV-Beitrag (in Cent) */
  kvBeitrag: number;
  /** RV-Beitrag (in Cent) */
  rvBeitrag: number;
  /** ALV-Beitrag (in Cent) */
  alvBeitrag: number;
  /** PV-Beitrag (in Cent) */
  pvBeitrag: number;
}

// ==================== GKV Meldungen ====================

/** GKV Meldungsart (message type for health insurance communication) */
export type GKVMeldungsart =
  | "beitragsnachweis"
  | "beitragsnachweis_korrektur"
  | "erstattungsantrag_u1"
  | "erstattungsantrag_u2"
  | "erstattungsantrag_insolvenzgeld"
  | "zahlstellenmeldung"
  | "entgeltersatzleistung_anfrage"
  | "entgeltersatzleistung_antwort";

/** GKV Datenaustausch header (common to all GKV messages) */
export interface GKVDatenaustauschHeader {
  /** Verfahrenskennung */
  verfahren: string;
  /** Absender-Betriebsnummer */
  absenderBetriebsnummer: string;
  /** Empfaenger-Betriebsnummer */
  empfaengerBetriebsnummer: string;
  /** Erstellungsdatum (YYYYMMDD) */
  erstellungsdatum: string;
  /** Dateinummer (sequential, 1-999999) */
  dateinummer: number;
  /** Versionsnummer des Datensatzes */
  versionsnummer: string;
}

// ==================== Erstattungsantraege (reimbursement claims) ====================

/** Erstattungsantrag U1 — reimbursement for continued pay during illness (AAG) */
export interface ErstattungsantragU1 {
  /** Betriebsnummer des Arbeitgebers */
  betriebsnummerArbeitgeber: string;
  /** Betriebsnummer der Einzugsstelle */
  betriebsnummerEinzugsstelle: string;
  /** Versicherungsnummer des Arbeitnehmers */
  versicherungsnummer: string;
  /** Familienname */
  familienname: string;
  /** Vorname */
  vorname: string;
  /** Geburtsdatum (YYYYMMDD) */
  geburtsdatum: string;

  /** Beginn der Arbeitsunfaehigkeit (YYYYMMDD) */
  auBeginn: string;
  /** Ende der Arbeitsunfaehigkeit (YYYYMMDD) */
  auEnde: string;
  /** Erstattungszeitraum Beginn (YYYYMMDD) */
  erstattungszeitraumBeginn: string;
  /** Erstattungszeitraum Ende (YYYYMMDD) */
  erstattungszeitraumEnde: string;

  /** Erstattungsbetrag Entgeltfortzahlung (in Cent) */
  erstattungsbetragEntgeltfortzahlung: number;
  /** Erstattungsbetrag Arbeitgeberanteile SV-Beitraege (in Cent) */
  erstattungsbetragAGAnteileSV: number;

  /** Gesamterstattungsbetrag (in Cent) */
  gesamterstattungsbetrag: number;

  /** Bankverbindung: IBAN */
  iban: string;
  /** Bankverbindung: BIC */
  bic?: string;

  /** Erstmaliger Antrag oder Folgeantrag */
  antragsart: "erstantrag" | "folgeantrag";
}

/** Erstattungsantrag U2 — reimbursement for maternity pay (AAG) */
export interface ErstattungsantragU2 {
  /** Betriebsnummer des Arbeitgebers */
  betriebsnummerArbeitgeber: string;
  /** Betriebsnummer der Einzugsstelle */
  betriebsnummerEinzugsstelle: string;
  /** Versicherungsnummer der Arbeitnehmerin */
  versicherungsnummer: string;
  /** Familienname */
  familienname: string;
  /** Vorname */
  vorname: string;
  /** Geburtsdatum (YYYYMMDD) */
  geburtsdatum: string;

  /** Beginn Mutterschutzfrist (YYYYMMDD) */
  mutterschutzBeginn: string;
  /** Ende Mutterschutzfrist (YYYYMMDD) */
  mutterschutzEnde: string;
  /** Entbindungstag (YYYYMMDD), actual delivery date */
  entbindungstag?: string;

  /** Erstattungszeitraum Beginn (YYYYMMDD) */
  erstattungszeitraumBeginn: string;
  /** Erstattungszeitraum Ende (YYYYMMDD) */
  erstattungszeitraumEnde: string;

  /** Zuschuss zum Mutterschaftsgeld pro Tag (in Cent) */
  zuschussMutterschaftsgeldProTag: number;
  /** Erstattungsbetrag Zuschuss (in Cent) */
  erstattungsbetragZuschuss: number;
  /** Erstattungsbetrag Arbeitgeberanteile SV-Beitraege (in Cent) */
  erstattungsbetragAGAnteileSV: number;

  /** Gesamterstattungsbetrag (in Cent) */
  gesamterstattungsbetrag: number;

  /** Bankverbindung: IBAN */
  iban: string;
  /** Bankverbindung: BIC */
  bic?: string;
}

// ==================== Submission / Response ====================

/** Submission result for GKV data exchange */
export interface GKVSubmissionResult {
  /** Whether the submission succeeded */
  erfolg: boolean;
  /** Datensatz-ID / tracking reference */
  datensatzId?: string;
  /** Response Verarbeitungskennzeichen */
  verarbeitungskennzeichen?: string;
  /** Server response */
  serverAntwort?: string;
  /** Errors */
  fehler?: GKVFehler[];
  /** Warnings */
  warnungen?: GKVFehler[];
}

/** Error from GKV data exchange */
export interface GKVFehler {
  /** Error code (ITSG error catalogue) */
  code: string;
  /** Error message (German) */
  nachricht: string;
  /** Affected field or data segment */
  feldname?: string;
  /** Severity */
  schweregrad: "fehler" | "warnung" | "hinweis";
}

/** Batch of GKV messages for transmission */
export interface GKVDatenaustauschBatch {
  /** Header */
  header: GKVDatenaustauschHeader;
  /** Beitragsnachweise in this batch */
  beitragsnachweise?: Beitragsnachweis[];
  /** U1 claims in this batch */
  erstattungsantraegeU1?: ErstattungsantragU1[];
  /** U2 claims in this batch */
  erstattungsantraegeU2?: ErstattungsantragU2[];
}

/** Status of a GKV submission */
export interface GKVDatenaustauschStatus {
  /** Datensatz-ID */
  datensatzId: string;
  /** Status */
  status: "eingereicht" | "verarbeitung" | "angenommen" | "teilweise_angenommen" | "abgelehnt" | "fehler";
  /** Timestamp of last status change */
  letzteAktualisierung: string;
  /** Verarbeitungskennzeichen */
  verarbeitungskennzeichen?: string;
  /** Per-record results */
  einzelergebnisse?: GKVSubmissionResult[];
}

/** Query parameters for GKV message history */
export interface GKVAbfrage {
  /** Filter by Betriebsnummer */
  betriebsnummer?: string;
  /** Filter by Einzugsstelle */
  einzugsstelle?: string;
  /** Filter by message type */
  meldungsart?: GKVMeldungsart;
  /** Filter by Beitragsmonat (YYYYMM) */
  beitragsmonat?: string;
  /** Filter by date range start (YYYYMMDD) */
  vonDatum?: string;
  /** Filter by date range end (YYYYMMDD) */
  bisDatum?: string;
  /** Maximum results */
  limit?: number;
}
