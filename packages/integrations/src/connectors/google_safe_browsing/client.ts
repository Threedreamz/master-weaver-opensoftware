import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SafeBrowsingClientConfig,
  SafeBrowsingLookupRequest,
  SafeBrowsingLookupResponse,
  SafeBrowsingThreatType,
  SafeBrowsingPlatformType,
  SafeBrowsingThreatEntryType,
  UrlSafetyResult,
  UrlThreat,
  BatchSafetyResult,
} from "./types.js";

const SAFE_BROWSING_BASE_URL = "https://safebrowsing.googleapis.com/v4";

/** Human-readable descriptions for threat types */
const THREAT_DESCRIPTIONS: Record<SafeBrowsingThreatType, string> = {
  MALWARE: "This site hosts malware that can infect your device",
  SOCIAL_ENGINEERING: "This site attempts to trick users into performing dangerous actions (phishing)",
  UNWANTED_SOFTWARE: "This site distributes unwanted or deceptive software",
  POTENTIALLY_HARMFUL_APPLICATION: "This site distributes potentially harmful applications",
  THREAT_TYPE_UNSPECIFIED: "Unspecified threat detected",
};

/** Default threat types to check against */
const DEFAULT_THREAT_TYPES: SafeBrowsingThreatType[] = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION",
];

/** Default platform types */
const DEFAULT_PLATFORM_TYPES: SafeBrowsingPlatformType[] = [
  "ANY_PLATFORM",
];

/** Default threat entry types */
const DEFAULT_THREAT_ENTRY_TYPES: SafeBrowsingThreatEntryType[] = [
  "URL",
];

/**
 * Google Safe Browsing API client for URL threat detection.
 *
 * Checks URLs against Google's constantly updated lists of unsafe web
 * resources, including social engineering (phishing), malware, and
 * unwanted software.
 *
 * API key authentication required. Enable the "Safe Browsing API" in
 * Google Cloud Console.
 *
 * @see https://developers.google.com/safe-browsing/v4
 */
export class SafeBrowsingClient extends BaseIntegrationClient {
  private apiKey: string;
  private clientId: string;
  private clientVersion: string;

  constructor(config: SafeBrowsingClientConfig) {
    super({
      baseUrl: SAFE_BROWSING_BASE_URL,
      authType: "none",
      credentials: {},
      timeout: config.timeout ?? 15_000,
      rateLimit: { requestsPerMinute: 600 },
    });

    this.apiKey = config.apiKey;
    this.clientId = config.clientId ?? "opensoftware";
    this.clientVersion = config.clientVersion ?? "1.0.0";
  }

  // ==================== URL Lookup ====================

  /**
   * Check one or more URLs against Google Safe Browsing threat lists.
   *
   * This is the raw API call that returns the full Safe Browsing response.
   * For a simplified interface, use `checkUrls()` instead.
   *
   * @param urls - URLs to check (max 500 per request)
   * @param threatTypes - Threat types to check against (default: all)
   * @param platformTypes - Platform types (default: ANY_PLATFORM)
   */
  async lookupUrls(
    urls: string[],
    threatTypes?: SafeBrowsingThreatType[],
    platformTypes?: SafeBrowsingPlatformType[]
  ): Promise<ApiResponse<SafeBrowsingLookupResponse>> {
    const requestBody: SafeBrowsingLookupRequest = {
      client: {
        clientId: this.clientId,
        clientVersion: this.clientVersion,
      },
      threatInfo: {
        threatTypes: threatTypes ?? DEFAULT_THREAT_TYPES,
        platformTypes: platformTypes ?? DEFAULT_PLATFORM_TYPES,
        threatEntryTypes: DEFAULT_THREAT_ENTRY_TYPES,
        threatEntries: urls.map((url) => ({ url })),
      },
    };

    return this.request<SafeBrowsingLookupResponse>({
      method: "POST",
      path: `/threatMatches:find`,
      params: { key: this.apiKey },
      body: requestBody,
    });
  }

  // ==================== Simplified Checks ====================

  /**
   * Check multiple URLs and return simplified safety results.
   *
   * @param urls - URLs to check (max 500 per request)
   * @returns Safety result for each URL with threat details
   */
  async checkUrls(urls: string[]): Promise<ApiResponse<BatchSafetyResult>> {
    const response = await this.lookupUrls(urls);
    const matches = response.data.matches ?? [];

    // Build a map of URL -> threats
    const threatMap = new Map<string, UrlThreat[]>();

    for (const match of matches) {
      const url = match.threat.url;
      const threats = threatMap.get(url) ?? [];
      threats.push({
        type: match.threatType,
        description: THREAT_DESCRIPTIONS[match.threatType] ?? "Unknown threat",
        platform: match.platformType,
      });
      threatMap.set(url, threats);
    }

    // Build results for all URLs
    const results: UrlSafetyResult[] = urls.map((url) => {
      const threats = threatMap.get(url) ?? [];
      return {
        url,
        safe: threats.length === 0,
        threats,
      };
    });

    const unsafeCount = results.filter((r) => !r.safe).length;

    return {
      data: {
        results,
        totalChecked: urls.length,
        unsafeCount,
        safeCount: urls.length - unsafeCount,
      },
      status: response.status,
      headers: response.headers,
    };
  }

  /**
   * Check a single URL for threats.
   *
   * @param url - URL to check
   * @returns Safety result with threat details
   */
  async checkUrl(url: string): Promise<ApiResponse<UrlSafetyResult>> {
    const batchResult = await this.checkUrls([url]);
    const result = batchResult.data.results[0]!;

    return {
      data: result,
      status: batchResult.status,
      headers: batchResult.headers,
    };
  }

  /**
   * Quick check: is a URL safe?
   *
   * @param url - URL to check
   * @returns true if the URL is safe, false if threats were found
   */
  async isSafe(url: string): Promise<boolean> {
    try {
      const result = await this.checkUrl(url);
      return result.data.safe;
    } catch {
      // If the API call fails, we cannot determine safety
      throw new Error(`Failed to check URL safety for: ${url}`);
    }
  }

  // ==================== Utilities ====================

  /**
   * Test API connectivity and key validity.
   */
  async testConnection(): Promise<boolean> {
    try {
      // Check a known-safe URL to verify the API key works
      await this.lookupUrls(["https://www.google.com"]);
      return true;
    } catch {
      return false;
    }
  }
}
