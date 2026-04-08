// ==================== WooCommerce REST API Client ====================

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  WooCommerceClientConfig,
  WooProduct,
  WooProductsParams,
  WooProductVariation,
  WooOrder,
  WooOrdersParams,
  WooCustomer,
  WooCustomersParams,
  WooWebhook,
  WooWebhookTopic,
} from "./types.js";

export class WooCommerceClient extends BaseIntegrationClient {
  constructor(config: WooCommerceClientConfig) {
    const apiVersion = config.apiVersion ?? "wc/v3";
    const baseUrl = `${config.storeUrl.replace(/\/$/, "")}/wp-json/${apiVersion}`;

    super({
      baseUrl,
      authType: "basic_auth",
      credentials: {
        username: config.consumerKey,
        password: config.consumerSecret,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });
  }

  // ==================== Products ====================

  /**
   * List products with optional filters.
   */
  async getProducts(params?: WooProductsParams): Promise<WooProduct[]> {
    const queryParams = this.buildQueryParams(params as Record<string, unknown>);
    const response = await this.get<WooProduct[]>("/products", queryParams);
    return response.data;
  }

  /**
   * Get a single product by ID.
   */
  async getProduct(productId: number): Promise<WooProduct> {
    const response = await this.get<WooProduct>(`/products/${productId}`);
    return response.data;
  }

  /**
   * Create a new product.
   */
  async createProduct(product: Partial<WooProduct>): Promise<WooProduct> {
    const response = await this.post<WooProduct>("/products", product);
    return response.data;
  }

  /**
   * Update an existing product.
   */
  async updateProduct(productId: number, product: Partial<WooProduct>): Promise<WooProduct> {
    const response = await this.put<WooProduct>(`/products/${productId}`, product);
    return response.data;
  }

  /**
   * Delete a product.
   */
  async deleteProduct(productId: number, force = false): Promise<WooProduct> {
    const response = await this.request<WooProduct>({
      method: "DELETE",
      path: `/products/${productId}`,
      params: { force: String(force) },
    });
    return response.data;
  }

  /**
   * Batch create/update/delete products.
   */
  async batchProducts(batch: {
    create?: Partial<WooProduct>[];
    update?: Partial<WooProduct>[];
    delete?: number[];
  }): Promise<{
    create?: WooProduct[];
    update?: WooProduct[];
    delete?: WooProduct[];
  }> {
    const response = await this.post<{
      create?: WooProduct[];
      update?: WooProduct[];
      delete?: WooProduct[];
    }>("/products/batch", batch);
    return response.data;
  }

  // ==================== Product Variations (Inventory) ====================

  /**
   * List variations for a product.
   */
  async getVariations(productId: number, params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sku?: string;
    stock_status?: string;
  }): Promise<WooProductVariation[]> {
    const queryParams = this.buildQueryParams(params as Record<string, unknown>);
    const response = await this.get<WooProductVariation[]>(
      `/products/${productId}/variations`,
      queryParams
    );
    return response.data;
  }

  /**
   * Get a single variation.
   */
  async getVariation(productId: number, variationId: number): Promise<WooProductVariation> {
    const response = await this.get<WooProductVariation>(
      `/products/${productId}/variations/${variationId}`
    );
    return response.data;
  }

  /**
   * Update a variation (e.g., stock quantity).
   */
  async updateVariation(
    productId: number,
    variationId: number,
    variation: Partial<WooProductVariation>
  ): Promise<WooProductVariation> {
    const response = await this.put<WooProductVariation>(
      `/products/${productId}/variations/${variationId}`,
      variation
    );
    return response.data;
  }

  /**
   * Update stock quantity for a simple product.
   */
  async updateStock(productId: number, stockQuantity: number): Promise<WooProduct> {
    return this.updateProduct(productId, {
      stock_quantity: stockQuantity,
      manage_stock: true,
    });
  }

  /**
   * Update stock quantity for a product variation.
   */
  async updateVariationStock(
    productId: number,
    variationId: number,
    stockQuantity: number
  ): Promise<WooProductVariation> {
    return this.updateVariation(productId, variationId, {
      stock_quantity: stockQuantity,
      manage_stock: true,
    });
  }

  // ==================== Orders ====================

