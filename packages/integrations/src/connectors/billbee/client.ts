// ==================== Billbee API Client ====================

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  BillbeeClientConfig,
  BillbeeOrder,
  BillbeeOrdersParams,
  BillbeeListResponse,
  BillbeeProduct,
  BillbeeProductsParams,
  BillbeeStockUpdate,
  BillbeeStockUpdateResponse,
  BillbeeCreateShipmentParams,
  BillbeeWebhook,
  BillbeeOrderState,
} from "./types.js";

const BILLBEE_API_URL = "https://api.billbee.io/api/v1";

export class BillbeeClient extends BaseIntegrationClient {
  constructor(config: BillbeeClientConfig) {
    super({
      baseUrl: BILLBEE_API_URL,
      authType: "basic_auth",
      credentials: {
        username: config.username,
        password: config.password,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        "X-Billbee-Api-Key": config.apiKey,
      },
    });
  }

  // ==================== Orders ====================

  /**
   * List orders with optional filters.
   */
  async getOrders(params?: BillbeeOrdersParams): Promise<BillbeeListResponse<BillbeeOrder>> {
    const queryParams: Record<string, string> = {};
    if (params?.minOrderDate) queryParams.minOrderDate = params.minOrderDate;
    if (params?.maxOrderDate) queryParams.maxOrderDate = params.maxOrderDate;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.shopId) queryParams.shopId = String(params.shopId);
    if (params?.tag) queryParams.tag = params.tag;
    if (params?.minimumBillBeeOrderId) queryParams.minimumBillBeeOrderId = String(params.minimumBillBeeOrderId);
    if (params?.modifiedAtMin) queryParams.modifiedAtMin = params.modifiedAtMin;
    if (params?.modifiedAtMax) queryParams.modifiedAtMax = params.modifiedAtMax;
    if (params?.excludeTags !== undefined) queryParams.excludeTags = String(params.excludeTags);
    if (params?.orderStateId?.length) {
      queryParams.orderStateId = params.orderStateId.join(",");
    }

