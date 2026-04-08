// ==================== eBay API Client ====================

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  EbayClientConfig,
  EbayInventoryItem,
  EbayInventoryItemsResponse,
  EbayOrder,
  EbayOrdersParams,
  EbayOrdersResponse,
  EbayCatalogSearchParams,
  EbayCatalogSearchResponse,
  EbayCatalogItem,
  EbayShippingFulfillment,
  EbayShippingFulfillmentResponse,
} from "./types.js";

const PRODUCTION_API = "https://api.ebay.com";
const SANDBOX_API = "https://api.sandbox.ebay.com";
const TOKEN_URL_PRODUCTION = "https://api.ebay.com/identity/v1/oauth2/token";
const TOKEN_URL_SANDBOX = "https://api.sandbox.ebay.com/identity/v1/oauth2/token";

export class EbayClient extends BaseIntegrationClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly isSandbox: boolean;
  private readonly marketplaceId: string;
  private refreshToken?: string;
  private tokenExpiresAt = 0;

  constructor(config: EbayClientConfig) {
    const isSandbox = config.sandbox ?? false;
    super({
      baseUrl: isSandbox ? SANDBOX_API : PRODUCTION_API,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        "X-EBAY-C-MARKETPLACE-ID": config.marketplaceId ?? "EBAY_DE",
      },
    });
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.isSandbox = isSandbox;
    this.marketplaceId = config.marketplaceId ?? "EBAY_DE";
    this.refreshToken = config.refreshToken;
  }

  // ==================== Token Refresh ====================

  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const tokenUrl = this.isSandbox ? TOKEN_URL_SANDBOX : TOKEN_URL_PRODUCTION;
    const basicAuth = btoa(`${this.clientId}:${this.clientSecret}`);

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`eBay token refresh failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
    };

    this.credentials.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }

    return data.access_token;
  }

  private async ensureValidToken(): Promise<void> {
    const bufferMs = 5 * 60 * 1000;
    if (this.tokenExpiresAt > 0 && Date.now() >= this.tokenExpiresAt - bufferMs) {
      await this.refreshAccessToken();
    }
  }

  // ==================== Inventory (Sell Inventory API) ====================

  /**
   * Get a single inventory item by SKU.
   */
  async getInventoryItem(sku: string): Promise<EbayInventoryItem> {
    await this.ensureValidToken();
    const response = await this.get<EbayInventoryItem>(
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`
    );
    return response.data;
  }

  /**
   * List inventory items with pagination.
   */
  async getInventoryItems(limit = 25, offset = 0): Promise<EbayInventoryItemsResponse> {
    await this.ensureValidToken();
    const response = await this.get<EbayInventoryItemsResponse>(
      "/sell/inventory/v1/inventory_item",
      { limit: String(limit), offset: String(offset) }
    );
    return response.data;
  }

  /**
   * Create or replace an inventory item by SKU.
   */
  async createOrReplaceInventoryItem(
    sku: string,
    item: Omit<EbayInventoryItem, "sku">
  ): Promise<void> {
    await this.ensureValidToken();
    await this.put(
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      item
    );
  }

  /**
   * Delete an inventory item by SKU.
   */
  async deleteInventoryItem(sku: string): Promise<void> {
    await this.ensureValidToken();
    await this.delete(`/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`);
  }

  /**
   * Bulk update the quantity/price of inventory items.
   */
  async bulkUpdatePriceQuantity(
    requests: Array<{
      sku: string;
      shipToLocationAvailability: { quantity: number };
      offers: Array<{
        offerId: string;
        availableQuantity: number;
        price: { value: string; currency: string };
      }>;
    }>
  ): Promise<unknown> {
    await this.ensureValidToken();
    const response = await this.post(
      "/sell/inventory/v1/bulk_update_price_quantity",
      { requests }
    );
    return response.data;
  }

  // ==================== Orders (Fulfillment API) ====================

  /**
   * List orders with optional filters.
   */
  async getOrders(params?: EbayOrdersParams): Promise<EbayOrdersResponse> {
    await this.ensureValidToken();

    const queryParams: Record<string, string> = {};
    if (params?.filter) queryParams.filter = params.filter;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.offset) queryParams.offset = String(params.offset);
    if (params?.orderIds) queryParams.orderIds = params.orderIds;
    if (params?.fieldGroups) queryParams.fieldGroups = params.fieldGroups;

    const response = await this.get<EbayOrdersResponse>(
      "/sell/fulfillment/v1/order",
      queryParams
    );
    return response.data;
  }

  /**
   * Get a single order by ID.
   */
  async getOrder(orderId: string): Promise<EbayOrder> {
    await this.ensureValidToken();
    const response = await this.get<EbayOrder>(
      `/sell/fulfillment/v1/order/${orderId}`
    );
    return response.data;
  }

  // ==================== Catalog (Browse API) ====================

  /**
   * Search the eBay catalog (Browse API).
   */
  async searchCatalog(params: EbayCatalogSearchParams): Promise<EbayCatalogSearchResponse> {
    await this.ensureValidToken();

    const queryParams: Record<string, string> = {};
    if (params.q) queryParams.q = params.q;
    if (params.category_ids) queryParams.category_ids = params.category_ids;
    if (params.filter) queryParams.filter = params.filter;
    if (params.sort) queryParams.sort = params.sort;
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.offset) queryParams.offset = String(params.offset);
    if (params.aspect_filter) queryParams.aspect_filter = params.aspect_filter;
    if (params.fieldgroups) queryParams.fieldgroups = params.fieldgroups;

    const response = await this.get<EbayCatalogSearchResponse>(
      "/buy/browse/v1/item_summary/search",
      queryParams
    );
    return response.data;
  }

  /**
   * Get a single catalog item by ID.
   */
  async getCatalogItem(itemId: string): Promise<EbayCatalogItem> {
    await this.ensureValidToken();
    const response = await this.get<EbayCatalogItem>(
      `/buy/browse/v1/item/${itemId}`
    );
    return response.data;
  }

  // ==================== Fulfillment ====================

  /**
   * Create a shipping fulfillment for an order.
   */
  async createShippingFulfillment(
    orderId: string,
    fulfillment: EbayShippingFulfillment
  ): Promise<EbayShippingFulfillmentResponse> {
    await this.ensureValidToken();
    const response = await this.post<EbayShippingFulfillmentResponse>(
      `/sell/fulfillment/v1/order/${orderId}/shipping_fulfillment`,
      fulfillment
    );
    return response.data;
  }

  /**
   * Get shipping fulfillments for an order.
   */
  async getShippingFulfillments(
    orderId: string
  ): Promise<{ fulfillments: EbayShippingFulfillmentResponse[] }> {
    await this.ensureValidToken();
    const response = await this.get<{ fulfillments: EbayShippingFulfillmentResponse[] }>(
      `/sell/fulfillment/v1/order/${orderId}/shipping_fulfillment`
    );
    return response.data;
  }

  // ==================== Connection Test ====================

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      await this.getInventoryItems(1, 0);
      return true;
    } catch {
      return false;
    }
  }
}