  /**
   * List orders with optional filters.
   */
  async getOrders(params?: WooOrdersParams): Promise<WooOrder[]> {
    const queryParams = this.buildQueryParams(params as Record<string, unknown>);
    const response = await this.get<WooOrder[]>("/orders", queryParams);
    return response.data;
  }

  /**
   * Get a single order by ID.
   */
  async getOrder(orderId: number): Promise<WooOrder> {
    const response = await this.get<WooOrder>(`/orders/${orderId}`);
    return response.data;
  }

  /**
   * Create a new order.
   */
  async createOrder(order: Partial<WooOrder>): Promise<WooOrder> {
    const response = await this.post<WooOrder>("/orders", order);
    return response.data;
  }

  /**
   * Update an existing order.
   */
  async updateOrder(orderId: number, order: Partial<WooOrder>): Promise<WooOrder> {
    const response = await this.put<WooOrder>(`/orders/${orderId}`, order);
    return response.data;
  }

  /**
   * Delete an order.
   */
  async deleteOrder(orderId: number, force = false): Promise<WooOrder> {
    const response = await this.request<WooOrder>({
      method: "DELETE",
      path: `/orders/${orderId}`,
      params: { force: String(force) },
    });
    return response.data;
  }

  /**
   * Batch create/update/delete orders.
   */
  async batchOrders(batch: {
    create?: Partial<WooOrder>[];
    update?: Partial<WooOrder>[];
    delete?: number[];
  }): Promise<{
    create?: WooOrder[];
    update?: WooOrder[];
    delete?: WooOrder[];
  }> {
    const response = await this.post<{
      create?: WooOrder[];
      update?: WooOrder[];
      delete?: WooOrder[];
    }>("/orders/batch", batch);
    return response.data;
  }

  // ==================== Customers ====================

  /**
   * List customers with optional filters.
   */
  async getCustomers(params?: WooCustomersParams): Promise<WooCustomer[]> {
    const queryParams = this.buildQueryParams(params as Record<string, unknown>);
    const response = await this.get<WooCustomer[]>("/customers", queryParams);
    return response.data;
  }

  /**
   * Get a single customer by ID.
   */
  async getCustomer(customerId: number): Promise<WooCustomer> {
    const response = await this.get<WooCustomer>(`/customers/${customerId}`);
    return response.data;
  }

  /**
   * Create a new customer.
   */
  async createCustomer(customer: Partial<WooCustomer>): Promise<WooCustomer> {
    const response = await this.post<WooCustomer>("/customers", customer);
    return response.data;
  }

  /**
   * Update an existing customer.
   */
  async updateCustomer(customerId: number, customer: Partial<WooCustomer>): Promise<WooCustomer> {
    const response = await this.put<WooCustomer>(`/customers/${customerId}`, customer);
    return response.data;
  }

  // ==================== Webhooks ====================

  /**
   * List webhooks.
   */
  async getWebhooks(params?: { page?: number; per_page?: number }): Promise<WooWebhook[]> {
    const queryParams = this.buildQueryParams(params as Record<string, unknown>);
    const response = await this.get<WooWebhook[]>("/webhooks", queryParams);
    return response.data;
  }

  /**
   * Create a webhook.
   */
  async createWebhook(
    topic: WooWebhookTopic,
    deliveryUrl: string,
    secret: string,
    name?: string
  ): Promise<WooWebhook> {
    const response = await this.post<WooWebhook>("/webhooks", {
      name: name ?? `Webhook for ${topic}`,
      topic,
      delivery_url: deliveryUrl,
      secret,
      status: "active",
    });
    return response.data;
  }

  /**
   * Delete a webhook.
   */
  async deleteWebhook(webhookId: number, force = true): Promise<void> {
    await this.request({
      method: "DELETE",
      path: `/webhooks/${webhookId}`,
      params: { force: String(force) },
    });
  }

  // ==================== Connection Test ====================

  async testConnection(): Promise<boolean> {
    try {
      await this.get("/system_status");
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Helpers ====================

  private buildQueryParams(params?: Record<string, unknown>): Record<string, string> {
    if (!params) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        result[key] = value.join(",");
      } else {
        result[key] = String(value);
      }
    }
    return result;
  }
}
