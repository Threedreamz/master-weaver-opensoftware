// ==================== Hunter.io API Types ====================

// ==================== Domain Search ====================

export interface HunterEmail {
  value: string;
  type: "personal" | "generic" | null;
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  seniority: string | null;
  department: string | null;
  linkedin: string | null;
  twitter: string | null;
  phone_number: string | null;
  sources: HunterSource[];
}

export interface HunterSource {
  domain: string;
  uri: string;
  extracted_on: string;
  last_seen_on: string;
  still_on_page: boolean;
}

export interface HunterDomainSearchResponse {
  data: {
    domain: string;
    disposable: boolean;
    webmail: boolean;
    accept_all: boolean;
    pattern: string | null;
    organization: string | null;
    country: string | null;
    state: string | null;
    emails: HunterEmail[];
  };
  meta: {
    results: number;
    limit: number;
    offset: number;
    params: Record<string, string>;
  };
}

export interface HunterDomainSearchParams {
  domain: string;
  company?: string;
  limit?: number;
  offset?: number;
  type?: "personal" | "generic";
  seniority?: string;
  department?: string;
}

// ==================== Email Finder ====================

export interface HunterEmailFinderResponse {
  data: {
    first_name: string;
    last_name: string;
    email: string | null;
    score: number;
    domain: string;
    accept_all: boolean;
    position: string | null;
    twitter: string | null;
    linkedin_url: string | null;
    phone_number: string | null;
    company: string | null;
    sources: HunterSource[];
  };
}

export interface HunterEmailFinderParams {
  domain: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  company?: string;
}

// ==================== Email Verifier ====================

export type HunterVerificationStatus =
  | "valid"
  | "invalid"
  | "accept_all"
  | "webmail"
  | "disposable"
  | "unknown";

export type HunterVerificationResult = "deliverable" | "undeliverable" | "risky" | "unknown";

export interface HunterEmailVerifierResponse {
  data: {
    email: string;
    result: HunterVerificationResult;
    score: number;
    status: HunterVerificationStatus;
    regexp: boolean;
    gibberish: boolean;
    disposable: boolean;
    webmail: boolean;
    mx_records: boolean;
    smtp_server: boolean;
    smtp_check: boolean;
    accept_all: boolean;
    block: boolean;
    sources: HunterSource[];
  };
}

// ==================== Account ====================

export interface HunterAccountResponse {
  data: {
    email: string;
    first_name: string;
    last_name: string;
    plan_name: string;
    plan_level: number;
    reset_date: string;
    calls: {
      used: number;
      available: number;
    };
  };
}

// ==================== Client Config ====================

export interface HunterClientConfig {
  /** Hunter.io API key (passed as query parameter) */
  apiKey: string;
  /** Request timeout in ms */
  timeout?: number;
}
