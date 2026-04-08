import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  MozClientConfig,
  MozUrlMetrics,
  MozUrlMetricsParams,
  MozBulkUrlMetricsParams,
  MozLinkMetric,
  MozLinkMetricsParams,
  MozAnchorText,
  MozAnchorTextParams,
} from "./types.js";

/**
 * Moz Links API v2 client.
 *
 * Authentication: Basic Auth with Access ID and Secret Key.
 * Docs: https://moz.com/help/links-api
 */
export class MozClient extends BaseIntegrationClient {
  constructor(config: MozClientConfig) {
    super({
      baseUrl: "https://lsapi.seomoz.com/v2",
      authType: "basic_auth",
      credentials: {
        username: config.accessId,
        password: config.secretKey,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });
  }

  // ==================== URL Metrics (DA/PA) ====================

  /**
   * Get Domain Authority, Page Authority, Spam Score, and other
   * metrics for a single URL.
   */
  async getUrlMetrics(
    params: MozUrlMetricsParams,
  ): Promise<ApiResponse<MozUrlMetrics>> {
    return this.post<MozUrlMetrics>("/url_metrics", {
      targets: [params.target],
    });
  }

  /**
   * Get URL metrics for multiple URLs in a single request (max 50).
   */
  async getBulkUrlMetrics(
    params: MozBulkUrlMetricsParams,
  ): Promise<ApiResponse<MozUrlMetrics[]>> {
    if (params.targets.length > 50) {
      throw new Error("Moz bulk URL metrics supports a maximum of 50 targets per request");
    }
    return this.post<MozUrlMetrics[]>("/url_metrics", {
      targets: params.targets,
    });
  }

  // ==================== Link Metrics ====================

  /**
   * Get inbound links pointing to a target URL or domain.
   */
  async getLinkMetrics(
    params: MozLinkMetricsParams,
  ): Promise<ApiResponse<MozLinkMetric[]>> {
    return this.post<MozLinkMetric[]>("/links", {
      target: params.target,
      target_scope: params.target_scope ?? "root_domain",
      source_scope: params.source_scope ?? "page",
      limit: params.limit ?? 50,
      ...(params.offset != null && { offset: params.offset }),
      ...(params.sort && { sort: params.sort }),
    });
  }

  // ==================== Anchor Text ====================

  /**
   * Get anchor text distribution for links pointing to a target.
   */
  async getAnchorText(
    params: MozAnchorTextParams,
  ): Promise<ApiResponse<MozAnchorText[]>> {
    return this.post<MozAnchorText[]>("/anchor_text", {
      target: params.target,
      scope: params.scope ?? "phrase_to_root_domain",
      limit: params.limit ?? 50,
      ...(params.offset != null && { offset: params.offset }),
      ...(params.sort && { sort: params.sort }),
    });
  }

  // ==================== Connection Test ====================

  /**
   * Verify that credentials are valid by requesting metrics for example.com.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getUrlMetrics({ target: "example.com" });
      return true;
    } catch {
      return false;
    }
  }
}
