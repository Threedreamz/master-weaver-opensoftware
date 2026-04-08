import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  CookiebotClientConfig,
  CookieDeclaration,
  CookiebotScan,
  ConsentStatistics,
  ConsentStatsParams,
  RequestScanParams,
  CookiebotListResponse,
} from "./types.js";

const COOKIEBOT_BASE_URL = "https://manage.cookiebot.com/api/v1";

/**
 * Cookiebot API client for cookie compliance management.
 *
 * Provides access to cookie scan results, cookie declarations,
 * and consent statistics. Used for GDPR/ePrivacy cookie compliance.
 *
 * API key authentication required.
 *
 * @see https://www.cookiebot.com/
 */
export class CookiebotClient extends BaseIntegrationClient {
  private domainGroupId: string;

  constructor(config: CookiebotClientConfig) {
    super({
      baseUrl: config.baseUrl ?? COOKIEBOT_BASE_URL,
      authType: "api_key",
      credentials: {
        apiKey: config.apiKey,
        headerName: "Authorization",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });

    this.domainGroupId = config.domainGroupId;
  }

  // ==================== Scan Results ====================

  /**
   * List all scans for the domain group.
   */
  async listScans(
    params: { page?: number; pageSize?: number } = {}
  ): Promise<ApiResponse<CookiebotListResponse<CookiebotScan>>> {
    const queryParams: Record<string, string> = {
      domainGroupId: this.domainGroupId,
    };

    if (params.page != null) queryParams.page = String(params.page);
    if (params.pageSize != null) queryParams.pageSize = String(params.pageSize);

    return this.get<CookiebotListResponse<CookiebotScan>>(
      "/scans",
      queryParams
    );
  }

  /**
   * Get details of a specific scan.
   */
  async getScan(scanId: string): Promise<ApiResponse<CookiebotScan>> {
    return this.get<CookiebotScan>(`/scans/${scanId}`);
  }

  /**
   * Get the most recent completed scan for a domain.
   */
  async getLatestScan(domain: string): Promise<ApiResponse<CookiebotScan>> {
    return this.get<CookiebotScan>("/scans/latest", {
      domainGroupId: this.domainGroupId,
      domain,
    });
  }

  /**
   * Request a new scan of a domain.
   *
   * The scan runs asynchronously. Use `getScan()` to check progress.
   */
  async requestScan(
    params: RequestScanParams
  ): Promise<ApiResponse<CookiebotScan>> {
    return this.post<CookiebotScan>("/scans", {
      domainGroupId: this.domainGroupId,
      domain: params.domain,
      maxPages: params.maxPages ?? 500,
      followExternalLinks: params.followExternalLinks ?? false,
    });
  }

  // ==================== Cookie Declarations ====================

  /**
   * Get the current cookie declaration for a domain.
   *
   * Returns a complete list of all cookies found on the domain,
   * organized by category (necessary, preferences, statistics, marketing).
   */
  async getCookieDeclaration(
    domain: string
  ): Promise<ApiResponse<CookieDeclaration>> {
    return this.get<CookieDeclaration>("/declarations", {
      domainGroupId: this.domainGroupId,
      domain,
    });
  }

  /**
   * Get cookie declarations for all domains in the group.
   */
  async listCookieDeclarations(): Promise<ApiResponse<CookieDeclaration[]>> {
    return this.get<CookieDeclaration[]>("/declarations", {
      domainGroupId: this.domainGroupId,
    });
  }

  /**
   * Reclassify a cookie into a different category.
   *
   * @param cookieName - Name of the cookie
   * @param domain - Domain the cookie belongs to
   * @param newCategory - New category to assign
   */
  async reclassifyCookie(
    cookieName: string,
    domain: string,
    newCategory: string
  ): Promise<ApiResponse<void>> {
    return this.put<void>(
      `/declarations/cookies/${encodeURIComponent(cookieName)}`,
      {
        domainGroupId: this.domainGroupId,
        domain,
        category: newCategory,
      }
    );
  }

  // ==================== Consent Statistics ====================

  /**
   * Get consent statistics for a domain and date range.
   *
   * Includes opt-in rates, category-level acceptance, and optionally
   * daily and geographic breakdowns.
   */
  async getConsentStatistics(
    params: ConsentStatsParams
  ): Promise<ApiResponse<ConsentStatistics>> {
    const queryParams: Record<string, string> = {
      domainGroupId: this.domainGroupId,
      domain: params.domain,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    };

    if (params.includeDailyStats != null) {
      queryParams.includeDailyStats = String(params.includeDailyStats);
    }
    if (params.includeGeoStats != null) {
      queryParams.includeGeoStats = String(params.includeGeoStats);
    }

    return this.get<ConsentStatistics>("/statistics/consent", queryParams);
  }

  /**
   * Get a quick summary of the current opt-in rate for a domain.
   */
  async getCurrentOptInRate(
    domain: string
  ): Promise<ApiResponse<{ optInRate: number; totalPageViews: number; period: string }>> {
    return this.get<{ optInRate: number; totalPageViews: number; period: string }>(
      "/statistics/opt-in-rate",
      {
        domainGroupId: this.domainGroupId,
        domain,
      }
    );
  }

  // ==================== Domain Management ====================

  /**
   * List all domains in the domain group.
   */
  async listDomains(): Promise<ApiResponse<Array<{ domain: string; status: string; lastScan?: string }>>> {
    return this.get<Array<{ domain: string; status: string; lastScan?: string }>>(
      `/domain-groups/${this.domainGroupId}/domains`
    );
  }

  /**
   * Add a domain to the domain group.
   */
  async addDomain(
    domain: string
  ): Promise<ApiResponse<{ domain: string; status: string }>> {
    return this.post<{ domain: string; status: string }>(
      `/domain-groups/${this.domainGroupId}/domains`,
      { domain }
    );
  }

  /**
   * Remove a domain from the domain group.
   */
  async removeDomain(domain: string): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `/domain-groups/${this.domainGroupId}/domains/${encodeURIComponent(domain)}`
    );
  }

  // ==================== Utilities ====================

  /**
   * Test API connectivity and key validity.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get(`/domain-groups/${this.domainGroupId}`);
      return true;
    } catch {
      return false;
    }
  }
}
