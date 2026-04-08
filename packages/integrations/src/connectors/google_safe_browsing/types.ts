// ==================== Google Safe Browsing API Types ====================
// URL threat detection via Google Safe Browsing Lookup API v4.
// API key authentication.

/** Threat type as defined by the Safe Browsing API */
export type SafeBrowsingThreatType =
  | "MALWARE"
  | "SOCIAL_ENGINEERING"
  | "UNWANTED_SOFTWARE"
  | "POTENTIALLY_HARMFUL_APPLICATION"
  | "THREAT_TYPE_UNSPECIFIED";

/** Platform type for threat matching */
export type SafeBrowsingPlatformType =
  | "ANY_PLATFORM"
  | "WINDOWS"
  | "LINUX"
  | "OSX"
  | "ANDROID"
  | "IOS"
  | "CHROME"
  | "ALL_PLATFORMS"
  | "PLATFORM_TYPE_UNSPECIFIED";

/** Threat entry type */
export type SafeBrowsingThreatEntryType =
  | "URL"
  | "EXECUTABLE"
  | "IP_RANGE"
  | "THREAT_ENTRY_TYPE_UNSPECIFIED";

// ==================== Lookup Request ====================

/** Client metadata sent with each request */
export interface SafeBrowsingClientInfo {
  /** Client identifier (application name) */
  clientId: string;
  /** Client version */
  clientVersion: string;
}

/** A threat entry (URL to check) */
export interface SafeBrowsingThreatEntry {
  /** The URL to check */
  url: string;
}

/** Threat info specification for lookup request */
export interface SafeBrowsingThreatInfo {
  /** Threat types to check against */
  threatTypes: SafeBrowsingThreatType[];
  /** Platform types to check */
  platformTypes: SafeBrowsingPlatformType[];
  /** Threat entry types */
  threatEntryTypes: SafeBrowsingThreatEntryType[];
  /** Entries to check (URLs) */
  threatEntries: SafeBrowsingThreatEntry[];
}

/** Full lookup request body */
export interface SafeBrowsingLookupRequest {
  client: SafeBrowsingClientInfo;
  threatInfo: SafeBrowsingThreatInfo;
}

// ==================== Lookup Response ====================

/** A threat match result */
export interface SafeBrowsingThreatMatch {
  /** Type of threat */
  threatType: SafeBrowsingThreatType;
  /** Platform type */
  platformType: SafeBrowsingPlatformType;
  /** Threat entry type */
  threatEntryType: SafeBrowsingThreatEntryType;
  /** The threat entry (URL) that matched */
  threat: SafeBrowsingThreatEntry;
  /** Metadata about the threat */
  threatEntryMetadata?: SafeBrowsingThreatMetadata;
  /** Cache duration for this result */
  cacheDuration?: string;
}

/** Metadata associated with a threat entry */
export interface SafeBrowsingThreatMetadata {
  entries: Array<{
    key: string;
    value: string;
  }>;
}

/** Full lookup response */
export interface SafeBrowsingLookupResponse {
  /** List of threat matches (empty if all URLs are safe) */
  matches: SafeBrowsingThreatMatch[];
}

// ==================== Simplified Results ====================

/** Simplified result for a single URL check */
export interface UrlSafetyResult {
  /** The URL that was checked */
  url: string;
  /** Whether the URL is safe (no threats found) */
  safe: boolean;
  /** Threats found (empty if safe) */
  threats: UrlThreat[];
}

/** Simplified threat information */
export interface UrlThreat {
  /** Threat type */
  type: SafeBrowsingThreatType;
  /** Human-readable threat description */
  description: string;
  /** Platform affected */
  platform: SafeBrowsingPlatformType;
}

// ==================== Batch Check ====================

/** Result of a batch URL safety check */
export interface BatchSafetyResult {
  /** Results per URL */
  results: UrlSafetyResult[];
  /** Number of URLs checked */
  totalChecked: number;
  /** Number of unsafe URLs found */
  unsafeCount: number;
  /** Number of safe URLs */
  safeCount: number;
}

// ==================== Client Config ====================

export interface SafeBrowsingClientConfig {
  /** Google API key with Safe Browsing API enabled */
  apiKey: string;
  /** Client application identifier */
  clientId?: string;
  /** Client version string */
  clientVersion?: string;
  /** Request timeout in ms */
  timeout?: number;
}
