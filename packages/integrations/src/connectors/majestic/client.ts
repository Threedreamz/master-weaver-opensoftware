import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  MajesticClientConfig,
  MajesticDataSource,
  MajesticBacklink,
  MajesticBacklinkDataParams,
  MajesticRefDomain,
  MajesticRefDomainsParams,
  MajesticIndexItemInfo,
  MajesticIndexItemInfoParams,
  MajesticApiResponse,
} from "./types.js";

/**
 * Majestic SEO API client.
 *
 * Authentication: API key passed as a query parameter (`app_api_key`).
 * Docs: https://developer-support.majestic.com/
 */
export class MajesticClient extends BaseIntegrationClient {
  private readonly apiKey: string;
  private readonly defaultDataSource: MajesticDataSource;

  constructor(config: MajesticClientConfig) {
    super({
      baseUrl: "https://api.majestic.com/api/json",
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });
    this.apiKey = config.apiKey;
    this.defaultDataSource = config.defaultDataSource ?? "fresh";
  }

  /** Build the common authentication and format params */
  private authParams(): Record<string, string> {
    return {
      app_api_key: this.apiKey,
    };
  }

  // ==================== GetBacklinkData ====================

  /**
   * Get individual backlinks for a URL or domain.
   * Returns detailed information about each backlink including
   * Trust Flow, Citation Flow, anchor text, and link attributes.
   */
  async getBacklinkData(
    params: MajesticBacklinkDataParams,
  ): Promise<ApiResponse<MajesticApiResponse<MajesticBacklink>>> {
    return this.get<MajesticApiResponse<MajesticBacklink>>("", {
      ...this.authParams(),
      cmd: "GetBacklinkData",
      item: params.item,
      datasource: params.datasource ?? this.defaultDataSource,
      ...(params.Count != null && { Count: String(params.Count) }),
      ...(params.Offset != null && { Offset: String(params.Offset) }),
    });
  }

  // ==================== GetRefDomains ====================

  /**
   * Get referring domains linking to a URL or domain.
   * Each referring domain includes Trust Flow, Citation Flow,
   * topical trust flow, and backlink counts.
   */
  async getRefDomains(
    params: MajesticRefDomainsParams,
  ): Promise<ApiResponse<MajesticApiResponse<MajesticRefDomain>>> {
    return this.get<MajesticApiResponse<MajesticRefDomain>>("", {
      ...this.authParams(),
      cmd: "GetRefDomains",
      item: params.item,
      datasource: params.datasource ?? this.defaultDataSource,
      ...(params.Count != null && { Count: String(params.Count) }),
      ...(params.Offset != null && { Offset: String(params.Offset) }),
      ...(params.OrderBy && { OrderBy0: params.OrderBy }),
      ...(params.OrderDirection != null && { OrderDir0: String(params.OrderDirection) }),
    });
  }

  // ==================== GetIndexItemInfo ====================

  /**
   * Get summary metrics for one or more items (URLs/domains).
   * Returns Trust Flow, Citation Flow, backlink count, referring
   * domains, topical trust flow, and crawl status.
   *
   * Supports up to 100 items per request.
   */
  async getIndexItemInfo(
    params: MajesticIndexItemInfoParams,
  ): Promise<ApiResponse<MajesticApiResponse<MajesticIndexItemInfo>>> {
    if (params.items.length > 100) {
      throw new Error("Majestic GetIndexItemInfo supports a maximum of 100 items per request");
    }

    const itemParams: Record<string, string> = {};
    params.items.forEach((item, index) => {
      itemParams[`item${index}`] = item;
    });

    return this.get<MajesticApiResponse<MajesticIndexItemInfo>>("", {
      ...this.authParams(),
      cmd: "GetIndexItemInfo",
      ...itemParams,
      items: String(params.items.length),
      datasource: params.datasource ?? this.defaultDataSource,
    });
  }

  // ==================== Connection Test ====================

  /**
   * Verify that the API key is valid by requesting index info for example.com.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getIndexItemInfo({
        items: ["example.com"],
      });
      return response.data.Code === "OK";
    } catch {
      return false;
    }
  }
}
