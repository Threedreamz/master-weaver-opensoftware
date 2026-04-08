// ==================== Clearbit API Types ====================

// ==================== Person Enrichment ====================

export interface ClearbitPersonName {
  fullName: string | null;
  givenName: string | null;
  familyName: string | null;
}

export interface ClearbitPersonGeo {
  city: string | null;
  state: string | null;
  stateCode: string | null;
  country: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
}

export interface ClearbitPersonEmployment {
  domain: string | null;
  name: string | null;
  title: string | null;
  role: string | null;
  subRole: string | null;
  seniority: string | null;
}

export interface ClearbitPerson {
  id: string;
  avatar: string | null;
  email: string;
  emailProvider: boolean;
  name: ClearbitPersonName;
  gender: string | null;
  location: string | null;
  timeZone: string | null;
  utcOffset: number | null;
  geo: ClearbitPersonGeo;
  bio: string | null;
  site: string | null;
  twitter: { handle: string | null; bio: string | null; followers: number | null } | null;
  linkedin: { handle: string | null } | null;
  github: { handle: string | null; avatar: string | null } | null;
  employment: ClearbitPersonEmployment;
  indexedAt: string;
}

// ==================== Company Enrichment ====================

export interface ClearbitCompanyCategory {
  sector: string | null;
  industryGroup: string | null;
  industry: string | null;
  subIndustry: string | null;
  sicCode: string | null;
  naicsCode: string | null;
}

export interface ClearbitCompanyMetrics {
  raised: number | null;
  alexaUsRank: number | null;
  alexaGlobalRank: number | null;
  employees: number | null;
  employeesRange: string | null;
  marketCap: number | null;
  annualRevenue: number | null;
  estimatedAnnualRevenue: string | null;
  fiscalYearEnd: number | null;
}

export interface ClearbitCompanyGeo {
  streetNumber: string | null;
  streetName: string | null;
  subPremise: string | null;
  city: string | null;
  postalCode: string | null;
  state: string | null;
  stateCode: string | null;
  country: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
}

export interface ClearbitCompany {
  id: string;
  name: string | null;
  legalName: string | null;
  domain: string;
  domainAliases: string[];
  tags: string[];
  description: string | null;
  url: string | null;
  logo: string | null;
  emailProvider: boolean;
  type: string | null;
  ticker: string | null;
  identifiers: { usEIN: string | null; usCIK: string | null };
  phone: string | null;
  site: { phoneNumbers: string[]; emailAddresses: string[] };
  category: ClearbitCompanyCategory;
  metrics: ClearbitCompanyMetrics;
  geo: ClearbitCompanyGeo;
  tech: string[];
  techCategories: string[];
  foundedYear: number | null;
  indexedAt: string;
}

// ==================== Combined Enrichment ====================

export interface ClearbitCombinedResponse {
  person: ClearbitPerson;
  company: ClearbitCompany;
}

// ==================== Email Lookup ====================

export interface ClearbitEmailLookupParams {
  email: string;
}

export interface ClearbitCompanyLookupParams {
  domain: string;
}

// ==================== Client Config ====================

export interface ClearbitClientConfig {
  /** Clearbit API key (used as Bearer token) */
  apiKey: string;
  /** Request timeout in ms */
  timeout?: number;
}
