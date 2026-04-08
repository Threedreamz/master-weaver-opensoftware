import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SistrixClientConfig,
  SistrixCountry,
  SistrixVisibilityIndex,
  SistrixVisibilityHistory,
  SistrixVisibilityParams,
  SistrixKeyword,
  SistrixKeywordsParams,
  SistrixLink,
  SistrixLinksParams,
  SistrixOptimizerProject,
  SistrixOptimizerKeyword,
  SistrixOptimizerParams,
  SistrixApiResponse,
} from "./types.js";

/**
 * Sistrix API client.
 *
 * Authentication: API key passed as a query parameter (`api_key`).
 * Docs: https://www.sistrix.com/api/
 */
export class SistrixClient extends BaseIntegrationClient {
  private readonly apiKey: string;
  private readonly defaultCountry: SistrixCountry;

  constructor(config: SistrixClientConfig) {
    super({
      baseUrl: "https://api.sistrix.com",
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });
    this.apiKey = config.apiKey;
    this.defaultCountry = config.defaultCountry ?? "de";
  }

  /** Build common query params shared across endpoints */
  private baseParams(params: { domain?: string; country?: SistrixCountry; mobile?: boolean }): Record<string, string> {
    return {
      api_key: this.apiKey,
      format: "json",
      ...(params.domain && { domain: params.domain }),
      country: params.country ?? this.defaultCountry,
      ...(params.mobile != null && { mobile: String(params.mobile) }),
    };
  }

  // ==================== Sichtbarkeitsindex ====================

  /**
   * Get the current Visibility Index for a domain.
   */
  async getVisibilityIndex(
    params: SistrixVisibilityParams,
  ): Promise<ApiResponse<SistrixApiResponse<SistrixVisibilityIndex>>> {
    return this.get<SistrixApiResponse<SistrixVisibilityIndex>>(
      "/domain.sichtbarkeitsindex",
      {
        ...this.baseParams(params),
        ...(params.date && { date: params.date }),
      },
    );
  }

  /**
   * Get historical Visibility Index data over time.
   */
  async getVisibilityHistory(
    params: SistrixVisibilityParams,
  ): Promise<ApiResponse<SistrixApiResponse<SistrixVisibilityHistory>>> {
    return this.get<SistrixApiResponse<SistrixVisibilityHistory>>(
      "/domain.sichtbarkeitsindex",
      {
        ...this.baseParams(params),
        history: "true",
      },
    );
  }

  // ==================== Keywords ====================

  /**
   * Get keywords for which a domain ranks in Google.
   */
  async getKeywords(
    params: SistrixKeywordsParams,
  ): Promise<ApiResponse<SistrixApiResponse<SistrixKeyword>>> {
    return this.get<SistrixApiResponse<SistrixKeyword>>(
      "/domain.keywords",
      {
        ...this.baseParams(params),
        ...(params.limit != null && { num: String(params.limit) }),
        ...(params.offset != null && { offset: String(params.offset) }),
        ...(params.search && { search: params.search }),
        ...(params.position && { position: params.position }),
      },
    );
  }

  // ==================== Links ====================

  /**
   * Get backlinks pointing to a domain.
   */
  async getLinks(
    params: SistrixLinksParams,
  ): Promise<ApiResponse<SistrixApiResponse<SistrixLink>>> {
    return this.get<SistrixApiResponse<SistrixLink>>(
      "/domain.backlinks",
      {
        ...this.baseParams(params),
        ...(params.limit != null && { num: String(params.limit) }),
        ...(params.offset != null && { offset: String(params.offset) }),
      },
    );
  }

  // ==================== Optimizer ====================

  /**
   * List all Optimizer projects.
   */
  async getOptimizerProjects(): Promise<ApiResponse<SistrixApiResponse<SistrixOptimizerProject>>> {
    return this.get<SistrixApiResponse<SistrixOptimizerProject>>(
      "/optimizer.projects",
      {
        api_key: this.apiKey,
        format: "json",
      },
    );
  }

  /**
   * Get keyword rankings from an Optimizer project.
   */
  async getOptimizerKeywords(
    params: SistrixOptimizerParams,
  ): Promise<ApiResponse<SistrixApiResponse<SistrixOptimizerKeyword>>> {
    return this.get<SistrixApiResponse<SistrixOptimizerKeyword>>(
      "/optimizer.rankings",
      {
        api_key: this.apiKey,
        format: "json",
        project: params.project,
        ...(params.limit != null && { num: String(params.limit) }),
        ...(params.offset != null && { offset: String(params.offset) }),
      },
    );
  }

  // ==================== Connection Test ====================

  /**
   * Verify that the API key is valid by requesting credits info.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/credits", {
        api_key: this.apiKey,
        format: "json",
      });
      return true;
    } catch {
      return false;
    }
  }
}
