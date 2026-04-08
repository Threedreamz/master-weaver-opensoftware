// ==================== Unternehmensregister Types ====================
// German Company Register (unternehmensregister.de) lookup.
// No authentication required. Public data access.

/** Unternehmensregister client configuration */
export interface UnternehmensregisterClientConfig {
  /** Request timeout in ms */
  timeout?: number;
}

/** Legal form of a company */
export type UnternehmensregisterLegalForm =
  | "GmbH"
  | "UG"            // UG (haftungsbeschraenkt)
  | "AG"
  | "KG"
  | "OHG"
  | "GbR"
  | "e.K."          // Eingetragener Kaufmann
  | "KGaA"
  | "SE"
  | "eG"            // Eingetragene Genossenschaft
  | "e.V."          // Eingetragener Verein
  | "Stiftung"
  | "GmbH & Co. KG"
  | "PartG"         // Partnerschaftsgesellschaft
  | "PartG mbB"
  | string;         // Allow other forms

/** Register type */
export type UnternehmensregisterRegisterType =
  | "HRA"   // Handelsregister Abteilung A (partnerships, sole traders)
  | "HRB"   // Handelsregister Abteilung B (corporations)
  | "GnR"   // Genossenschaftsregister
  | "PR"    // Partnerschaftsregister
  | "VR";   // Vereinsregister

/** Company entry from the register */
export interface UnternehmensregisterCompany {
  /** Company name */
  name: string;
  /** Legal form */
  legalForm?: UnternehmensregisterLegalForm;
  /** Registration court (Registergericht) */
  registrationCourt: string;
  /** Register type + number (e.g., "HRB 12345") */
  registerNumber: string;
  /** Register type */
  registerType: UnternehmensregisterRegisterType;
  /** Registered office city */
  registeredOffice: string;
  /** Full address (if available) */
  address?: UnternehmensregisterAddress;
  /** Current status */
  status: UnternehmensregisterCompanyStatus;
  /** Date of registration (YYYY-MM-DD, if available) */
  registrationDate?: string;
  /** Date of last entry change */
  lastEntryDate?: string;
  /** Object/purpose of the company (Unternehmensgegenstand) */
  businessPurpose?: string;
  /** Registered capital (in EUR, if available) */
  registeredCapital?: number;
  /** Currency of registered capital */
  capitalCurrency?: string;
  /** LEI (Legal Entity Identifier) */
  lei?: string;
}

/** Company status */
export type UnternehmensregisterCompanyStatus =
  | "active"
  | "liquidation"
  | "dissolved"
  | "deleted"
  | "unknown";

/** Company address */
export interface UnternehmensregisterAddress {
  street?: string;
  houseNumber?: string;
  postCode?: string;
  city: string;
  country?: string;
}

/** Officer/director of a company */
export interface UnternehmensregisterOfficer {
  /** Full name */
  name: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Role (Geschaeftsfuehrer, Vorstand, Prokurist, etc.) */
  role: string;
  /** City of residence */
  city?: string;
  /** Date of birth (YYYY-MM-DD, if available) */
  dateOfBirth?: string;
  /** Appointment date */
  appointedAt?: string;
  /** Whether currently active */
  active: boolean;
}

/** Published document from the register */
export interface UnternehmensregisterDocument {
  /** Document type */
  type: UnternehmensregisterDocumentType;
  /** Publication date */
  publicationDate: string;
  /** Document URL */
  url?: string;
  /** Summary / description */
  summary?: string;
}

/** Document types available in the register */
export type UnternehmensregisterDocumentType =
  | "handelsregisterauszug"        // Commercial register excerpt
  | "gesellschaftsvertrag"         // Articles of association
  | "jahresabschluss"              // Annual financial statement
  | "gesellschafterliste"          // List of shareholders
  | "registerbekanntmachung"       // Register announcement
  | "insolvenzbekanntmachung"      // Insolvency announcement
  | "sonstiges";                   // Other

/** Search parameters */
export interface UnternehmensregisterSearchParams {
  /** Company name (partial match) */
  companyName?: string;
  /** Registration court */
  registrationCourt?: string;
  /** Register number (e.g., "HRB 12345") */
  registerNumber?: string;
  /** Register type filter */
  registerType?: UnternehmensregisterRegisterType;
  /** City filter */
  city?: string;
  /** Federal state (Bundesland) */
  state?: UnternehmensregisterState;
  /** Status filter */
  status?: UnternehmensregisterCompanyStatus;
  /** Maximum results to return */
  maxResults?: number;
}

/** German federal states */
export type UnternehmensregisterState =
  | "BW"  // Baden-Wuerttemberg
  | "BY"  // Bayern
  | "BE"  // Berlin
  | "BB"  // Brandenburg
  | "HB"  // Bremen
  | "HH"  // Hamburg
  | "HE"  // Hessen
  | "MV"  // Mecklenburg-Vorpommern
  | "NI"  // Niedersachsen
  | "NW"  // Nordrhein-Westfalen
  | "RP"  // Rheinland-Pfalz
  | "SL"  // Saarland
  | "SN"  // Sachsen
  | "ST"  // Sachsen-Anhalt
  | "SH"  // Schleswig-Holstein
  | "TH";  // Thueringen

/** Search response */
export interface UnternehmensregisterSearchResponse {
  results: UnternehmensregisterCompany[];
  totalResults: number;
}

/** Company detail response (full profile) */
export interface UnternehmensregisterCompanyDetail {
  company: UnternehmensregisterCompany;
  officers: UnternehmensregisterOfficer[];
  documents: UnternehmensregisterDocument[];
  /** History of register entries (Chronologischer Auszug) */
  history?: UnternehmensregisterHistoryEntry[];
}

/** Historical register entry */
export interface UnternehmensregisterHistoryEntry {
  entryDate: string;
  entryNumber?: string;
  description: string;
  /** Raw text of the register entry */
  rawText?: string;
}
