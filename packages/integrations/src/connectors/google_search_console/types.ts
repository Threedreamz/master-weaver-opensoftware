/**
 * Google Search Console API types.
 * @see https://developers.google.com/webmaster-tools/v1/api_reference_index
 */

// ── Search Analytics ──────────────────────────────────────────────

export type SearchAnalyticsDimension =
  | "date"
  | "query"
  | "page"
  | "country"
  | "device"
  | "searchAppearance";

export type SearchType = "web" | "image" | "video" | "news" | "discover" | "googleNews";

export type AggregationType = "auto" | "byPage" | "byProperty";

export type DeviceType = "DESKTOP" | "MOBILE" | "TABLET";

export type DataState = "all" | "final";

export interface DimensionFilterGroup {
  groupType?: "and";
  filters: DimensionFilter[];
}

export interface DimensionFilter {
  dimension: SearchAnalyticsDimension;
  operator: "contains" | "equals" | "notContains" | "notEquals" | "includingRegex" | "excludingRegex";
  expression: string;
}

export interface SearchAnalyticsRequest {
  startDate: string;
  endDate: string;
  dimensions?: SearchAnalyticsDimension[];
  type?: SearchType;
  dimensionFilterGroups?: DimensionFilterGroup[];
  aggregationType?: AggregationType;
  rowLimit?: number;
  startRow?: number;
  dataState?: DataState;
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchAnalyticsResponse {
  rows?: SearchAnalyticsRow[];
  responseAggregationType: AggregationType;
}

// ── URL Inspection ────────────────────────────────────────────────

export interface InspectUrlRequest {
  inspectionUrl: string;
  siteUrl: string;
  languageCode?: string;
}

export interface InspectUrlResponse {
  inspectionResult: {
    inspectionResultLink: string;
    indexStatusResult: {
      verdict: "PASS" | "NEUTRAL" | "FAIL" | "VERDICT_UNSPECIFIED";
      coverageState: string;
      robotsTxtState: "ALLOWED" | "DISALLOWED" | "ROBOTS_TXT_STATE_UNSPECIFIED";
      indexingState: "INDEXING_ALLOWED" | "BLOCKED_BY_META_TAG" | "BLOCKED_BY_HTTP_HEADER" | "BLOCKED_BY_ROBOTS_TXT" | "INDEXING_STATE_UNSPECIFIED";
      lastCrawlTime?: string;
      pageFetchState: string;
      googleCanonical?: string;
      userCanonical?: string;
      sitemap?: string[];
      referringUrls?: string[];
      crawledAs?: "DESKTOP" | "MOBILE" | "CRAWLING_USER_AGENT_UNSPECIFIED";
    };
    mobileUsabilityResult?: {
      verdict: "PASS" | "NEUTRAL" | "FAIL" | "VERDICT_UNSPECIFIED";
      issues?: Array<{
        issueType: string;
        severity: "WARNING" | "ERROR";
        message: string;
      }>;
    };
    richResultsResult?: {
      verdict: "PASS" | "NEUTRAL" | "FAIL" | "VERDICT_UNSPECIFIED";
      detectedItems?: Array<{
        richResultType: string;
        items: Array<{
          name?: string;
          issues?: Array<{
            issueMessage: string;
            severity: "WARNING" | "ERROR";
          }>;
        }>;
      }>;
    };
  };
}

// ── Sitemaps ──────────────────────────────────────────────────────

export interface SitemapContent {
  type: "sitemap" | "urlList" | "atomFeed" | "rssFeed" | "SITEMAP_TYPE_UNSPECIFIED";
  submitted: number;
  indexed?: number;
}

export interface Sitemap {
  path: string;
  lastSubmitted?: string;
  isPending: boolean;
  isSitemapsIndex: boolean;
  type: string;
  lastDownloaded?: string;
  warnings: number;
  errors: number;
  contents: SitemapContent[];
}

export interface SitemapsListResponse {
  sitemap?: Sitemap[];
}

// ── Sites ─────────────────────────────────────────────────────────

export type PermissionLevel =
  | "siteFullUser"
  | "siteOwner"
  | "siteRestrictedUser"
  | "siteUnverifiedUser";

export interface Site {
  siteUrl: string;
  permissionLevel: PermissionLevel;
}

export interface SitesListResponse {
  siteEntry?: Site[];
}
