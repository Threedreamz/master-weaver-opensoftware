// ==================== eJustice Portal API Types ====================
// Cross-border business register search across EU member states.
// No authentication required.

/** EU member state codes */
export type EjusticeMemberState =
  | "AT" | "BE" | "BG" | "HR" | "CY" | "CZ" | "DK" | "EE"
  | "FI" | "FR" | "DE" | "GR" | "HU" | "IE" | "IT" | "LV"
  | "LT" | "LU" | "MT" | "NL" | "PL" | "PT" | "RO" | "SK"
  | "SI" | "ES" | "SE";

/** Type of business entity */
export type EjusticeEntityType =
  | "company"
  | "branch"
  | "partnership"
  | "sole_trader"
  | "cooperative"
  | "european_company"   // Societas Europaea (SE)
  | "european_cooperative" // SCE
  | "eeig"               // European Economic Interest Grouping
  | "other";

/** Status of a registered business */
export type EjusticeBusinessStatus =
  | "active"
  | "inactive"
  | "dissolved"
  | "in_liquidation"
  | "struck_off"
  | "unknown";

/** Type of register */
export type EjusticeRegisterType =
  | "commercial"
  | "company"
  | "trade"
  | "association"
  | "cooperative"
  | "other";

// ==================== Business Data ====================

/** Business entity from a cross-border search */
export interface EjusticeBusiness {
  /** EUID (European Unique Identifier) if available */
  euid?: string;
  /** Business name as registered */
  name: string;
  /** Alternative/trading name */
  tradingName?: string;
  /** Entity type */
  entityType: EjusticeEntityType;
  /** Legal form (country-specific, e.g., "GmbH", "S.A.R.L.", "Ltd") */
  legalForm?: string;
  /** Country of registration */
  country: EjusticeMemberState;
  /** National register identifier */
  registerId?: string;
  /** Register type */
  registerType?: EjusticeRegisterType;
  /** Current status */
  status: EjusticeBusinessStatus;
  /** Registered office address */
  registeredAddress?: EjusticeAddress;
  /** Date of incorporation/registration */
  registrationDate?: string;
  /** Date of dissolution (if applicable) */
  dissolutionDate?: string;
  /** Share capital */
  capital?: EjusticeCapital;
  /** Business activity description */
  activityDescription?: string;
  /** NACE activity code */
  naceCode?: string;
  /** Link to national register entry */
  nationalRegisterUrl?: string;
}

/** Business details with additional information */
export interface EjusticeBusinessDetails extends EjusticeBusiness {
  /** Directors/managers */
  directors?: EjusticeDirector[];
  /** Shareholders (if public information) */
  shareholders?: EjusticeShareholder[];
  /** Branch offices */
  branches?: EjusticeBranch[];
  /** Annual filing information */
  filings?: EjusticeFiling[];
  /** Cross-border merger information */
  mergerInfo?: string;
  /** Last update from national register */
  lastUpdated?: string;
}

/** Address structure */
export interface EjusticeAddress {
  streetAddress?: string;
  postalCode?: string;
  city?: string;
  region?: string;
  country: EjusticeMemberState;
}

/** Capital information */
export interface EjusticeCapital {
  amount: number;
  currency: string;
  paidUp?: number;
}

/** Director/manager information */
export interface EjusticeDirector {
  name: string;
  role?: string;
  appointmentDate?: string;
  nationality?: string;
}

/** Shareholder information */
export interface EjusticeShareholder {
  name: string;
  sharePercentage?: number;
  shareAmount?: number;
  type?: "person" | "company";
}

/** Branch office */
export interface EjusticeBranch {
  name?: string;
  address?: EjusticeAddress;
  registerCountry?: EjusticeMemberState;
  registerId?: string;
}

/** Filed document reference */
export interface EjusticeFiling {
  type: string;
  date: string;
  description?: string;
  available: boolean;
}

// ==================== Search ====================

/** Search parameters for the eJustice business register portal */
export interface EjusticeSearchParams {
  /** Company name (or part of it) */
  companyName: string;
  /** Filter by country (ISO 2-letter code) */
  country?: EjusticeMemberState;
  /** Filter by multiple countries */
  countries?: EjusticeMemberState[];
  /** National register number */
  registerNumber?: string;
  /** EUID (European Unique Identifier) */
  euid?: string;
  /** Filter by entity type */
  entityType?: EjusticeEntityType;
  /** Filter by status */
  status?: EjusticeBusinessStatus;
  /** Maximum results per page */
  pageSize?: number;
  /** Page number (1-based) */
  page?: number;
}

/** Search response */
export interface EjusticeSearchResponse {
  /** Total number of matching results */
  totalResults: number;
  /** Current page */
  page: number;
  /** Page size */
  pageSize: number;
  /** Matching businesses */
  results: EjusticeBusiness[];
}

// ==================== Client Config ====================

export interface EjusticeClientConfig {
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Preferred language for results (ISO 639-1) */
  language?: string;
}
