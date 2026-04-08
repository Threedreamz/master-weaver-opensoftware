import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SimilarWebClientConfig,
  SimilarWebCountry,
  SimilarWebTotalTraffic,
  SimilarWebTotalTrafficParams,
  SimilarWebTrafficSources,
  SimilarWebTrafficSourcesParams,
  SimilarWebTopKeywords,
  SimilarWebTopKeywordsParams,
  SimilarWebEngagement,
  SimilarWebEngagementParams,
} from "./types.js";

/**
 * SimilarWeb Digital Intelligence API client.
 *
 * Authentication: API key passed as a query parameter (`api_key`).
 * Docs: https://developers.similarweb.com/docs
 */
export class SimilarWebClient extends BaseIntegrationClient {
  private readonly apiKey: string;
  private readonly defaultCountry: SimilarWebCountry;

  constructor(config: SimilarWebClientConfig) {
    super({
      baseUrl: "https://api.similarweb.com/v1",
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 10 },
    });
    this.apiKey = config.apiKey;
    this.defaultCountry = config.defaultCountry ?? "world";
  }

  /** Build common query params for all endpoints */
  private commonParams(params: {
    start_date: string;
    end_date: string;
    country?: SimilarWebCountry;
    granularity?: string;
    main_domain_only?: boolean;
  }): Record<string, string> {
    return {
      api_key: this.apiKey,
      start_date: params.start_date,
      end_date: params.end_date,
      country: params.country ?? this.defaultCountry,
      ...(params.granularity && { granularity: params.granularity }),
      ...(params.main_domain_only != null && { main_domain_only: String(params.main_domain_only) }),
    };
  }

  // ==================== Total Traffic ====================

  /**
   * Get total visit counts for a domain over time.
   */
  async getTotalTraffic(
    params: SimilarWebTotalTrafficParams,
  ): Promise<ApiResponse<SimilarWebTotalTraffic>> {
    return this.get<SimilarWebTotalTraffic>(
      `/website/${params.domain}/total-traffic-and-engagement/visits`,
      {
        ...this.commonParams(params),
        granularity: params.granularity ?? "monthly",
      },
    );
  }

  // ==================== Traffic Sources ====================

  /**
   * Get a breakdown of traffic sources (direct, search, referrals, social, etc.)
   * with their relative share for a domain.
   */
  async getTrafficSources(
    params: SimilarWebTrafficSourcesParams,
  ): Promise<ApiResponse<SimilarWebTrafficSources>> {
    return this.get<SimilarWebTrafficSources>(
      `/website/${params.domain}/traffic-sources/overview`,
      this.commonParams(params),
    );
  }

  // ==================== Top Keywords ====================

  /**
   * Get the top organic and paid search keywords driving traffic to a domain.
   */
  async getTopKeywordsOrganic(
    params: SimilarWebTopKeywordsParams,
  ): Promise<ApiResponse<SimilarWebTopKeywords>> {
    return this.get<SimilarWebTopKeywords>(
      `/website/${params.domain}/traffic-sources/organic-search`,
      {
        ...this.commonParams(params),
        ...(params.limit != null && { limit: String(params.limit) }),
      },
    );
  }

  /**
   * Get top paid search keywords for a domain.
   */
  async getTopKeywordsPaid(
    params: SimilarWebTopKeywordsParams,
  ): Promise<ApiResponse<SimilarWebTopKeywords>> {
    return this.get<SimilarWebTopKeywords>(
      `/website/${params.domain}/traffic-sources/paid-search`,
      {
        ...this.commonParams(params),
        ...(params.limit != null && { limit: String(params.limit) }),
      },
    );
  }

  // ==================== Engagement ====================

  /**
   * Get engagement metrics: pages per visit, average visit duration,
   * bounce rate, and monthly visit trends.
   */
  async getEngagement(
    params: SimilarWebEngagementParams,
  ): Promise<ApiResponse<SimilarWebEngagement>> {
    return this.get<SimilarWebEngagement>(
      `/website/${params.domain}/total-traffic-and-engagement/engagement-metrics`,
      {
        ...this.commonParams(params),
        granularity: params.granularity ?? "monthly",
      },
    );
  }

  // ==================== Connection Test ====================

  /**
   * Verify that the API key is valid by fetching a minimal data point.
   */
  async testConnection(): Promise<boolean> {
    try {
      // Use a minimal date range to reduce credit consumption
      const now = new Date();
      const endMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const startMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0") || "01"}`;

      await this.getTotalTraffic({
        domain: "example.com",
        start_date: startMonth,
        end_date: endMonth,
        country: "world",
        granularity: "monthly",
      });
      return true;
    } catch {
      return false;
    }
  }
}
