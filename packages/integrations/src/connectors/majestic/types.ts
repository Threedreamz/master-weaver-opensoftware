// ==================== Majestic API Types ====================

/** Data source for Majestic queries */
export type MajesticDataSource = "fresh" | "historic";

/** Count type for GetBacklinkData */
export type MajesticBacklinkCount = number;

// ==================== Request Params ====================

export interface MajesticBaseParams {
  /** The item to query (URL or domain) */
  item: string;
  /** Fresh Index or Historic Index */
  datasource?: MajesticDataSource;
}

export interface MajesticBacklinkDataParams extends MajesticBaseParams {
  /** Max results per page */
  Count?: number;
  /** Pagination offset */
  Offset?: number;
}

export interface MajesticRefDomainsParams extends MajesticBaseParams {
  /** Max results per page */
  Count?: number;
  /** Pagination offset */
  Offset?: number;
  /** Order by column */
  OrderBy?: "TrustFlow" | "CitationFlow" | "AlexaRank" | "Backlinks";
  /** Ascending (0) or descending (1) */
  OrderDirection?: 0 | 1;
}

export interface MajesticIndexItemInfoParams {
  /** One or more items to query (up to 100) */
  items: string[];
  /** Fresh Index or Historic Index */
  datasource?: MajesticDataSource;
}

// ==================== Response Types ====================

export interface MajesticBacklink {
  SourceURL: string;
  AnchorText: string;
  TargetURL: string;
  SourceTrustFlow: number;
  SourceCitationFlow: number;
  DateFirstSeen: string;
  DateLastSeen: string;
  FlagNoFollow: boolean;
  FlagImageLink: boolean;
  FlagRedirect: boolean;
  FlagFrame: boolean;
  FlagOldCrawl: boolean;
  FlagMention: boolean;
  SourceTopicalTrustFlow_Topic_0: string;
  SourceTopicalTrustFlow_Value_0: number;
}

export interface MajesticRefDomain {
  Domain: string;
  TrustFlow: number;
  CitationFlow: number;
  Backlinks: number;
  RefDomains: number;
  TopicalTrustFlow_Topic_0: string;
  TopicalTrustFlow_Value_0: number;
  FirstSeen: string;
  LastSeen: string;
  IP: string;
  CountryCode: string;
}

export interface MajesticIndexItemInfo {
  Item: string;
  ResultCode: string;
  Status: string;
  ExtBackLinks: number;
  RefDomains: number;
  RefSubNets: number;
  RefIPs: number;
  TrustFlow: number;
  CitationFlow: number;
  TopicalTrustFlow_Topic_0: string;
  TopicalTrustFlow_Value_0: number;
  TopicalTrustFlow_Topic_1: string;
  TopicalTrustFlow_Value_1: number;
  TopicalTrustFlow_Topic_2: string;
  TopicalTrustFlow_Value_2: number;
  RefDomainsEDU: number;
  ExtBackLinksEDU: number;
  RefDomainsGOV: number;
  ExtBackLinksGOV: number;
  CrawledFlag: boolean;
  LastCrawlDate: string;
  LastCrawlResult: string;
  IndexedURLs: number;
}

export interface MajesticApiResponse<T> {
  Code: string;
  ErrorMessage: string;
  FullError: string;
  DataTables: {
    [tableName: string]: {
      Headers: Record<string, string>;
      Data: T[];
      Count: number;
    };
  };
}

export interface MajesticClientConfig {
  /** Majestic API key */
  apiKey: string;
  /** Default data source (defaults to "fresh") */
  defaultDataSource?: MajesticDataSource;
  /** Request timeout in ms */
  timeout?: number;
}
