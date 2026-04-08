// ==================== Amazon SP-API Client ====================

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  AmazonSpClientConfig,
  CatalogSearchParams,
  CatalogSearchResponse,
  CatalogItem,
  InventorySummariesParams,
  InventorySummariesResponse,
  OrdersParams,
  OrdersResponse,
  OrderItemsResponse,
  AmazonOrder,
  FeedsParams,
  FeedsResponse,
  Feed,
  CreateFeedParams,
  CreateFeedDocumentParams,
  FeedDocument,
  ReportsParams,
  ReportsResponse,
  Report,
  CreateReportParams,
  ReportDocument,
} from "./types.js";

const REGION_ENDPOINTS: Record<string, string> = {
  na: "https://sellingpartnerapi-na.amazon.com",
  eu: "https://sellingpartnerapi-eu.amazon.com",
  fe: "https://sellingpartnerapi-fe.amazon.com",
};

const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";

export class AmazonSpClient extends BaseIntegrationClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private refreshToken?: string;
  private tokenExpiresAt = 0;

  constructor(config: AmazonSpClientConfig) {
    const region = config.region ?? "eu";
    super({
      baseUrl: REGION_ENDPOINTS[region] ?? REGION_ENDPOINTS.eu,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 15 },
      defaultHeaders: {
        "x-amz-access-token": config.accessToken,
      },
    });
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
  }

  // ==================== Token Refresh ====================

  /**
   * Refresh the LWA access token using the refresh token.
   * Returns the new access token.
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available for token refresh");
    }

    const response = await fetch(LWA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`LWA token refresh failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    this.credentials.accessToken = data.access_token;
    this.defaultHeaders["x-amz-access-token"] = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }

    return data.access_token;
  }

  /**
   * Ensure the access token is valid before making a request.
   */
  private async ensureValidToken(): Promise<void> {
    const bufferMs = 5 * 60 * 1000;
    if (this.tokenExpiresAt > 0 && Date.now() >= this.tokenExpiresAt - bufferMs) {
      await this.refreshAccessToken();
    }
  }

  // ==================== Catalog Items ====================

  /**
   * Search the Amazon catalog.
   */
  async searchCatalogItems(params: CatalogSearchParams): Promise<CatalogSearchResponse> {
    await this.ensureValidToken();

    const queryParams: Record<string, string> = {
      marketplaceIds: params.marketplaceIds.join(","),
    };
    if (params.keywords?.length) queryParams.keywords = params.keywords.join(",");
    if (params.includedData?.length) queryParams.includedData = params.includedData.join(",");
    if (params.brandNames?.length) queryParams.brandNames = params.brandNames.join(",");
    if (params.classificationIds?.length) queryParams.classificationIds = params.classificationIds.join(",");
    if (params.identifiers?.length) queryParams.identifiers = params.identifiers.join(",");
    if (params.identifiersType) queryParams.identifiersType = params.identifiersType;
    if (params.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params.pageToken) queryParams.pageToken = params.pageToken;

    const response = await this.get<CatalogSearchResponse>("/catalog/2022-04-01/items", queryParams);
    return response.data;
  }

  /**
   * Get a single catalog item by ASIN.
   */
  async getCatalogItem(
    asin: string,
    marketplaceIds: string[],
    includedData?: string[]
  ): Promise<CatalogItem> {
    await this.ensureValidToken();

    const params: Record<string, string> = {
      marketplaceIds: marketplaceIds.join(","),
    };
    if (includedData?.length) params.includedData = includedData.join(",");

    const response = await this.get<CatalogItem>(`/catalog/2022-04-01/items/${asin}`, params);
    return response.data;
  }

  // ==================== Inventory ====================

  /**
   * Get FBA inventory summaries.
   */
  async getInventorySummaries(params: InventorySummariesParams): Promise<InventorySummariesResponse> {
    await this.ensureValidToken();

    const queryParams: Record<string, string> = {
      granularityType: params.granularityType,
      granularityId: params.granularityId,
      marketplaceIds: params.marketplaceIds.join(","),
    };
    if (params.details !== undefined) queryParams.details = String(params.details);
    if (params.startDateTime) queryParams.startDateTime = params.startDateTime;
    if (params.sellerSkus?.length) queryParams.sellerSkus = params.sellerSkus.join(",");
    if (params.nextToken) queryParams.nextToken = params.nextToken;

    const response = await this.get<{ payload: InventorySummariesResponse }>(
      "/fba/inventory/v1/summaries",
      queryParams
    );
    return response.data.payload;
  }

  // ==================== Orders ====================

  /**
   * List orders matching the given criteria.
   */
  async getOrders(params: OrdersParams): Promise<OrdersResponse> {
    await this.ensureValidToken();

    const queryParams: Record<string, string> = {
      MarketplaceIds: params.MarketplaceIds.join(","),
    };
    if (params.CreatedAfter) queryParams.CreatedAfter = params.CreatedAfter;
    if (params.CreatedBefore) queryParams.CreatedBefore = params.CreatedBefore;
    if (params.LastUpdatedAfter) queryParams.LastUpdatedAfter = params.LastUpdatedAfter;
    if (params.LastUpdatedBefore) queryParams.LastUpdatedBefore = params.LastUpdatedBefore;
    if (params.OrderStatuses?.length) queryParams.OrderStatuses = params.OrderStatuses.join(",");
    if (params.FulfillmentChannels?.length) queryParams.FulfillmentChannels = params.FulfillmentChannels.join(",");
    if (params.MaxResultsPerPage) queryParams.MaxResultsPerPage = String(params.MaxResultsPerPage);
    if (params.NextToken) queryParams.NextToken = params.NextToken;

    const response = await this.get<{ payload: OrdersResponse }>("/orders/v0/orders", queryParams);
    return response.data.payload;
  }

  /**
   * Get details for a specific order.
   */
  async getOrder(orderId: string): Promise<AmazonOrder> {
    await this.ensureValidToken();
    const response = await this.get<{ payload: AmazonOrder }>(`/orders/v0/orders/${orderId}`);
    return response.data.payload;
  }

  /**
   * Get order items for a specific order.
   */
  async getOrderItems(orderId: string, nextToken?: string): Promise<OrderItemsResponse> {
    await this.ensureValidToken();
    const params: Record<string, string> = {};
    if (nextToken) params.NextToken = nextToken;

    const response = await this.get<{ payload: OrderItemsResponse }>(
      `/orders/v0/orders/${orderId}/orderItems`,
      params
    );
    return response.data.payload;
  }

  // ==================== Feeds ====================

  /**
   * List feeds matching the given criteria.
   */
  async getFeeds(params?: FeedsParams): Promise<FeedsResponse> {
    await this.ensureValidToken();

    const queryParams: Record<string, string> = {};
    if (params?.feedTypes?.length) queryParams.feedTypes = params.feedTypes.join(",");
    if (params?.marketplaceIds?.length) queryParams.marketplaceIds = params.marketplaceIds.join(",");
    if (params?.processingStatuses?.length) queryParams.processingStatuses = params.processingStatuses.join(",");
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.nextToken) queryParams.nextToken = params.nextToken;
    if (params?.createdSince) queryParams.createdSince = params.createdSince;
    if (params?.createdUntil) queryParams.createdUntil = params.createdUntil;

    const response = await this.get<FeedsResponse>("/feeds/2021-06-30/feeds", queryParams);
    return response.data;
  }

  /**
   * Get a single feed by ID.
   */
  async getFeed(feedId: string): Promise<Feed> {
    await this.ensureValidToken();
    const response = await this.get<Feed>(`/feeds/2021-06-30/feeds/${feedId}`);
    return response.data;
  }

  /**
   * Create a feed.
   */
  async createFeed(params: CreateFeedParams): Promise<{ feedId: string }> {
    await this.ensureValidToken();
    const response = await this.post<{ feedId: string }>("/feeds/2021-06-30/feeds", params);
    return response.data;
  }

  /**
   * Create a feed document (upload destination).
   */
  async createFeedDocument(params: CreateFeedDocumentParams): Promise<FeedDocument> {
    await this.ensureValidToken();
    const response = await this.post<FeedDocument>("/feeds/2021-06-30/documents", params);
    return response.data;
  }

  /**
   * Get a feed document by ID (download URL).
   */
  async getFeedDocument(feedDocumentId: string): Promise<FeedDocument> {
    await this.ensureValidToken();
    const response = await this.get<FeedDocument>(`/feeds/2021-06-30/documents/${feedDocumentId}`);
    return response.data;
  }

  // ==================== Reports ====================

  /**
   * List reports matching the given criteria.
   */
  async getReports(params?: ReportsParams): Promise<ReportsResponse> {
    await this.ensureValidToken();

    const queryParams: Record<string, string> = {};
    if (params?.reportTypes?.length) queryParams.reportTypes = params.reportTypes.join(",");
    if (params?.processingStatuses?.length) queryParams.processingStatuses = params.processingStatuses.join(",");
    if (params?.marketplaceIds?.length) queryParams.marketplaceIds = params.marketplaceIds.join(",");
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.nextToken) queryParams.nextToken = params.nextToken;
    if (params?.createdSince) queryParams.createdSince = params.createdSince;
    if (params?.createdUntil) queryParams.createdUntil = params.createdUntil;

    const response = await this.get<ReportsResponse>("/reports/2021-06-30/reports", queryParams);
    return response.data;
  }

  /**
   * Get a single report by ID.
   */
  async getReport(reportId: string): Promise<Report> {
    await this.ensureValidToken();
    const response = await this.get<Report>(`/reports/2021-06-30/reports/${reportId}`);
    return response.data;
  }

  /**
   * Create a report request.
   */
  async createReport(params: CreateReportParams): Promise<{ reportId: string }> {
    await this.ensureValidToken();
    const response = await this.post<{ reportId: string }>("/reports/2021-06-30/reports", params);
    return response.data;
  }

  /**
   * Get a report document by ID (download URL).
   */
  async getReportDocument(reportDocumentId: string): Promise<ReportDocument> {
    await this.ensureValidToken();
    const response = await this.get<ReportDocument>(`/reports/2021-06-30/documents/${reportDocumentId}`);
    return response.data;
  }

  // ==================== Connection Test ====================

  /**
   * Test the connection by listing recent orders.
   */
  async testConnection(marketplaceId: string): Promise<boolean> {
    try {
      await this.ensureValidToken();
      await this.getOrders({
        MarketplaceIds: [marketplaceId],
        MaxResultsPerPage: 1,
      });
      return true;
    } catch {
      return false;
    }
  }
}
