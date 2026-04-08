// ==================== Afterbuy API Client ====================

import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  AfterbuyClientConfig,
  AfterbuyProduct,
  AfterbuyProductsParams,
  AfterbuyProductsResponse,
  AfterbuyOrder,
  AfterbuyOrdersParams,
  AfterbuyOrdersResponse,
  AfterbuyStockUpdate,
  AfterbuyStockUpdateResponse,
} from "./types.js";

const AFTERBUY_API_URL = "https://api.afterbuy.de/afterbuy/ShopInterfaceUTF8.aspx";
const AFTERBUY_SANDBOX_URL = "https://api.afterbuy.de/afterbuy/ShopInterfaceUTF8.aspx";

/**
 * Afterbuy API client.
 *
 * Afterbuy uses a hybrid XML/JSON REST API. This client wraps
 * the JSON-based Shop Interface endpoints. For legacy XML endpoints,
 * the raw request method can be used.
 */
export class AfterbuyClient extends BaseIntegrationClient {
  private readonly partnerId: string;
  private readonly accountToken: string;
  private readonly userId: string;

  constructor(config: AfterbuyClientConfig) {
    super({
      baseUrl: config.sandbox ? AFTERBUY_SANDBOX_URL : AFTERBUY_API_URL,
      authType: "custom",
      credentials: {
        partnerId: config.partnerId,
        accountToken: config.accountToken,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });

    this.partnerId = config.partnerId;
    this.accountToken = config.accountToken;
    this.userId = config.userId ?? "";
  }

  /**
   * Build the authentication parameters included in every request.
   */
  private authParams(): Record<string, string> {
    return {
      PartnerID: this.partnerId,
      AccountToken: this.accountToken,
      ...(this.userId ? { UserID: this.userId } : {}),
    };
  }

  // ==================== Products ====================

  /**
   * List products with optional filters.
   */
  async getProducts(params?: AfterbuyProductsParams): Promise<AfterbuyProductsResponse> {
    const queryParams: Record<string, string> = {
      ...this.authParams(),
      Action: "GetShopProducts",
      DetailLevel: "12",
    };

    if (params?.maxProducts) queryParams.MaxShopItems = String(params.maxProducts);
    if (params?.lastModifiedFrom) queryParams.DateFilter = params.lastModifiedFrom;
    if (params?.lastModifiedTo) queryParams.DateFilterEnd = params.lastModifiedTo;
    if (params?.page) queryParams.PageNumber = String(params.page);
    if (params?.onlyActiveProducts) queryParams.SuppressBaseProductRelatedData = "0";

    if (params?.productIds?.length) {
      queryParams.ProductID = params.productIds.join(",");
    }
    if (params?.anrs?.length) {
      queryParams.Anr = params.anrs.join(",");
    }

    const response = await this.get<AfterbuyProductsResponse>("", queryParams);
    return response.data;
  }

  /**
   * Get a single product by ID.
   */
  async getProduct(productId: number): Promise<AfterbuyProduct> {
    const result = await this.getProducts({ productIds: [productId], maxProducts: 1 });
    if (!result.products.length) {
      throw new Error(`Afterbuy product ${productId} not found`);
    }
    return result.products[0];
  }

  /**
   * Get a product by Afterbuy article number (ANR).
   */
  async getProductByAnr(anr: number): Promise<AfterbuyProduct> {
    const result = await this.getProducts({ anrs: [anr], maxProducts: 1 });
    if (!result.products.length) {
      throw new Error(`Afterbuy product with ANR ${anr} not found`);
    }
    return result.products[0];
  }

  /**
   * Update a product.
   */
  async updateProduct(productId: number, updates: Partial<AfterbuyProduct>): Promise<AfterbuyProduct> {
    const body = {
      ...this.authParams(),
      Action: "UpdateShopProducts",
      Products: [{ ProductID: productId, ...updates }],
    };

    const response = await this.post<{ Products: AfterbuyProduct[] }>("", body);
    return response.data.Products[0];
  }

  // ==================== Orders ====================

  /**
   * List orders with optional filters.
   */
  async getOrders(params?: AfterbuyOrdersParams): Promise<AfterbuyOrdersResponse> {
    const queryParams: Record<string, string> = {
      ...this.authParams(),
      Action: "GetSoldItems",
      DetailLevel: "4",
    };

    if (params?.maxOrders) queryParams.MaxSoldItems = String(params.maxOrders);
    if (params?.dateFrom) queryParams.DateFilter = params.dateFrom;
    if (params?.dateTo) queryParams.DateFilterEnd = params.dateTo;
    if (params?.page) queryParams.PageNumber = String(params.page);

    if (params?.orderIds?.length) {
      queryParams.OrderID = params.orderIds.join(",");
    }

    const response = await this.get<AfterbuyOrdersResponse>("", queryParams);
    return response.data;
  }

  /**
   * Get a single order by ID.
   */
  async getOrder(orderId: number): Promise<AfterbuyOrder> {
    const result = await this.getOrders({ orderIds: [orderId], maxOrders: 1 });
    if (!result.orders.length) {
      throw new Error(`Afterbuy order ${orderId} not found`);
    }
    return result.orders[0];
  }

  /**
   * Update order status and/or tracking information.
   */
  async updateOrder(
    orderId: number,
    updates: {
      status?: string;
      trackingNumber?: string;
      shippingMethod?: string;
      shippingDate?: string;
      invoiceNumber?: string;
    }
  ): Promise<void> {
    await this.post("", {
      ...this.authParams(),
      Action: "UpdateSoldItems",
      Orders: [{
        OrderID: orderId,
        ...updates,
      }],
    });
  }

  // ==================== Stock ====================

  /**
   * Update stock quantity for one or more products.
   */
  async updateStock(updates: AfterbuyStockUpdate[]): Promise<AfterbuyStockUpdateResponse[]> {
    const body = {
      ...this.authParams(),
      Action: "UpdateShopProducts",
      Products: updates.map((u) => ({
        ...(u.productId ? { ProductID: u.productId } : {}),
        ...(u.anr ? { Anr: u.anr } : {}),
        ...(u.quantity !== undefined ? { Quantity: u.quantity } : {}),
        ...(u.quantityAdjustment !== undefined ? { AuctionQuantity: u.quantityAdjustment } : {}),
      })),
    };

    const response = await this.post<{ Results: AfterbuyStockUpdateResponse[] }>("", body);
    return response.data.Results;
  }

  /**
   * Set absolute stock quantity for a single product.
   */
  async setStock(productId: number, quantity: number): Promise<AfterbuyStockUpdateResponse> {
    const results = await this.updateStock([{ productId, quantity }]);
    return results[0];
  }

  /**
   * Adjust stock quantity relatively for a single product.
   */
  async adjustStock(productId: number, adjustment: number): Promise<AfterbuyStockUpdateResponse> {
    const results = await this.updateStock([{ productId, quantityAdjustment: adjustment }]);
    return results[0];
  }

  // ==================== Connection Test ====================

  async testConnection(): Promise<boolean> {
    try {
      await this.getProducts({ maxProducts: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
