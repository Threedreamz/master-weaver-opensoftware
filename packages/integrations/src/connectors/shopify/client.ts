// ==================== Shopify Admin REST API Client ====================

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  ShopifyClientConfig,
  ShopifyProduct,
  ShopifyProductsParams,
  ShopifyVariant,
  ShopifyInventoryItem,
  ShopifyInventoryLevel,
  ShopifyLocation,
  ShopifyOrder,
  ShopifyOrdersParams,
  ShopifyCustomer,
  ShopifyCustomersParams,
  ShopifyFulfillment,
  CreateFulfillmentParams,
  ShopifyWebhookSubscription,
  ShopifyWebhookTopic,
} from "./types.js";

export class ShopifyClient extends BaseIntegrationClient {
  private readonly shopDomain: string;
  private readonly apiVersion: string;

  constructor(config: ShopifyClientConfig) {
    const apiVersion = config.apiVersion ?? "2024-01";
    const baseUrl = `https://${config.shopDomain}/admin/api/${apiVersion}`;

    super({
      baseUrl,
      authType: "api_key",
      credentials: {
        headerName: "X-Shopify-Access-Token",
        apiKey: config.accessToken,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 40, burstSize: 4 },
    });

    this.shopDomain = config.shopDomain;
    this.apiVersion = apiVersion;
  }

  // ==================== Products ====================

  /**
   * List products with optional filters.
   */
  async getProducts(params?: ShopifyProductsParams): Promise<ShopifyProduct[]> {
    const queryParams: Record<string, string> = {};
    if (params?.ids) queryParams.ids = params.ids;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.since_id) queryParams.since_id = String(params.since_id);
    if (params?.title) queryParams.title = params.title;
    if (params?.vendor) queryParams.vendor = params.vendor;
    if (params?.handle) queryParams.handle = params.handle;
    if (params?.product_type) queryParams.product_type = params.product_type;
    if (params?.collection_id) queryParams.collection_id = String(params.collection_id);
    if (params?.status) queryParams.status = params.status;
    if (params?.created_at_min) queryParams.created_at_min = params.created_at_min;
    if (params?.created_at_max) queryParams.created_at_max = params.created_at_max;
    if (params?.updated_at_min) queryParams.updated_at_min = params.updated_at_min;
    if (params?.updated_at_max) queryParams.updated_at_max = params.updated_at_max;
    if (params?.fields) queryParams.fields = params.fields;
    if (params?.page_info) queryParams.page_info = params.page_info;

