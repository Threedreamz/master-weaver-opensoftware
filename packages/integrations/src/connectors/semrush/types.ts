// ==================== Semrush API Types ====================

/** Database codes for regional data */
export type SemrushDatabase =
  | "us" | "uk" | "de" | "fr" | "es" | "it" | "br" | "au"
  | "ca" | "ru" | "jp" | "in" | "nl" | "be" | "ch" | "at"
  | "se" | "dk" | "no" | "fi" | "pl" | "tr" | "mx" | "ar";

/** Report types available in the Semrush API */
export type SemrushReportType =
  | "domain_ranks"
  | "domain_organic"
  | "domain_adwords"
  | "domain_organic_organic"
  | "domain_adwords_adwords"
  | "backlinks_overview"
  | "backlinks"
  | "backlinks_refdomains"
  | "phrase_all"
  | "phrase_this"
  | "phrase_organic"
  | "phrase_related"
  | "phrase_fullsearch";

// ==================== Request Params ====================

export interface SemrushBaseParams {
  database?: SemrushDatabase;
  display_limit?: number;
  display_offset?: number;
  export_columns?: string;
}

export interface SemrushDomainOverviewParams extends SemrushBaseParams {
  domain: string;
}

export interface SemrushOrganicSearchParams extends SemrushBaseParams {
  domain: string;
  display_sort?: string;
  display_filter?: string;
}

export interface SemrushBacklinksParams extends SemrushBaseParams {
  target: string;
  target_type?: "root_domain" | "domain" | "url";
}

export interface SemrushKeywordParams extends SemrushBaseParams {
  phrase: string;
}

export interface SemrushTrafficParams {
  targets: string[];
  display_date?: string;
  country?: string;
}

// ==================== Response Types ====================

export interface SemrushDomainOverview {
  Db: string;
  Dn: string;
  Rk: number;
  Or: number;
  Ot: number;
  Oc: number;
  Ad: number;
  At: number;
  Ac: number;
  Sh: number;
  Sv: number;
  FKn: number;
  FPn: number;
}

export interface SemrushOrganicResult {
  Ph: string;
  Po: number;
  Pp: number;
  Pd: string;
  Nq: number;
  Cp: number;
  Ur: string;
  Tr: number;
  Tc: number;
  Co: number;
  Nr: number;
  Td: string;
}

export interface SemrushBacklinkResult {
  source_url: string;
  source_title: string;
  target_url: string;
  anchor: string;
  external_num: number;
  internal_num: number;
  first_seen: string;
  last_seen: string;
  type: "text" | "image" | "frame" | "form";
  nofollow: boolean;
}

export interface SemrushBacklinksOverview {
  total: number;
  domains_num: number;
  urls_num: number;
  ips_num: number;
  ipclassc_num: number;
  follows_num: number;
  nofollows_num: number;
  texts_num: number;
  images_num: number;
  forms_num: number;
  frames_num: number;
}

export interface SemrushKeywordResult {
  Ph: string;
  Nq: number;
  Cp: number;
  Co: number;
  Nr: number;
  Td: number;
  Rr: number;
  Fk: number;
}

export interface SemrushTrafficResult {
  target: string;
  visits: number;
  unique_visitors: number;
  pages_per_visit: number;
  avg_visit_duration: number;
  bounce_rate: number;
}

export interface SemrushClientConfig {
  apiKey: string;
  /** Default database for requests (defaults to "us") */
  defaultDatabase?: SemrushDatabase;
  /** Request timeout in ms */
  timeout?: number;
}
