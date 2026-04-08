// ==================== SimilarWeb API Types ====================

/** Granularity for time series data */
export type SimilarWebGranularity = "monthly" | "weekly" | "daily";

/** Country code (2-letter ISO) or "world" for global */
export type SimilarWebCountry = string;

/** Main category for traffic sources */
export type SimilarWebTrafficSource =
  | "direct"
  | "referrals"
  | "search"
  | "social"
  | "mail"
  | "paid_referrals"
  | "display_ads";

// ==================== Request Params ====================

export interface SimilarWebBaseParams {
  /** Target domain (e.g., "example.com") */
  domain: string;
  /** Start date (YYYY-MM format) */
  start_date: string;
  /** End date (YYYY-MM format) */
  end_date: string;
  /** Country filter (2-letter ISO or "world") */
  country?: SimilarWebCountry;
  /** Data granularity */
  granularity?: SimilarWebGranularity;
  /** Limit results only for main_domain (true) or include subdomains */
  main_domain_only?: boolean;
}

export interface SimilarWebTotalTrafficParams extends SimilarWebBaseParams {}

export interface SimilarWebTrafficSourcesParams extends SimilarWebBaseParams {}

export interface SimilarWebTopKeywordsParams extends SimilarWebBaseParams {
  /** Max keywords to return */
  limit?: number;
}

export interface SimilarWebEngagementParams extends SimilarWebBaseParams {}

// ==================== Response Types ====================

export interface SimilarWebVisit {
  date: string;
  visits: number;
}

export interface SimilarWebTotalTraffic {
  visits: SimilarWebVisit[];
  meta: {
    request: {
      domain: string;
      start_date: string;
      end_date: string;
      country: string;
      granularity: string;
    };
    status: string;
    last_updated: string;
  };
}

export interface SimilarWebTrafficSourceShare {
  source_type: SimilarWebTrafficSource;
  visits: Array<{
    date: string;
    organic: number;
    paid: number;
  }>;
}

export interface SimilarWebTrafficSources {
  overview: Array<{
    domain: string;
    source_type: SimilarWebTrafficSource;
    share: number;
  }>;
  meta: {
    request: {
      domain: string;
      start_date: string;
      end_date: string;
      country: string;
    };
    status: string;
    last_updated: string;
  };
}

export interface SimilarWebKeyword {
  search_term: string;
  share: number;
  visits: number;
  volume: number;
  change: number;
  cpc: number;
  url: string;
  position: number;
}

export interface SimilarWebTopKeywords {
  search: SimilarWebKeyword[];
  total_visits: number;
  meta: {
    request: {
      domain: string;
      start_date: string;
      end_date: string;
      country: string;
      limit: number;
    };
    status: string;
    last_updated: string;
  };
}

export interface SimilarWebEngagementMetrics {
  visits: number;
  pages_per_visit: number;
  average_visit_duration: number;
  bounce_rate: number;
  monthly_visits_trend: Array<{
    date: string;
    visits: number;
  }>;
}

export interface SimilarWebEngagement {
  engagement: SimilarWebEngagementMetrics;
  meta: {
    request: {
      domain: string;
      start_date: string;
      end_date: string;
      country: string;
    };
    status: string;
    last_updated: string;
  };
}

export interface SimilarWebClientConfig {
  /** SimilarWeb API key */
  apiKey: string;
  /** Default country (defaults to "world") */
  defaultCountry?: SimilarWebCountry;
  /** Request timeout in ms */
  timeout?: number;
}