    const response = await this.get<{ products: ShopifyProduct[] }>("/products.json", queryParams);
    return response.data.products;
  }

  /**
   * Get a single product by ID.
   */
  async getProduct(productId: number, fields?: string): Promise<ShopifyProduct> {
    const params: Record<string, string> = {};
    if (fields) params.fields = fields;

    const response = await this.get<{ product: ShopifyProduct }>(
      `/products/${productId}.json`,
      params
    );
    return response.data.product;
  }

  /**
   * Create a new product.
   */
  async createProduct(product: Partial<ShopifyProduct>): Promise<ShopifyProduct> {
    const response = await this.post<{ product: ShopifyProduct }>("/products.json", {
      product,
    });
    return response.data.product;
  }

  /**
   * Update an existing product.
   */
  async updateProduct(productId: number, product: Partial<ShopifyProduct>): Promise<ShopifyProduct> {
    const response = await this.put<{ product: ShopifyProduct }>(
      `/products/${productId}.json`,
      { product }
    );
    return response.data.product;
  }

  /**
   * Delete a product.
   */
  async deleteProduct(productId: number): Promise<void> {
    await this.delete(`/products/${productId}.json`);
  }

  /**
   * Get the count of products.
   */
  async getProductCount(params?: { vendor?: string; product_type?: string; status?: string }): Promise<number> {
    const queryParams: Record<string, string> = {};
    if (params?.vendor) queryParams.vendor = params.vendor;
    if (params?.product_type) queryParams.product_type = params.product_type;
    if (params?.status) queryParams.status = params.status;

    const response = await this.get<{ count: number }>("/products/count.json", queryParams);
    return response.data.count;
  }

  // ==================== Variants ====================

  /**
   * Get variants for a product.
   */
  async getVariants(productId: number, limit?: number): Promise<ShopifyVariant[]> {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);

    const response = await this.get<{ variants: ShopifyVariant[] }>(
      `/products/${productId}/variants.json`,
      params
    );
    return response.data.variants;
  }

  /**
   * Update a variant.
   */
  async updateVariant(variantId: number, variant: Partial<ShopifyVariant>): Promise<ShopifyVariant> {
    const response = await this.put<{ variant: ShopifyVariant }>(
      `/variants/${variantId}.json`,
      { variant }
    );
    return response.data.variant;
  }

  // ==================== Inventory ====================

  /**
   * Get an inventory item by ID.
   */
  async getInventoryItem(inventoryItemId: number): Promise<ShopifyInventoryItem> {
    const response = await this.get<{ inventory_item: ShopifyInventoryItem }>(
      `/inventory_items/${inventoryItemId}.json`
    );
    return response.data.inventory_item;
  }

  /**
   * Get inventory levels for an inventory item or location.
   */
  async getInventoryLevels(params: {
    inventory_item_ids?: number[];
    location_ids?: number[];
    limit?: number;
  }): Promise<ShopifyInventoryLevel[]> {
    const queryParams: Record<string, string> = {};
    if (params.inventory_item_ids?.length) {
      queryParams.inventory_item_ids = params.inventory_item_ids.join(",");
    }
    if (params.location_ids?.length) {
      queryParams.location_ids = params.location_ids.join(",");
    }
    if (params.limit) queryParams.limit = String(params.limit);

    const response = await this.get<{ inventory_levels: ShopifyInventoryLevel[] }>(
      "/inventory_levels.json",
      queryParams
    );
    return response.data.inventory_levels;
  }

  /**
   * Set the inventory level for an item at a location.
   */
  async setInventoryLevel(
    inventoryItemId: number,
    locationId: number,
    available: number
  ): Promise<ShopifyInventoryLevel> {
    const response = await this.post<{ inventory_level: ShopifyInventoryLevel }>(
      "/inventory_levels/set.json",
      {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available,
      }
    );
    return response.data.inventory_level;
  }

  /**
   * Adjust the inventory level for an item at a location.
   */
  async adjustInventoryLevel(
    inventoryItemId: number,
    locationId: number,
    availableAdjustment: number
  ): Promise<ShopifyInventoryLevel> {
    const response = await this.post<{ inventory_level: ShopifyInventoryLevel }>(
      "/inventory_levels/adjust.json",
      {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available_adjustment: availableAdjustment,
      }
    );
    return response.data.inventory_level;
  }

  /**
   * List all locations.
   */
  async getLocations(): Promise<ShopifyLocation[]> {
    const response = await this.get<{ locations: ShopifyLocation[] }>("/locations.json");
    return response.data.locations;
  }

  // ==================== Orders ====================

  /**
   * List orders with optional filters.
   */
  async getOrders(params?: ShopifyOrdersParams): Promise<ShopifyOrder[]> {
    const queryParams: Record<string, string> = {};
    if (params?.ids) queryParams.ids = params.ids;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.since_id) queryParams.since_id = String(params.since_id);
    if (params?.created_at_min) queryParams.created_at_min = params.created_at_min;
    if (params?.created_at_max) queryParams.created_at_max = params.created_at_max;
    if (params?.updated_at_min) queryParams.updated_at_min = params.updated_at_min;
    if (params?.updated_at_max) queryParams.updated_at_max = params.updated_at_max;
    if (params?.status) queryParams.status = params.status;
    if (params?.financial_status) queryParams.financial_status = params.financial_status;
    if (params?.fulfillment_status) queryParams.fulfillment_status = params.fulfillment_status;
    if (params?.fields) queryParams.fields = params.fields;
    if (params?.page_info) queryParams.page_info = params.page_info;

    const response = await this.get<{ orders: ShopifyOrder[] }>("/orders.json", queryParams);
    return response.data.orders;
  }

  /**
   * Get a single order by ID.
   */
  async getOrder(orderId: number, fields?: string): Promise<ShopifyOrder> {
    const params: Record<string, string> = {};
    if (fields) params.fields = fields;

    const response = await this.get<{ order: ShopifyOrder }>(
      `/orders/${orderId}.json`,
      params
    );
    return response.data.order;
  }

  /**
   * Get the count of orders.
   */
  async getOrderCount(params?: {
    status?: string;
    financial_status?: string;
    fulfillment_status?: string;
    created_at_min?: string;
    created_at_max?: string;
  }): Promise<number> {
    const queryParams: Record<string, string> = {};
    if (params?.status) queryParams.status = params.status;
    if (params?.financial_status) queryParams.financial_status = params.financial_status;
    if (params?.fulfillment_status) queryParams.fulfillment_status = params.fulfillment_status;
    if (params?.created_at_min) queryParams.created_at_min = params.created_at_min;
    if (params?.created_at_max) queryParams.created_at_max = params.created_at_max;

    const response = await this.get<{ count: number }>("/orders/count.json", queryParams);
    return response.data.count;
  }

  /**
   * Close an order.
   */
  async closeOrder(orderId: number): Promise<ShopifyOrder> {
    const response = await this.post<{ order: ShopifyOrder }>(
      `/orders/${orderId}/close.json`
    );
    return response.data.order;
  }

  /**
   * Cancel an order.
   */
  async cancelOrder(orderId: number, params?: {
    amount?: string;
    currency?: string;
    restock?: boolean;
    reason?: string;
    email?: boolean;
  }): Promise<ShopifyOrder> {
    const response = await this.post<{ order: ShopifyOrder }>(
      `/orders/${orderId}/cancel.json`,
      params ?? {}
    );
    return response.data.order;
  }

  // ==================== Customers ====================

  /**
   * List customers with optional filters.
   */
  async getCustomers(params?: ShopifyCustomersParams): Promise<ShopifyCustomer[]> {
    const queryParams: Record<string, string> = {};
    if (params?.ids) queryParams.ids = params.ids;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.since_id) queryParams.since_id = String(params.since_id);
    if (params?.created_at_min) queryParams.created_at_min = params.created_at_min;
    if (params?.created_at_max) queryParams.created_at_max = params.created_at_max;
    if (params?.updated_at_min) queryParams.updated_at_min = params.updated_at_min;
    if (params?.updated_at_max) queryParams.updated_at_max = params.updated_at_max;
    if (params?.fields) queryParams.fields = params.fields;
    if (params?.page_info) queryParams.page_info = params.page_info;

    const response = await this.get<{ customers: ShopifyCustomer[] }>("/customers.json", queryParams);
    return response.data.customers;
  }

  /**
   * Get a single customer by ID.
   */
  async getCustomer(customerId: number, fields?: string): Promise<ShopifyCustomer> {
    const params: Record<string, string> = {};
    if (fields) params.fields = fields;

    const response = await this.get<{ customer: ShopifyCustomer }>(
      `/customers/${customerId}.json`,
      params
    );
    return response.data.customer;
  }

  /**
   * Search customers by query.
   */
  async searchCustomers(query: string, limit?: number): Promise<ShopifyCustomer[]> {
    const params: Record<string, string> = { query };
    if (limit) params.limit = String(limit);

    const response = await this.get<{ customers: ShopifyCustomer[] }>(
      "/customers/search.json",
      params
    );
    return response.data.customers;
  }

  /**
   * Create a customer.
   */
  async createCustomer(customer: Partial<ShopifyCustomer>): Promise<ShopifyCustomer> {
    const response = await this.post<{ customer: ShopifyCustomer }>(
      "/customers.json",
      { customer }
    );
    return response.data.customer;
  }

  /**
   * Update a customer.
   */
  async updateCustomer(customerId: number, customer: Partial<ShopifyCustomer>): Promise<ShopifyCustomer> {
    const response = await this.put<{ customer: ShopifyCustomer }>(
      `/customers/${customerId}.json`,
      { customer }
    );
    return response.data.customer;
  }

  // ==================== Fulfillments ====================

  /**
   * Create a fulfillment (v2 - Fulfillment Orders based).
   */
  async createFulfillment(params: CreateFulfillmentParams): Promise<ShopifyFulfillment> {
    const response = await this.post<{ fulfillment: ShopifyFulfillment }>(
      "/fulfillments.json",
      { fulfillment: params }
    );
    return response.data.fulfillment;
  }

  /**
   * Get fulfillments for an order.
   */
  async getOrderFulfillments(orderId: number): Promise<ShopifyFulfillment[]> {
    const response = await this.get<{ fulfillments: ShopifyFulfillment[] }>(
      `/orders/${orderId}/fulfillments.json`
    );
    return response.data.fulfillments;
  }

  /**
   * Update tracking for a fulfillment.
   */
  async updateFulfillmentTracking(
    fulfillmentId: number,
    tracking: {
      tracking_info: {
        company?: string;
        number?: string;
        url?: string;
      };
      notify_customer?: boolean;
    }
  ): Promise<ShopifyFulfillment> {
    const response = await this.post<{ fulfillment: ShopifyFulfillment }>(
      `/fulfillments/${fulfillmentId}/update_tracking.json`,
      { fulfillment: tracking }
    );
    return response.data.fulfillment;
  }

  // ==================== Webhooks ====================

  /**
   * List webhook subscriptions.
   */
  async getWebhooks(): Promise<ShopifyWebhookSubscription[]> {
    const response = await this.get<{ webhooks: ShopifyWebhookSubscription[] }>(
      "/webhooks.json"
    );
    return response.data.webhooks;
  }

  /**
   * Create a webhook subscription.
   */
  async createWebhook(
    topic: ShopifyWebhookTopic,
    address: string,
    format: "json" | "xml" = "json"
  ): Promise<ShopifyWebhookSubscription> {
    const response = await this.post<{ webhook: ShopifyWebhookSubscription }>(
      "/webhooks.json",
      { webhook: { topic, address, format } }
    );
    return response.data.webhook;
  }

  /**
   * Delete a webhook subscription.
   */
  async deleteWebhook(webhookId: number): Promise<void> {
    await this.delete(`/webhooks/${webhookId}.json`);
  }

  // ==================== Connection Test ====================

  /**
   * Test the connection by fetching shop information.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/shop.json");
      return true;
    } catch {
      return false;
    }
  }
}
