// ==================== Google Trends API Types ====================
// No authentication — scraping-style access via unofficial endpoints

/** Configuration for Google Trends client */
export interface GoogleTrendsClientConfig {
  /** Optional geographic location code (e.g., "US", "DE") */
  defaultGeo?: string;
  /** Optional language code (e.g., "en-US", "de") */
  defaultHl?: string;
  /** Request timeout in ms */
  timeout?: number;
}

/** Time range for trend queries */
export type TrendTimeRange =
  | "now 1-H"   // Past hour
  | "now 4-H"   // Past 4 hours
  | "now 1-d"   // Past day
  | "now 7-d"   // Past 7 days
  | "today 1-m" // Past 30 days
  | "today 3-m" // Past 90 days
  | "today 12-m" // Past 12 months
  | "today 5-y" // Past 5 years
  | "all";       // Since 2004

/** Google Trends category IDs (subset of common categories) */
export type TrendCategory = number;

/** Search property filter */
export type SearchProperty =
  | ""          // Web Search
  | "images"   // Image Search
  | "news"     // News Search
  | "youtube"  // YouTube Search
  | "froogle"; // Google Shopping

/** Interest over time query parameters */
export interface InterestOverTimeParams {
  /** Search keywords (up to 5) */
  keywords: string[];
  /** Time range */
  timeRange?: TrendTimeRange;
  /** Custom date range: "YYYY-MM-DD YYYY-MM-DD" */
  customDateRange?: string;
  /** Geographic region code */
  geo?: string;
  /** Category ID */
  category?: TrendCategory;
  /** Search property */
  property?: SearchProperty;
}

/** Single time point in interest over time data */
export interface InterestTimePoint {
  /** ISO date string */
  date: string;
  /** Unix timestamp */
  timestamp: number;
  /** Interest values per keyword (0-100 scale) */
  values: Record<string, number>;
  /** Whether the point is partial (incomplete data) */
  isPartial: boolean;
}

/** Interest over time response */
export interface InterestOverTimeResult {
  keywords: string[];
  timeRange: string;
  geo: string;
  timeline: InterestTimePoint[];
  averages: Record<string, number>;
}

/** Related query item */
export interface RelatedQuery {
  query: string;
  /** Relative value (0-100) or growth percentage for rising */
  value: number;
  /** Formatted value (e.g., "100", "+2,450%", "Breakout") */
  formattedValue: string;
  /** Link to Google Trends for this query */
  link?: string;
}

/** Related queries response */
export interface RelatedQueriesResult {
  keyword: string;
  /** Top related queries (by search volume) */
  top: RelatedQuery[];
  /** Rising related queries (by growth rate) */
  rising: RelatedQuery[];
}

/** Related queries request parameters */
export interface RelatedQueriesParams {
  /** Search keyword */
  keyword: string;
  /** Time range */
  timeRange?: TrendTimeRange;
  /** Custom date range: "YYYY-MM-DD YYYY-MM-DD" */
  customDateRange?: string;
  /** Geographic region code */
  geo?: string;
  /** Category ID */
  category?: TrendCategory;
  /** Search property */
  property?: SearchProperty;
}

/** Related topic item */
export interface RelatedTopic {
  /** Topic title */
  title: string;
  /** Topic type (e.g., "Search term", "Topic") */
  type: string;
  /** Relative value (0-100) or growth percentage for rising */
  value: number;
  /** Formatted value */
  formattedValue: string;
  /** Topic ID for further exploration */
  topicMid?: string;
  /** Link to Google Trends for this topic */
  link?: string;
}

/** Related topics response */
export interface RelatedTopicsResult {
  keyword: string;
  /** Top related topics (by search volume) */
  top: RelatedTopic[];
  /** Rising related topics (by growth rate) */
  rising: RelatedTopic[];
}

/** Related topics request parameters */
export interface RelatedTopicsParams {
  /** Search keyword */
  keyword: string;
  /** Time range */
  timeRange?: TrendTimeRange;
  /** Custom date range: "YYYY-MM-DD YYYY-MM-DD" */
  customDateRange?: string;
  /** Geographic region code */
  geo?: string;
  /** Category ID */
  category?: TrendCategory;
  /** Search property */
  property?: SearchProperty;
}

/** Interest by region data point */
export interface RegionInterest {
  /** Region name */
  geoName: string;
  /** Region code */
  geoCode: string;
  /** Interest value (0-100) */
  value: number;
}

/** Interest by region request parameters */
export interface InterestByRegionParams {
  /** Search keyword */
  keyword: string;
  /** Time range */
  timeRange?: TrendTimeRange;
  /** Geographic region code (parent region) */
  geo?: string;
  /** Resolution: country, region, city, or DMA */
  resolution?: "COUNTRY" | "REGION" | "CITY" | "DMA";
}

/** Interest by region response */
export interface InterestByRegionResult {
  keyword: string;
  geo: string;
  resolution: string;
  regions: RegionInterest[];
}
