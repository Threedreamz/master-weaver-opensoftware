import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  AhrefsClientConfig,
  AhrefsBacklink,
  AhrefsBacklinksParams,
  AhrefsRefDomain,
  AhrefsRefDomainsParams,
  AhrefsOrganicKeyword,
  AhrefsOrganicKeywordsParams,
  AhrefsDomainRating,
  AhrefsDomainRatingParams,
  AhrefsPaginatedResponse,
} from "./types.js";

/**
 * Ahrefs API v3 client.
 *
 * Authentication: Bearer token in the Authorization header.
 * Docs: https://ahrefs.com/api/documentation
 */
export class AhrefsClient extends BaseIntegrationClient {
  constructor(config: AhrefsClientConfig) {
    super({
      baseUrl: "https://api.ahrefs.com/v3",
      authType: "api_key",
      credentials: { apiKey: config.apiToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });
  }

  // ==================== Backlinks ====================

  /**
   * Retrieve backlinks pointing to a target URL or domain.
   */
  async getBacklinks(
    params: AhrefsBacklinksParams,
  ): Promise<ApiResponse<AhrefsPaginatedResponse<AhrefsBacklink>>> {
    const queryParams: Record<string, string> = {
      target: params.target,
      mode: params.mode ?? "domain",
      ...(params.limit != null && { limit: String(params.limit) }),
      ...(params.offset != null && { offset: String(params.offset) }),
      ...(params.order_by && { order_by: params.order_by }),
      ...(params.order_direction && { order_direction: params.order_direction }),
    };

    if (params.where) {
      queryParams.where = JSON.stringify(params.where);
    }

    return this.get<AhrefsPaginatedResponse<AhrefsBacklink>>(
      "/site-explorer/backlinks",
      queryParams,
    );
  }

  // ==================== Referring Domains ====================

  /**
   * Get referring domains for a target.
   */
  async getRefDomains(
    params: AhrefsRefDomainsParams,
  ): Promise<ApiResponse<AhrefsPaginatedResponse<AhrefsRefDomain>>> {
    return this.get<AhrefsPaginatedResponse<AhrefsRefDomain>>(
      "/site-explorer/refdomains",
      {
        target: params.target,
        mode: params.mode ?? "domain",
        ...(params.limit != null && { limit: String(params.limit) }),
        ...(params.offset != null && { offset: String(params.offset) }),
        ...(params.order_by && { order_by: params.order_by }),
        ...(params.order_direction && { order_direction: params.order_direction }),
      },
    );
  }

  // ==================== Organic Keywords ====================

  /**
   * Get organic keyword rankings for a target.
   */
  async getOrganicKeywords(
    params: AhrefsOrganicKeywordsParams,
  ): Promise<ApiResponse<AhrefsPaginatedResponse<AhrefsOrganicKeyword>>> {
    return this.get<AhrefsPaginatedResponse<AhrefsOrganicKeyword>>(
      "/site-explorer/organic-keywords",
      {
        target: params.target,
        mode: params.mode ?? "domain",
        country: params.country ?? "us",
        ...(params.limit != null && { limit: String(params.limit) }),
        ...(params.offset != null && { offset: String(params.offset) }),
        ...(params.order_by && { order_by: params.order_by }),
        ...(params.order_direction && { order_direction: params.order_direction }),
      },
    );
  }

  // ==================== Domain Rating ====================

  /**
   * Get the Domain Rating (DR) and associated metrics for a target.
   */
  async getDomainRating(
    params: AhrefsDomainRatingParams,
  ): Promise<ApiResponse<AhrefsDomainRating>> {
    return this.get<AhrefsDomainRating>(
      "/site-explorer/domain-rating",
      {
        target: params.target,
        mode: params.mode ?? "domain",
      },
    );
  }

  // ==================== Connection Test ====================

  /**
   * Verify that the API token is valid.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getDomainRating({ target: "example.com" });
      return true;
    } catch {
      return false;
    }
  }
}
