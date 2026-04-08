// ==================== JTL API Client ====================

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  JtlClientConfig,
  JtlArticle,
  JtlArticlesParams,
  JtlArticlesResponse,
  JtlOrder,
  JtlOrdersParams,
  JtlOrdersResponse,
  JtlStockEntry,
  JtlStockParams,
  JtlStockResponse,
  JtlStockUpdate,
  JtlCustomer,
  JtlCustomersParams,
  JtlCustomersResponse,
} from "./types.js";

export class JtlClient extends BaseIntegrationClient {
  constructor(config: JtlClientConfig) {
    super({
      baseUrl: config.apiUrl.replace(/\/$/, ""),
      authType: "api_key",
      credentials: {
        headerName: "Authorization",
        apiKey: `Bearer ${config.apiKey}`,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });
  }

  // ==================== Articles ====================

  /**
   * List articles with optional filters.
   */
  async getArticles(params?: JtlArticlesParams): Promise<JtlArticlesResponse> {
    const queryParams = this.toQueryParams(params as Record<string, unknown>);
    const response = await this.get<JtlArticlesResponse>("/v1/articles", queryParams);
    return response.data;
  }

  /**
   * Get a single article by ID.
   */
  async getArticle(articleId: number): Promise<JtlArticle> {
    const response = await this.get<JtlArticle>(`/v1/articles/${articleId}`);
    return response.data;
  }

  /**
   * Create a new article.
   */
  async createArticle(article: Partial<JtlArticle>): Promise<JtlArticle> {
    const response = await this.post<JtlArticle>("/v1/articles", article);
    return response.data;
  }

  /**
   * Update an existing article.
   */
  async updateArticle(articleId: number, article: Partial<JtlArticle>): Promise<JtlArticle> {
    const response = await this.put<JtlArticle>(`/v1/articles/${articleId}`, article);
    return response.data;
  }

  /**
   * Delete an article.
   */
  async deleteArticle(articleId: number): Promise<void> {
    await this.delete(`/v1/articles/${articleId}`);
  }

  /**
   * Search articles by query string (name, SKU, EAN).
   */
  async searchArticles(query: string, pageSize = 25): Promise<JtlArticlesResponse> {
    return this.getArticles({ search: query, pageSize });
  }

  // ==================== Orders ====================

  /**
   * List orders with optional filters.
   */
  async getOrders(params?: JtlOrdersParams): Promise<JtlOrdersResponse> {
    const queryParams = this.toQueryParams(params as Record<string, unknown>);
    const response = await this.get<JtlOrdersResponse>("/v1/orders", queryParams);
    return response.data;
  }

  /**
   * Get a single order by ID.
   */
  async getOrder(orderId: number): Promise<JtlOrder> {
    const response = await this.get<JtlOrder>(`/v1/orders/${orderId}`);
    return response.data;
  }

  /**
   * Update order status.
   */
  async updateOrderStatus(orderId: number, status: string): Promise<JtlOrder> {
    const response = await this.patch<JtlOrder>(`/v1/orders/${orderId}`, { status });
    return response.data;
  }

  /**
   * Add tracking information to an order.
   */
  async addOrderTracking(
    orderId: number,
    trackingNumber: string,
    trackingUrl?: string,
    carrier?: string
  ): Promise<JtlOrder> {
    const response = await this.patch<JtlOrder>(`/v1/orders/${orderId}`, {
      trackingNumber,
      trackingUrl,
      shippingMethod: carrier,
    });
    return response.data;
  }

  // ==================== Stock ====================

  /**
   * Get stock levels with optional filters.
   */
  async getStock(params?: JtlStockParams): Promise<JtlStockResponse> {
    const queryParams = this.toQueryParams(params as Record<string, unknown>);
    const response = await this.get<JtlStockResponse>("/v1/stock", queryParams);
    return response.data;
  }

  /**
   * Get stock level for a specific article.
   */
  async getArticleStock(articleId: number): Promise<JtlStockEntry[]> {
    const response = await this.get<{ items: JtlStockEntry[] }>(
      `/v1/stock`,
      { articleIds: String(articleId) }
    );
    return response.data.items;
  }

  /**
   * Update stock level for an article in a warehouse.
   */
  async updateStock(update: JtlStockUpdate): Promise<JtlStockEntry> {
    const response = await this.post<JtlStockEntry>("/v1/stock/adjust", update);
    return response.data;
  }

  /**
   * Batch update stock levels.
   */
  async batchUpdateStock(updates: JtlStockUpdate[]): Promise<JtlStockEntry[]> {
    const response = await this.post<{ items: JtlStockEntry[] }>(
      "/v1/stock/adjust/batch",
      { updates }
    );
    return response.data.items;
  }

  // ==================== Customers ====================

  /**
   * List customers with optional filters.
   */
  async getCustomers(params?: JtlCustomersParams): Promise<JtlCustomersResponse> {
    const queryParams = this.toQueryParams(params as Record<string, unknown>);
    const response = await this.get<JtlCustomersResponse>("/v1/customers", queryParams);
    return response.data;
  }

  /**
   * Get a single customer by ID.
   */
  async getCustomer(customerId: number): Promise<JtlCustomer> {
    const response = await this.get<JtlCustomer>(`/v1/customers/${customerId}`);
    return response.data;
  }

  /**
   * Create a customer.
   */
  async createCustomer(customer: Partial<JtlCustomer>): Promise<JtlCustomer> {
    const response = await this.post<JtlCustomer>("/v1/customers", customer);
    return response.data;
  }

  /**
   * Update a customer.
   */
  async updateCustomer(customerId: number, customer: Partial<JtlCustomer>): Promise<JtlCustomer> {
    const response = await this.put<JtlCustomer>(`/v1/customers/${customerId}`, customer);
    return response.data;
  }

  // ==================== Connection Test ====================

  async testConnection(): Promise<boolean> {
    try {
      await this.getArticles({ pageSize: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Helpers ====================

  private toQueryParams(params?: Record<string, unknown>): Record<string, string> {
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
