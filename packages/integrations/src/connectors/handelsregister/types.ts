// ==================== Handelsregister (German Commercial Register) Types ====================
// Access to company registration data from handelsregister.de.
// Custom authentication (session-based).

/** Type of register entry */
export type RegisterType =
  | "HRA"   // Handelsregister Abteilung A (partnerships, sole proprietors)
  | "HRB"   // Handelsregister Abteilung B (corporations: GmbH, AG, etc.)
  | "GnR"   // Genossenschaftsregister (cooperative register)
  | "PR"    // Partnerschaftsregister (professional partnerships)
  | "VR";   // Vereinsregister (association register)

/** Legal form of a company */
export type HrLegalForm =
  | "GmbH"
  | "UG"
  | "AG"
  | "SE"
  | "KG"
  | "OHG"
  | "GbR"
  | "GmbH & Co. KG"
  | "e.K."
  | "eG"
  | "PartG"
  | "PartG mbB"
  | "e.V."
  | "Stiftung"
  | "KGaA"
  | "other";

/** Status of a company in the register */
export type HrCompanyStatus =
  | "active"
  | "liquidation"
  | "dissolved"
  | "deleted";

/** German federal state (Bundesland) for court filtering */
export type HrBundesland =
  | "BW" | "BY" | "BE" | "BB" | "HB" | "HH"
  | "HE" | "MV" | "NI" | "NW" | "RP" | "SL"
  | "SN" | "ST" | "SH" | "TH";

// ==================== Company Data ====================

/** Summary of a company from search results */
export interface HrCompanySummary {
  /** Company name as registered */
  companyName: string;
  /** Court (Registergericht) */
  court: string;
  /** Register type */
  registerType: RegisterType;
  /** Register number (e.g., "12345") */
  registerNumber: string;
  /** Full register reference (e.g., "HRB 12345 AG Muenchen") */
  registerReference: string;
  /** Current status */
  status: HrCompanyStatus;
  /** Registered address (city) */
  city?: string;
  /** Postal code */
  postalCode?: string;
}

/** Full company details from the register */
export interface HrCompanyDetails extends HrCompanySummary {
  /** Full registered address */
  address?: HrAddress;
  /** Legal form */
  legalForm?: HrLegalForm | string;
  /** Purpose of the company (Unternehmensgegenstand) */
  purpose?: string;
  /** Share capital (Stammkapital / Grundkapital) */
  shareCapital?: HrShareCapital;
  /** Managing directors / board members */
  representatives?: HrRepresentative[];
  /** Shareholders (if available, e.g., for GmbH) */
  shareholders?: HrShareholder[];
  /** Prokuristen (authorized signatories) */
  prokuristen?: HrProkurist[];
  /** Date of registration */
  registrationDate?: string;
  /** Date of last change in the register */
  lastChangeDate?: string;
  /** History of register announcements */
  announcements?: HrAnnouncement[];
  /** Linked documents (Gesellschaftsvertrag, etc.) */
  documents?: HrDocumentReference[];
}

/** Registered address */
export interface HrAddress {
  street: string;
  postalCode: string;
  city: string;
  country?: string;
}

/** Share capital information */
export interface HrShareCapital {
  /** Amount in EUR */
  amount: number;
  /** Currency (typically EUR) */
  currency: string;
  /** Whether fully paid up */
  fullyPaid?: boolean;
}

/** Company representative (Geschaeftsfuehrer, Vorstand) */
export interface HrRepresentative {
  /** Full name */
  name: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Role (e.g., "Geschaeftsfuehrer", "Vorstand") */
  role: string;
  /** City of residence */
  city?: string;
  /** Date of birth */
  dateOfBirth?: string;
  /** Whether sole representative or joint */
  soleRepresentation?: boolean;
}

/** Shareholder information */
export interface HrShareholder {
  /** Name (person or company) */
  name: string;
  /** Share amount in EUR */
  shareAmount?: number;
  /** Share percentage */
  sharePercentage?: number;
}

/** Prokurist (authorized signatory) */
export interface HrProkurist {
  name: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  type?: "einzelprokura" | "gesamtprokura";
}

/** Register announcement */
export interface HrAnnouncement {
  /** Date of the announcement */
  date: string;
  /** Type of announcement */
  type: string;
  /** Content of the announcement */
  content: string;
}

/** Reference to a filed document */
export interface HrDocumentReference {
  /** Document type (e.g., "Gesellschaftsvertrag", "Jahresabschluss") */
  type: string;
  /** Date of the document */
  date?: string;
  /** Whether the document is available for download */
  available: boolean;
}

// ==================== Search ====================

/** Search parameters for the Handelsregister */
export interface HrSearchParams {
  /** Company name (or part of it) */
  companyName?: string;
  /** Register type filter */
  registerType?: RegisterType;
  /** Register number */
  registerNumber?: string;
  /** Court (Registergericht) */
  court?: string;
  /** Federal state filter */
  bundesland?: HrBundesland;
  /** City filter */
  city?: string;
  /** Include deleted entries */
  includeDeleted?: boolean;
  /** Maximum results */
  maxResults?: number;
}

/** Search response */
export interface HrSearchResponse {
  /** Total number of matches */
  totalResults: number;
  /** Search result entries */
  results: HrCompanySummary[];
}

// ==================== Client Config ====================

export interface HrClientConfig {
  /** Username for handelsregister.de */
  username: string;
  /** Password for handelsregister.de */
  password: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}
