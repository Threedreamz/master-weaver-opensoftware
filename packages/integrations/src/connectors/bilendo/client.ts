import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  BilendoClientConfig,
  BilendoCustomer,
  BilendoCreateCustomerRequest,
  BilendoUpdateCustomerRequest,
  BilendoInvoice,
  BilendoCreateInvoiceRequest,
  BilendoDunningWorkflow,
  BilendoDunningAction,
  BilendoPayment,
  BilendoRecordPaymentRequest,
  BilendoCustomerRiskReport,
  BilendoPagedResponse,
  BilendoPaginationParams,
} from "./types.js";

const BILENDO_BASE_URL = "https://api.bilendo.de/v1";

/**
 * Bilendo API client.
 *
 * AR automation platform providing dunning workflow management,
 * payment tracking, and customer risk assessment.
 *
 * Uses API key authentication via Authorization Bearer header.
 */
export class BilendoClient extends BaseIntegrationClient {
  constructor(config: BilendoClientConfig) {
    super({
      baseUrl: BILENDO_BASE_URL,
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });
  }

  // ==================== Customers ====================

  /** List customers with pagination. */
  async listCustomers(
    pagination?: BilendoPaginationParams
  ): Promise<ApiResponse<BilendoPagedResponse<BilendoCustomer>>> {
    return this.get<BilendoPagedResponse<BilendoCustomer>>(
      "/customers",
      this.paginationParams(pagination)
    );
  }

  /** Get a customer by ID. */
  async getCustomer(customerId: string): Promise<ApiResponse<BilendoCustomer>> {
    return this.get<BilendoCustomer>(`/customers/${customerId}`);
  }

  /** Create a new customer. */
  async createCustomer(
    data: BilendoCreateCustomerRequest
  ): Promise<ApiResponse<BilendoCustomer>> {
    return this.post<BilendoCustomer>("/customers", data);
  }

  /** Update a customer. */
  async updateCustomer(
    customerId: string,
    data: BilendoUpdateCustomerRequest
  ): Promise<ApiResponse<BilendoCustomer>> {
    return this.patch<BilendoCustomer>(`/customers/${customerId}`, data);
  }

  /** Delete a customer. */
  async deleteCustomer(customerId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/customers/${customerId}`);
  }

  // ==================== Invoices ====================

  /** List invoices with optional filters. */
  async listInvoices(
    params?: BilendoPaginationParams & { customerId?: string; status?: string }
  ): Promise<ApiResponse<BilendoPagedResponse<BilendoInvoice>>> {
    const queryParams = this.paginationParams(params);
    if (params?.customerId) queryParams.customerId = params.customerId;
    if (params?.status) queryParams.status = params.status;

    return this.get<BilendoPagedResponse<BilendoInvoice>>("/invoices", queryParams);
  }

  /** Get an invoice by ID. */
  async getInvoice(invoiceId: string): Promise<ApiResponse<BilendoInvoice>> {
    return this.get<BilendoInvoice>(`/invoices/${invoiceId}`);
  }

  /** Create a new invoice. */
  async createInvoice(
    data: BilendoCreateInvoiceRequest
  ): Promise<ApiResponse<BilendoInvoice>> {
    return this.post<BilendoInvoice>("/invoices", data);
  }

  /** Mark an invoice as written off. */
  async writeOffInvoice(invoiceId: string): Promise<ApiResponse<BilendoInvoice>> {
    return this.post<BilendoInvoice>(`/invoices/${invoiceId}/write-off`);
  }

  // ==================== Dunning Workflows ====================

  /** List dunning workflows. */
  async listDunningWorkflows(): Promise<ApiResponse<BilendoDunningWorkflow[]>> {
    return this.get<BilendoDunningWorkflow[]>("/dunning/workflows");
  }

  /** Get a dunning workflow by ID. */
  async getDunningWorkflow(
    workflowId: string
  ): Promise<ApiResponse<BilendoDunningWorkflow>> {
    return this.get<BilendoDunningWorkflow>(`/dunning/workflows/${workflowId}`);
  }

  /** List pending dunning actions. */
  async listDunningActions(
    params?: BilendoPaginationParams & { invoiceId?: string; status?: string }
  ): Promise<ApiResponse<BilendoPagedResponse<BilendoDunningAction>>> {
    const queryParams = this.paginationParams(params);
    if (params?.invoiceId) queryParams.invoiceId = params.invoiceId;
    if (params?.status) queryParams.status = params.status;

    return this.get<BilendoPagedResponse<BilendoDunningAction>>(
      "/dunning/actions",
      queryParams
    );
  }

  /** Skip a pending dunning action. */
  async skipDunningAction(
    actionId: string
  ): Promise<ApiResponse<BilendoDunningAction>> {
    return this.post<BilendoDunningAction>(`/dunning/actions/${actionId}/skip`);
  }

  // ==================== Payments ====================

  /** List payments. */
  async listPayments(
    params?: BilendoPaginationParams & { invoiceId?: string }
  ): Promise<ApiResponse<BilendoPagedResponse<BilendoPayment>>> {
    const queryParams = this.paginationParams(params);
    if (params?.invoiceId) queryParams.invoiceId = params.invoiceId;

    return this.get<BilendoPagedResponse<BilendoPayment>>("/payments", queryParams);
  }

  /** Record a payment. */
  async recordPayment(
    data: BilendoRecordPaymentRequest
  ): Promise<ApiResponse<BilendoPayment>> {
    return this.post<BilendoPayment>("/payments", data);
  }

  // ==================== Customer Risk ====================

  /** Get the risk report for a customer. */
  async getCustomerRiskReport(
    customerId: string
  ): Promise<ApiResponse<BilendoCustomerRiskReport>> {
    return this.get<BilendoCustomerRiskReport>(`/customers/${customerId}/risk`);
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching account info. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get<{ id: string }>("/account");
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // ==================== Private Helpers ====================

  private paginationParams(
    params?: BilendoPaginationParams
  ): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page != null) result.page = String(params.page);
    if (params?.perPage != null) result.per_page = String(params.perPage);
    if (params?.sortBy) result.sort_by = params.sortBy;
    if (params?.sortOrder) result.sort_order = params.sortOrder;
    return result;
  }
}
