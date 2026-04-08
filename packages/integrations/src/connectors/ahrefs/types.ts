// ==================== Ahrefs API Types ====================

/** Mode for selecting data source */
export type AhrefsMode = "exact" | "domain" | "subdomains" | "prefix";

/** Protocol filter */
export type AhrefsProtocol = "http" | "https" | "both";

/** Order direction */
export type AhrefsOrderDirection = "asc" | "desc";

// ==================== Request Params ====================

export interface AhrefsBaseParams {
  /** Target URL or domain */
  target: string;
  /** How to interpret the target */
  mode?: AhrefsMode;
  /** Max results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface AhrefsBacklinksParams extends AhrefsBaseParams {
  /** Filter by referring domain */
  where?: Record<string, unknown>;
  /** Column to order by */
  order_by?: string;
  /** Order direction */
  order_direction?: AhrefsOrderDirection;
}

export interface AhrefsRefDomainsParams extends AhrefsBaseParams {
  /** Column to order by */
  order_by?: string;
  order_direction?: AhrefsOrderDirection;
}

export interface AhrefsOrganicKeywordsParams extends AhrefsBaseParams {
  /** Country code (e.g., "us", "de") */
  country?: string;
  /** Column to order by */
  order_by?: string;
  order_direction?: AhrefsOrderDirection;
}

export interface AhrefsDomainRatingParams {
  target: string;
  mode?: AhrefsMode;
}

// ==================== Response Types ====================

export interface AhrefsBacklink {
  url_from: string;
  url_to: string;
  ahrefs_rank: number;
  domain_rating: number;
  anchor: string;
  encoding: string;
  first_seen: string;
  last_visited: string;
  is_dofollow: boolean;
  is_content: boolean;
  is_image: boolean;
  url_from_title: string;
  http_code: number;
  links_external: number;
  links_internal: number;
  page_size: number;
  language: string;
}

export interface AhrefsRefDomain {
  domain: string;
  domain_rating: number;
  ahrefs_rank: number;
  backlinks: number;
  dofollow_backlinks: number;
  first_seen: string;
  last_visited: string;
}

export interface AhrefsOrganicKeyword {
  keyword: string;
  volume: number;
  position: number;
  previous_position: number | null;
  url: string;
  traffic: number;
  cpc: number;
  difficulty: number;
  serp_features: string[];
  country: string;
  last_update: string;
}

export interface AhrefsDomainRating {
  domain_rating: number;
  ahrefs_rank: number;
  referring_domains: number;
  backlinks: number;
  referring_domains_dofollow: number;
}

export interface AhrefsPaginatedResponse<T> {
  items: T[];
  total: number;
  has_more: boolean;
}

export interface AhrefsClientConfig {
  /** Bearer token for API access */
  apiToken: string;
  /** Request timeout in ms */
  timeout?: number;
}
