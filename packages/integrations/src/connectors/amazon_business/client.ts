import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  AmazonBusinessClientConfig,
  AmazonBusinessPurchaseOrder,
  AmazonBusinessOrderListParams,
  AmazonBusinessInvoice,
  AmazonBusinessInvoiceListParams,
  AmazonBusinessSpendingReport,
  AmazonBusinessCreateReportRequest,
  AmazonBusinessGroup,
  AmazonBusinessUser,
  AmazonBusinessPagedResponse,
} from "./types.js";

const AMAZON_BUSINESS_BASE_URL = "https://business-api.amazon.de/api/v1";

/**
 * Amazon Business API client.
 *
 * Manages business purchase orders, invoices, and spending reports.
 *
 * Uses OAuth2 authentication via Amazon access token.
 */
export class AmazonBusinessClient extends BaseIntegrationClient {
  private readonly marketplaceId: string;

  constructor(config: AmazonBusinessClientConfig) {
    super({
      baseUrl: AMAZON_BUSINESS_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });
    this.marketplaceId = config.marketplaceId ?? "A1PA6795UKMFR9"; // DE marketplace
  }

  // ==================== Purchase Orders ====================

  /** List purchase orders with optional filters. */
  async listPurchaseOrders(
    params?: AmazonBusinessOrderListParams
  ): Promise<ApiResponse<AmazonBusinessPagedResponse<AmazonBusinessPurchaseOrder>>> {
    const queryParams: Record<string, string> = {
      marketplaceId: this.marketplaceId,
    };
    if (params?.status) queryParams.status = params.status;
    if (params?.fromDate) queryParams.fromDate = params.fromDate;
    if (params?.toDate) queryParams.toDate = params.toDate;
    if (params?.buyerId) queryParams.buyerId = params.buyerId;
    if (params?.costCenter) queryParams.costCenter = params.costCenter;
    if (params?.department) queryParams.department = params.department;
    if (params?.page != null) queryParams.page = String(params.page);
    if (params?.pageSize != null) queryParams.pageSize = String(params.pageSize);

    return this.get<AmazonBusinessPagedResponse<AmazonBusinessPurchaseOrder>>(
      "/purchase-orders",
      queryParams
    );
  }

  /** Get a purchase order by ID. */
  async getPurchaseOrder(
    orderId: string
  ): Promise<ApiResponse<AmazonBusinessPurchaseOrder>> {
    return this.get<AmazonBusinessPurchaseOrder>(
      `/purchase-orders/${orderId}`,
      { marketplaceId: this.marketplaceId }
    );
  }

  // ==================== Invoices ====================

  /** List invoices with optional filters. */
  async listInvoices(
    params?: AmazonBusinessInvoiceListParams
  ): Promise<ApiResponse<AmazonBusinessPagedResponse<AmazonBusinessInvoice>>> {
    const queryParams: Record<string, string> = {
      marketplaceId: this.marketplaceId,
    };
    if (params?.purchaseOrderId) queryParams.purchaseOrderId = params.purchaseOrderId;
    if (params?.status) queryParams.status = params.status;
    if (params?.fromDate) queryParams.fromDate = params.fromDate;
    if (params?.toDate) queryParams.toDate = params.toDate;
    if (params?.page != null) queryParams.page = String(params.page);
    if (params?.pageSize != null) queryParams.pageSize = String(params.pageSize);

    return this.get<AmazonBusinessPagedResponse<AmazonBusinessInvoice>>(
      "/invoices",
      queryParams
    );
  }

  /** Get an invoice by ID. */
  async getInvoice(
    invoiceId: string
  ): Promise<ApiResponse<AmazonBusinessInvoice>> {
    return this.get<AmazonBusinessInvoice>(
      `/invoices/${invoiceId}`,
      { marketplaceId: this.marketplaceId }
    );
  }

  // ==================== Spending Reports ====================

  /** Create a spending report. */
  async createSpendingReport(
    data: AmazonBusinessCreateReportRequest
  ): Promise<ApiResponse<AmazonBusinessSpendingReport>> {
    return this.post<AmazonBusinessSpendingReport>("/reports/spending", data);
  }

  /** Get a spending report by ID. */
  async getSpendingReport(
    reportId: string
  ): Promise<ApiResponse<AmazonBusinessSpendingReport>> {
    return this.get<AmazonBusinessSpendingReport>(`/reports/spending/${reportId}`);
  }

  /** List spending reports. */
  async listSpendingReports(
    params?: { page?: number; pageSize?: number }
  ): Promise<ApiResponse<AmazonBusinessPagedResponse<AmazonBusinessSpendingReport>>> {
    const queryParams: Record<string, string> = {};
    if (params?.page != null) queryParams.page = String(params.page);
    if (params?.pageSize != null) queryParams.pageSize = String(params.pageSize);

    return this.get<AmazonBusinessPagedResponse<AmazonBusinessSpendingReport>>(
      "/reports/spending",
      queryParams
    );
  }

  // ==================== Groups ====================

  /** List groups (departments, cost centers). */
  async listGroups(
    params?: { type?: string }
  ): Promise<ApiResponse<AmazonBusinessGroup[]>> {
    const queryParams: Record<string, string> = {};
    if (params?.type) queryParams.type = params.type;

    return this.get<AmazonBusinessGroup[]>("/groups", queryParams);
  }

  // ==================== Users ====================

  /** List business users. */
  async listUsers(
    params?: { isActive?: boolean; page?: number; pageSize?: number }
  ): Promise<ApiResponse<AmazonBusinessPagedResponse<AmazonBusinessUser>>> {
    const queryParams: Record<string, string> = {};
    if (params?.isActive != null) queryParams.isActive = String(params.isActive);
    if (params?.page != null) queryParams.page = String(params.page);
    if (params?.pageSize != null) queryParams.pageSize = String(params.pageSize);

    return this.get<AmazonBusinessPagedResponse<AmazonBusinessUser>>(
      "/users",
      queryParams
    );
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching account info. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get<{ accountId: string }>(
        "/account",
        { marketplaceId: this.marketplaceId }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
