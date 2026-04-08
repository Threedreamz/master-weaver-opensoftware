// ==================== Screaming Frog SEO Spider API Types ====================
// API key authentication via license key

/** Configuration for Screaming Frog client */
export interface ScreamingFrogClientConfig {
  /** Screaming Frog license/API key */
  licenseKey: string;
  /** Base URL for the Screaming Frog API server (self-hosted) */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
}

/** Crawl configuration */
export interface CrawlConfig {
  /** URL to crawl (starting point) */
  startUrl: string;
  /** Maximum number of URLs to crawl */
  maxUrls?: number;
  /** Maximum crawl depth */
  maxDepth?: number;
  /** Crawl speed: requests per second */
  crawlSpeed?: number;
  /** Respect robots.txt directives */
  respectRobotsTxt?: boolean;
  /** Follow external links */
  followExternalLinks?: boolean;
  /** Follow nofollow links */
  followNofollow?: boolean;
  /** Render JavaScript pages */
  renderJavaScript?: boolean;
  /** Custom user agent string */
  userAgent?: string;
  /** URL patterns to include (regex) */
  includePatterns?: string[];
  /** URL patterns to exclude (regex) */
  excludePatterns?: string[];
  /** Store raw HTML for each crawled page */
  storeHtml?: boolean;
  /** Extract structured data (schema.org) */
  extractStructuredData?: boolean;
  /** Check external links for broken links */
  checkExternalLinks?: boolean;
}

/** Crawl status */
export type CrawlStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

/** Crawl job summary */
export interface CrawlJob {
  id: string;
  startUrl: string;
  status: CrawlStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  urlsCrawled: number;
  urlsDiscovered: number;
  config: CrawlConfig;
  errorMessage?: string;
}

/** Individual crawled URL result */
export interface CrawlResult {
  url: string;
  statusCode: number;
  contentType: string;
  title?: string;
  metaDescription?: string;
  h1?: string;
  h2s?: string[];
  canonicalUrl?: string;
  wordCount?: number;
  responseTimeMs: number;
  pageSize: number;
  internalLinks: number;
  externalLinks: number;
  crawlDepth: number;
  indexable: boolean;
  indexabilityReason?: string;
  /** Redirect target if status is 3xx */
  redirectUrl?: string;
  /** Redirect chain if multiple hops */
  redirectChain?: string[];
  /** Schema.org types found */
  structuredDataTypes?: string[];
  /** Hreflang tags */
  hreflangTags?: HreflangTag[];
  /** Open Graph data */
  openGraph?: OpenGraphData;
}

/** Hreflang tag data */
export interface HreflangTag {
  language: string;
  url: string;
}

/** Open Graph metadata */
export interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  url?: string;
}

/** Aggregated crawl summary */
export interface CrawlSummary {
  crawlId: string;
  totalUrls: number;
  internalUrls: number;
  externalUrls: number;
  statusCodeDistribution: Record<string, number>;
  contentTypeDistribution: Record<string, number>;
  averageResponseTimeMs: number;
  averagePageSize: number;
  averageWordCount: number;
  indexablePages: number;
  nonIndexablePages: number;
  pagesWithoutTitle: number;
  pagesWithoutDescription: number;
  pagesWithoutH1: number;
  duplicateTitles: number;
  duplicateDescriptions: number;
  brokenLinks: number;
  redirects: number;
}

/** Crawl results query parameters */
export interface CrawlResultsParams {
  /** Filter by HTTP status code */
  statusCode?: number;
  /** Filter by content type */
  contentType?: string;
  /** Filter by indexability */
  indexable?: boolean;
  /** URL pattern filter (regex) */
  urlPattern?: string;
  /** Sort field */
  sortBy?: "url" | "statusCode" | "responseTimeMs" | "pageSize" | "wordCount";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
  /** Page number (0-based) */
  page?: number;
  /** Results per page */
  pageSize?: number;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
