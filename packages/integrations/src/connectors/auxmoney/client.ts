import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  AuxmoneyClientConfig,
  AuxmoneyCreditApplication,
  AuxmoneyCreateCreditApplicationRequest,
  AuxmoneyReceivable,
  AuxmoneySubmitReceivableRequest,
  AuxmoneyPortfolioSummary,
  AuxmoneyPagedResponse,
  AuxmoneyPaginationParams,
} from "./types.js";

const AUXMONEY_BASE_URL = "https://api.auxmoney.com/v1";

/**
 * auxmoney Business API client.
 *
 * German fintech platform for business credits and receivables financing.
 *
 * Uses API key authentication via Authorization Bearer header
 * with partner ID sent in X-Partner-Id header.
 */
export class AuxmoneyClient extends BaseIntegrationClient {
  constructor(config: AuxmoneyClientConfig) {
    super({
      baseUrl: AUXMONEY_BASE_URL,
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
      defaultHeaders: {
        "X-Partner-Id": config.partnerId,
      },
    });
  }

  // ==================== Credit Applications ====================

  /** List credit applications. */
  async listCreditApplications(
    pagination?: AuxmoneyPaginationParams
  ): Promise<ApiResponse<AuxmoneyPagedResponse<AuxmoneyCreditApplication>>> {
    return this.get<AuxmoneyPagedResponse<AuxmoneyCreditApplication>>(
      "/credits",
      this.paginationParams(pagination)
    );
  }

  /** Get a credit application by ID. */
  async getCreditApplication(
    applicationId: string
  ): Promise<ApiResponse<AuxmoneyCreditApplication>> {
    return this.get<AuxmoneyCreditApplication>(`/credits/${applicationId}`);
  }

  /** Create a new credit application. */
  async createCreditApplication(
    data: AuxmoneyCreateCreditApplicationRequest
  ): Promise<ApiResponse<AuxmoneyCreditApplication>> {
    return this.post<AuxmoneyCreditApplication>("/credits", data);
  }

  /** Submit a draft credit application for review. */
  async submitCreditApplication(
    applicationId: string
  ): Promise<ApiResponse<AuxmoneyCreditApplication>> {
    return this.post<AuxmoneyCreditApplication>(
      `/credits/${applicationId}/submit`
    );
  }

  /** Accept a credit offer. */
  async acceptCreditOffer(
    applicationId: string
  ): Promise<ApiResponse<AuxmoneyCreditApplication>> {
    return this.post<AuxmoneyCreditApplication>(
      `/credits/${applicationId}/accept`
    );
  }

  /** Withdraw a credit application. */
  async withdrawCreditApplication(
    applicationId: string
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/credits/${applicationId}/withdraw`);
  }

  // ==================== Receivables Financing ====================

  /** List receivables. */
  async listReceivables(
    pagination?: AuxmoneyPaginationParams
  ): Promise<ApiResponse<AuxmoneyPagedResponse<AuxmoneyReceivable>>> {
    return this.get<AuxmoneyPagedResponse<AuxmoneyReceivable>>(
      "/receivables",
      this.paginationParams(pagination)
    );
  }

  /** Get a receivable by ID. */
  async getReceivable(
    receivableId: string
  ): Promise<ApiResponse<AuxmoneyReceivable>> {
    return this.get<AuxmoneyReceivable>(`/receivables/${receivableId}`);
  }

  /** Submit a receivable for financing. */
  async submitReceivable(
    data: AuxmoneySubmitReceivableRequest
  ): Promise<ApiResponse<AuxmoneyReceivable>> {
    return this.post<AuxmoneyReceivable>("/receivables", data);
  }

  // ==================== Portfolio ====================

  /** Get portfolio summary. */
  async getPortfolioSummary(): Promise<ApiResponse<AuxmoneyPortfolioSummary>> {
    return this.get<AuxmoneyPortfolioSummary>("/portfolio/summary");
  }

  // ==================== Connection Test ====================

  /** Verify credentials by calling the account endpoint. */
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
    params?: AuxmoneyPaginationParams
  ): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page != null) result.page = String(params.page);
    if (params?.perPage != null) result.per_page = String(params.perPage);
    if (params?.sortBy) result.sort_by = params.sortBy;
    if (params?.sortOrder) result.sort_order = params.sortOrder;
    return result;
  }
}
