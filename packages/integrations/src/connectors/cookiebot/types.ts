// ==================== Cookiebot API Types ====================
// Cookie compliance scanning, declarations, and consent statistics.
// API key authentication.

/** Cookie category as classified by Cookiebot */
export type CookieCategory =
  | "necessary"
  | "preferences"
  | "statistics"
  | "marketing"
  | "unclassified";

/** Status of a domain scan */
export type ScanStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

/** Consent type */
export type CookiebotConsentType =
  | "explicit"    // User actively chose
  | "implicit"    // User continued browsing (where allowed)
  | "bulk";       // Accepted/rejected all

// ==================== Cookie Declaration ====================

/** Complete cookie declaration for a domain */
export interface CookieDeclaration {
  /** Domain scanned */
  domain: string;
  /** Date the declaration was last updated */
  lastUpdated: string;
  /** Total cookies found */
  totalCookies: number;
  /** Cookies grouped by category */
  categories: CookieCategoryGroup[];
  /** Scan that produced this declaration */
  scanId?: string;
}

/** Group of cookies in a category */
export interface CookieCategoryGroup {
  /** Category name */
  category: CookieCategory;
  /** Description of this category */
  description: string;
  /** Number of cookies in this category */
  count: number;
  /** Individual cookies */
  cookies: CookieDetails[];
}

/** Individual cookie details */
export interface CookieDetails {
  /** Cookie name */
  name: string;
  /** Provider/domain that sets the cookie */
  provider: string;
  /** Purpose/description */
  purpose: string;
  /** Expiry duration (e.g., "1 year", "session") */
  expiry: string;
  /** Cookie type */
  type: "http" | "html_local_storage" | "html_session_storage" | "pixel_tracker" | "other";
  /** Category classification */
  category: CookieCategory;
  /** Whether this is a first-party or third-party cookie */
  firstParty: boolean;
  /** Cookie domain pattern */
  cookieDomain?: string;
  /** Path */
  path?: string;
  /** Secure flag */
  secure?: boolean;
  /** HttpOnly flag */
  httpOnly?: boolean;
  /** SameSite attribute */
  sameSite?: "strict" | "lax" | "none";
}

// ==================== Scan Results ====================

/** Domain scan result */
export interface CookiebotScan {
  /** Scan ID */
  id: string;
  /** Domain that was scanned */
  domain: string;
  /** Scan status */
  status: ScanStatus;
  /** Number of pages scanned */
  pagesScanned: number;
  /** Total cookies found */
  totalCookies: number;
  /** New cookies found (not seen in previous scan) */
  newCookies: number;
  /** Cookies removed since last scan */
  removedCookies: number;
  /** Unclassified cookies count */
  unclassifiedCookies: number;
  /** Breakdown by category */
  categoryCounts: Record<CookieCategory, number>;
  /** Third-party domains found */
  thirdPartyDomains: string[];
  /** Scan started at */
  startedAt: string;
  /** Scan completed at */
  completedAt?: string;
  /** Errors during scan */
  errors?: ScanError[];
}

/** Error during a scan */
export interface ScanError {
  /** Page URL where error occurred */
  url: string;
  /** Error message */
  message: string;
  /** HTTP status code (if applicable) */
  statusCode?: number;
}

// ==================== Consent Statistics ====================

/** Consent statistics overview */
export interface ConsentStatistics {
  /** Domain */
  domain: string;
  /** Period start */
  periodStart: string;
  /** Period end */
  periodEnd: string;
  /** Total page views */
  totalPageViews: number;
  /** Page views with consent dialog shown */
  dialogsShown: number;
  /** Total consent actions taken */
  totalConsentActions: number;
  /** Overall opt-in rate (0-100) */
  optInRate: number;
  /** Breakdown by consent type */
  consentBreakdown: ConsentBreakdown;
  /** Category-level statistics */
  categoryStats: CategoryConsentStat[];
  /** Geographic breakdown */
  geoBreakdown?: GeoConsentStat[];
  /** Daily data points */
  dailyStats?: DailyConsentStat[];
}

/** Consent action breakdown */
export interface ConsentBreakdown {
  /** Users who accepted all cookies */
  acceptAll: number;
  /** Users who rejected all non-necessary cookies */
  rejectAll: number;
  /** Users who customized their preferences */
  customized: number;
  /** Users who did not interact with the dialog */
  noInteraction: number;
}

/** Consent stats per cookie category */
export interface CategoryConsentStat {
  category: CookieCategory;
  accepted: number;
  rejected: number;
  acceptanceRate: number;
}

/** Consent stats per country */
export interface GeoConsentStat {
  countryCode: string;
  countryName: string;
  totalVisitors: number;
  optInRate: number;
}

/** Daily consent statistics */
export interface DailyConsentStat {
  date: string;
  pageViews: number;
  dialogsShown: number;
  acceptAll: number;
  rejectAll: number;
  customized: number;
  optInRate: number;
}

// ==================== Request / Response ====================

/** Parameters for requesting consent statistics */
export interface ConsentStatsParams {
  /** Domain to get stats for */
  domain: string;
  /** Start date (YYYY-MM-DD) */
  dateFrom: string;
  /** End date (YYYY-MM-DD) */
  dateTo: string;
  /** Include daily breakdown */
  includeDailyStats?: boolean;
  /** Include geographic breakdown */
  includeGeoStats?: boolean;
}

/** Parameters for requesting a new scan */
export interface RequestScanParams {
  /** Domain to scan */
  domain: string;
  /** Maximum pages to scan */
  maxPages?: number;
  /** Whether to follow external links */
  followExternalLinks?: boolean;
}

/** Paginated list response */
export interface CookiebotListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== Client Config ====================

export interface CookiebotClientConfig {
  /** Cookiebot API key */
  apiKey: string;
  /** Cookiebot domain group ID */
  domainGroupId: string;
  /** Base URL override */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
}