    const response = await this.get<BillbeeListResponse<BillbeeOrder>>("/orders", queryParams);
    return response.data;
  }

  /**
   * Get a single order by Billbee ID.
   */
  async getOrder(orderId: number): Promise<BillbeeOrder> {
    const response = await this.get<{ Data: BillbeeOrder }>(`/orders/${orderId}`);
    return response.data.Data;
  }

  /**
   * Get a single order by external reference (e.g., marketplace order ID).
   */
  async getOrderByExternalReference(externalReference: string): Promise<BillbeeOrder> {
    const response = await this.get<{ Data: BillbeeOrder }>(
      `/orders/findbyextref/${encodeURIComponent(externalReference)}`
    );
    return response.data.Data;
  }

  /**
   * Update order state.
   */
  async updateOrderState(orderId: number, state: BillbeeOrderState): Promise<void> {
    await this.put(`/orders/${orderId}/orderstate`, { NewStateId: state });
  }

  /**
   * Add a tag to an order.
   */
  async addOrderTag(orderId: number, tag: string): Promise<void> {
    await this.post(`/orders/${orderId}/tags`, { Tags: [tag] });
  }

  /**
   * Add a comment to an order.
   */
  async addOrderComment(orderId: number, comment: string, fromCustomer = false): Promise<void> {
    await this.post(`/orders/${orderId}/messages`, {
      Text: comment,
      FromCustomer: fromCustomer,
    });
  }

  // ==================== Products ====================

  /**
   * List products with optional filters.
   */
  async getProducts(params?: BillbeeProductsParams): Promise<BillbeeListResponse<BillbeeProduct>> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = String(params.page);
    if (params?.pageSize) queryParams.pageSize = String(params.pageSize);
    if (params?.minCreatedAt) queryParams.minCreatedAt = params.minCreatedAt;
    if (params?.type !== undefined) queryParams.type = String(params.type);

    const response = await this.get<BillbeeListResponse<BillbeeProduct>>("/products", queryParams);
    return response.data;
  }

  /**
   * Get a single product by Billbee ID.
   */
  async getProduct(productId: number): Promise<BillbeeProduct> {
    const response = await this.get<{ Data: BillbeeProduct }>(`/products/${productId}`);
    return response.data.Data;
  }

  /**
   * Look up a product by SKU or EAN.
   */
  async lookupProduct(params: {
    id: string;
    type: "sku" | "ean" | "id";
  }): Promise<BillbeeProduct | null> {
    try {
      const typeMap = { sku: "1", ean: "2", id: "0" };
      const response = await this.get<{ Data: BillbeeProduct }>(
        `/products/PatchableFields`,
        { id: params.id, lookupBy: typeMap[params.type] }
      );
      return response.data.Data;
    } catch {
      return null;
    }
  }

  /**
   * Update a product.
   */
  async updateProduct(productId: number, product: Partial<BillbeeProduct>): Promise<BillbeeProduct> {
    const response = await this.patch<{ Data: BillbeeProduct }>(
      `/products/${productId}`,
      product
    );
    return response.data.Data;
  }

  // ==================== Stock ====================

  /**
   * Update stock for a product.
   */
  async updateStock(update: BillbeeStockUpdate): Promise<BillbeeStockUpdateResponse> {
    const response = await this.post<{ Data: BillbeeStockUpdateResponse }>(
      "/products/updatestock",
      {
        ProductId: update.ProductId,
        StockId: update.StockId,
        NewQuantity: update.NewQuantity,
        DeltaQuantity: update.DeltaQuantity,
        Reason: update.Reason,
        OldQuantity: update.OldQuantity,
      }
    );
    return response.data.Data;
  }

  /**
   * Batch update stock for multiple products.
   */
  async batchUpdateStock(updates: BillbeeStockUpdate[]): Promise<BillbeeStockUpdateResponse[]> {
    const response = await this.post<BillbeeStockUpdateResponse[]>(
      "/products/updatestockmultiple",
      updates.map((u) => ({
        ProductId: u.ProductId,
        StockId: u.StockId,
        NewQuantity: u.NewQuantity,
        DeltaQuantity: u.DeltaQuantity,
        Reason: u.Reason,
        OldQuantity: u.OldQuantity,
      }))
    );
    return response.data;
  }

  /**
   * Set absolute stock level for a product.
   */
  async setStock(productId: number, quantity: number, reason?: string): Promise<BillbeeStockUpdateResponse> {
    return this.updateStock({
      ProductId: productId,
      NewQuantity: quantity,
      Reason: reason,
    });
  }

  /**
   * Adjust stock level relatively for a product.
   */
  async adjustStock(productId: number, delta: number, reason?: string): Promise<BillbeeStockUpdateResponse> {
    return this.updateStock({
      ProductId: productId,
      DeltaQuantity: delta,
      Reason: reason,
    });
  }

  // ==================== Shipments ====================

  /**
   * Create a shipment for an order.
   */
  async createShipment(params: BillbeeCreateShipmentParams): Promise<void> {
    await this.post(`/orders/${params.OrderId}/shipment`, {
      ShippingId: params.ShippingId,
      ShippingProviderId: params.ShippingProviderId,
      ShippingProviderProductId: params.ShippingProviderProductId,
      Comment: params.Comment,
      ChangeStateToSend: params.ChangeStateToSend ?? true,
    });
  }

  /**
   * Get shipments for an order.
   */
  async getOrderShipments(orderId: number): Promise<unknown[]> {
    const response = await this.get<{ Data: unknown[] }>(`/orders/${orderId}/shipments`);
    return response.data.Data;
  }

  // ==================== Webhooks ====================

  /**
   * List all webhooks.
   */
  async getWebhooks(): Promise<BillbeeWebhook[]> {
    const response = await this.get<BillbeeWebhook[]>("/webhooks");
    return response.data;
  }

  /**
   * Create a webhook.
   */
  async createWebhook(webhook: BillbeeWebhook): Promise<BillbeeWebhook> {
    const response = await this.post<BillbeeWebhook>("/webhooks", webhook);
    return response.data;
  }

  /**
   * Get a webhook by ID.
   */
  async getWebhook(webhookId: string): Promise<BillbeeWebhook> {
    const response = await this.get<BillbeeWebhook>(`/webhooks/${webhookId}`);
    return response.data;
  }

  /**
   * Update a webhook.
   */
  async updateWebhook(webhookId: string, webhook: Partial<BillbeeWebhook>): Promise<BillbeeWebhook> {
    const response = await this.put<BillbeeWebhook>(`/webhooks/${webhookId}`, webhook);
    return response.data;
  }

  /**
   * Delete a webhook.
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.delete(`/webhooks/${webhookId}`);
  }

  // ==================== Connection Test ====================

  async testConnection(): Promise<boolean> {
    try {
      await this.getOrders({ page: 1, pageSize: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
