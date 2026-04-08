// ==================== Bing Webmaster Tools API Types ====================
// API key authentication via Bing Webmaster API key

/** Configuration for Bing Webmaster Tools client */
export interface BingWebmasterClientConfig {
  /** Bing Webmaster API key */
  apiKey: string;
  /** Request timeout in ms */
  timeout?: number;
}

/** URL submission request */
export interface BingUrlSubmission {
  siteUrl: string;
  url: string;
}

/** Batch URL submission request */
export interface BingUrlBatchSubmission {
  siteUrl: string;
  urlList: string[];
}

/** URL submission quota */
export interface BingUrlSubmissionQuota {
  dailyQuota: number;
  monthlyQuota: number;
  dailySubmitted: number;
  monthlySubmitted: number;
}

/** Crawl statistics for a site */
export interface BingCrawlStats {
  date: string;
  crawledPages: number;
  crawlErrors: number;
  inIndex: number;
  inLinks: number;
  blockedByRobotsTxt: number;
  malwareCount: number;
  httpStatusDistribution: Record<string, number>;
}

/** Crawl issue detail */
export interface BingCrawlIssue {
  url: string;
  httpCode: number;
  issueType: string;
  detectedDate: string;
  detail?: string;
}

/** Keyword data from Bing search */
export interface BingKeywordData {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
  averageClickPosition: number;
}

/** Keyword data request parameters */
export interface BingKeywordParams {
  siteUrl: string;
  /** Start date in YYYY-MM-DD format */
  startDate?: string;
  /** End date in YYYY-MM-DD format */
  endDate?: string;
  /** Page number for pagination (0-based) */
  page?: number;
}

/** URL traffic data */
export interface BingUrlTraffic {
  url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
  crawlDate?: string;
}

/** URL traffic request parameters */
export interface BingUrlTrafficParams {
  siteUrl: string;
  url?: string;
  /** Start date in YYYY-MM-DD format */
  startDate?: string;
  /** End date in YYYY-MM-DD format */
  endDate?: string;
  /** Page number for pagination (0-based) */
  page?: number;
}

/** Site information */
export interface BingSite {
  url: string;
  isVerified: boolean;
  dateAdded?: string;
}

/** API response wrapper */
export interface BingApiResponse<T> {
  d: T;
}
