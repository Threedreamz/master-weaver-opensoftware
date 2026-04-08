// ==================== Moz API Types ====================

/** Scope for link metrics requests */
export type MozScope = "page" | "subdomain" | "root_domain";

/** Source for anchor text analysis */
export type MozAnchorScope = "phrase_to_page" | "phrase_to_subdomain" | "phrase_to_root_domain";

// ==================== Request Params ====================

export interface MozUrlMetricsParams {
  /** Target URL or domain to analyze */
  target: string;
}

export interface MozBulkUrlMetricsParams {
  /** Array of URLs to analyze (max 50) */
  targets: string[];
}

export interface MozLinkMetricsParams {
  /** Target URL or domain */
  target: string;
  /** Scope of the target */
  target_scope?: MozScope;
  /** Scope of the linking pages */
  source_scope?: MozScope;
  /** Max results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Sort by column */
  sort?: string;
}

export interface MozAnchorTextParams {
  /** Target URL or domain */
  target: string;
  /** Scope of the anchor text analysis */
  scope?: MozAnchorScope;
  /** Max results */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Sort by column */
  sort?: string;
}

// ==================== Response Types ====================

export interface MozUrlMetrics {
  /** Page URL */
  page: string;
  /** Subdomain */
  subdomain: string;
  /** Root domain */
  root_domain: string;
  /** Domain Authority (1-100) */
  domain_authority: number;
  /** Page Authority (1-100) */
  page_authority: number;
  /** Spam Score (1-100) */
  spam_score: number;
  /** Total external links to this page */
  link_count: number;
  /** Total external links to this root domain */
  root_domains_to_root_domain: number;
  /** Redirect chain status code */
  http_code: number;
  /** Last time Moz crawled this URL */
  last_crawled: string;
}

export interface MozLinkMetric {
  /** Source page URL */
  source_page: string;
  /** Target page URL */
  target_page: string;
  /** Anchor text */
  anchor_text: string;
  /** Source page Domain Authority */
  source_domain_authority: number;
  /** Source page Page Authority */
  source_page_authority: number;
  /** Source page Spam Score */
  source_spam_score: number;
  /** Link is dofollow */
  is_dofollow: boolean;
  /** First discovered timestamp */
  first_discovered: string;
  /** Last seen timestamp */
  last_seen: string;
}

export interface MozAnchorText {
  /** The anchor text phrase */
  anchor_text: string;
  /** Number of external links using this anchor */
  external_links: number;
  /** Number of external root domains using this anchor */
  external_root_domains: number;
  /** Number of deleted links that used this anchor */
  deleted_links: number;
}

export interface MozClientConfig {
  /** Moz Access ID */
  accessId: string;
  /** Moz Secret Key */
  secretKey: string;
  /** Request timeout in ms */
  timeout?: number;
}
