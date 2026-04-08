import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SemrushClientConfig,
  SemrushDomainOverview,
  SemrushDomainOverviewParams,
  SemrushOrganicSearchParams,
  SemrushOrganicResult,
  SemrushBacklinksParams,
  SemrushBacklinkResult,
  SemrushBacklinksOverview,
  SemrushKeywordParams,
  SemrushKeywordResult,
  SemrushTrafficParams,
  SemrushTrafficResult,
  SemrushDatabase,
} from "./types.js";

/**
 * Semrush API client.
 *
 * Authentication: API key passed as a query parameter on every request.
 * Docs: https://developer.semrush.com/api/
 */
export class SemrushClient extends BaseIntegrationClient {
  private readonly apiKey: string;
  private readonly defaultDatabase: SemrushDatabase;

  constructor(config: SemrushClientConfig) {
    super({
      baseUrl: "https://api.semrush.com",
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });
    this.apiKey = config.apiKey;
    this.defaultDatabase = config.defaultDatabase ?? "us";
  }

  // ==================== Domain Overview ====================

  /**
   * Get a high-level overview of a domain's SEO and advertising metrics.
   */
  async getDomainOverview(
    params: SemrushDomainOverviewParams,
  ): Promise<ApiResponse<SemrushDomainOverview>> {
    return this.get<SemrushDomainOverview>("/", {
      type: "domain_ranks",
      key: this.apiKey,
      domain: params.domain,
      database: params.database ?? this.defaultDatabase,
      export_columns: params.export_columns ?? "Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac,Sh,Sv,FKn,FPn",
      ...(params.display_limit != null && { display_limit: String(params.display_limit) }),
    });
  }

  // ==================== Organic Search ====================

  /**
   * Retrieve organic search positions for a domain.
   */
  async getOrganicSearch(
    params: SemrushOrganicSearchParams,
  ): Promise<ApiResponse<SemrushOrganicResult[]>> {
    return this.get<SemrushOrganicResult[]>("/", {
      type: "domain_organic",
      key: this.apiKey,
      domain: params.domain,
      database: params.database ?? this.defaultDatabase,
      ...(params.display_limit != null && { display_limit: String(params.display_limit) }),
      ...(params.display_offset != null && { display_offset: String(params.display_offset) }),
      ...(params.display_sort && { display_sort: params.display_sort }),
      ...(params.display_filter && { display_filter: params.display_filter }),
      ...(params.export_columns && { export_columns: params.export_columns }),
    });
  }

  // ==================== Backlinks ====================

  /**
   * Get backlinks overview metrics for a target.
   */
  async getBacklinksOverview(
    params: SemrushBacklinksParams,
  ): Promise<ApiResponse<SemrushBacklinksOverview>> {
    return this.get<SemrushBacklinksOverview>("/analytics/v1/", {
      key: this.apiKey,
      type: "backlinks_overview",
      target: params.target,
      target_type: params.target_type ?? "root_domain",
    });
  }

  /**
   * Get individual backlinks for a target.
   */
  async getBacklinks(
    params: SemrushBacklinksParams,
  ): Promise<ApiResponse<SemrushBacklinkResult[]>> {
    return this.get<SemrushBacklinkResult[]>("/analytics/v1/", {
      key: this.apiKey,
      type: "backlinks",
      target: params.target,
      target_type: params.target_type ?? "root_domain",
      ...(params.display_limit != null && { display_limit: String(params.display_limit) }),
      ...(params.display_offset != null && { display_offset: String(params.display_offset) }),
    });
  }

  // ==================== Keyword Analytics ====================

  /**
   * Get keyword analytics: volume, CPC, competition, results count.
   */
  async getKeywordOverview(
    params: SemrushKeywordParams,
  ): Promise<ApiResponse<SemrushKeywordResult>> {
    return this.get<SemrushKeywordResult>("/", {
      type: "phrase_all",
      key: this.apiKey,
      phrase: params.phrase,
      database: params.database ?? this.defaultDatabase,
      ...(params.export_columns && { export_columns: params.export_columns }),
    });
  }

  /**
   * Get related keywords for a phrase.
   */
  async getRelatedKeywords(
    params: SemrushKeywordParams,
  ): Promise<ApiResponse<SemrushKeywordResult[]>> {
    return this.get<SemrushKeywordResult[]>("/", {
      type: "phrase_related",
      key: this.apiKey,
      phrase: params.phrase,
      database: params.database ?? this.defaultDatabase,
      ...(params.display_limit != null && { display_limit: String(params.display_limit) }),
      ...(params.display_offset != null && { display_offset: String(params.display_offset) }),
    });
  }

  // ==================== Traffic Analytics ====================

  /**
   * Get traffic analytics for one or more domains.
   */
  async getTrafficSummary(
    params: SemrushTrafficParams,
  ): Promise<ApiResponse<SemrushTrafficResult[]>> {
    return this.get<SemrushTrafficResult[]>("/analytics/ta/api/v3/summary", {
      key: this.apiKey,
      targets: params.targets.join(","),
      ...(params.display_date && { display_date: params.display_date }),
      ...(params.country && { country: params.country }),
    });
  }

  // ==================== Connection Test ====================

  /**
   * Verify that the API key is valid.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/", {
        type: "domain_ranks",
        key: this.apiKey,
        domain: "example.com",
        database: "us",
        display_limit: "1",
      });
      return true;
    } catch {
      return false;
    }
  }
}
