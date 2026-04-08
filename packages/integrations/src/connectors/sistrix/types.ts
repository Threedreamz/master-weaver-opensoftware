// ==================== Sistrix API Types ====================

/** Country codes supported by Sistrix */
export type SistrixCountry =
  | "de" | "at" | "ch" | "uk" | "us" | "es" | "fr" | "it"
  | "br" | "pl" | "nl" | "se" | "tr" | "be";

/** Date format: YYYY-MM-DD */
export type SistrixDate = string;

// ==================== Request Params ====================

export interface SistrixBaseParams {
  /** Domain, host, path, or URL */
  domain: string;
  /** Country for data (defaults to "de") */
  country?: SistrixCountry;
  /** Whether to include mobile data */
  mobile?: boolean;
}

export interface SistrixVisibilityParams extends SistrixBaseParams {
  /** Historical date for comparison (YYYY-MM-DD) */
  date?: SistrixDate;
  /** Return history over time */
  history?: boolean;
}

export interface SistrixKeywordsParams extends SistrixBaseParams {
  /** Max results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Filter by search phrase */
  search?: string;
  /** Filter by position range (e.g. "1-10") */
  position?: string;
}

export interface SistrixLinksParams extends SistrixBaseParams {
  /** Max results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

export interface SistrixOptimizerParams {
  /** Optimizer project ID */
  project: string;
  /** Max results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

// ==================== Response Types ====================

export interface SistrixVisibilityIndex {
  domain: string;
  visibility_index: number;
  date: string;
  country: SistrixCountry;
}

export interface SistrixVisibilityHistory {
  domain: string;
  data: Array<{
    date: string;
    value: number;
  }>;
}

export interface SistrixKeyword {
  keyword: string;
  position: number;
  previous_position: number | null;
  url: string;
  search_volume: number;
  traffic_index: number;
  cpc: number;
  competition: number;
  result_count: number;
  trend: number[];
}

export interface SistrixLink {
  url: string;
  text: string;
  target: string;
  domain_visibility: number;
  domain_pop: number;
  network_pop: number;
  first_seen: string;
  last_seen: string;
}

export interface SistrixOptimizerProject {
  project_id: string;
  project_name: string;
  visibility_index: number;
  keywords_count: number;
  pages_count: number;
  onpage_score: number;
}

export interface SistrixOptimizerKeyword {
  keyword: string;
  position: number;
  url: string;
  search_volume: number;
  tags: string[];
  device: "desktop" | "mobile";
}

export interface SistrixApiResponse<T> {
  answer: Array<{
    [key: string]: T;
  }>;
}

export interface SistrixClientConfig {
  /** Sistrix API key */
  apiKey: string;
  /** Default country (defaults to "de") */
  defaultCountry?: SistrixCountry;
  /** Request timeout in ms */
  timeout?: number;
}
