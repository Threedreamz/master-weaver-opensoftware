import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  CreditshelfClientConfig,
  CreditshelfFinancingRequest,
  CreditshelfCreateFinancingRequest,
  CreditshelfLoan,
  CreditshelfPortfolioSummary,
  CreditshelfPagedResponse,
  CreditshelfPaginationParams,
} from "./types.js";

const CREDITSHELF_BASE_URL = "https://api.creditshelf.com/v1";

/**
 * creditshelf API client.
 *
 * German digital lending platform for business loans and financing.
 * Manages financing requests, loans, and portfolio overview.
 *
 * Uses API key authentication via Authorization Bearer header.
 */
export class CreditshelfClient extends BaseIntegrationClient {
  constructor(config: CreditshelfClientConfig) {
    super({
      baseUrl: CREDITSHELF_BASE_URL,
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });
  }

  // ==================== Financing Requests ====================

  /** List financing requests. */
  async listFinancingRequests(
    pagination?: CreditshelfPaginationParams
  ): Promise<ApiResponse<CreditshelfPagedResponse<CreditshelfFinancingRequest>>> {
    return this.get<CreditshelfPagedResponse<CreditshelfFinancingRequest>>(
      "/financing-requests",
      this.paginationParams(pagination)
    );
  }

  /** Get a financing request by ID. */
  async getFinancingRequest(
    requestId: string
  ): Promise<ApiResponse<CreditshelfFinancingRequest>> {
    return this.get<CreditshelfFinancingRequest>(
      `/financing-requests/${requestId}`
    );
  }

  /** Create a new financing request. */
  async createFinancingRequest(
    data: CreditshelfCreateFinancingRequest
  ): Promise<ApiResponse<CreditshelfFinancingRequest>> {
    return this.post<CreditshelfFinancingRequest>("/financing-requests", data);
  }

  /** Submit a draft financing request for review. */
  async submitFinancingRequest(
    requestId: string
  ): Promise<ApiResponse<CreditshelfFinancingRequest>> {
    return this.post<CreditshelfFinancingRequest>(
      `/financing-requests/${requestId}/submit`
    );
  }

  /** Accept a financing offer. */
  async acceptFinancingOffer(
    requestId: string
  ): Promise<ApiResponse<CreditshelfFinancingRequest>> {
    return this.post<CreditshelfFinancingRequest>(
      `/financing-requests/${requestId}/accept`
    );
  }

  /** Withdraw a financing request. */
  async withdrawFinancingRequest(
    requestId: string
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/financing-requests/${requestId}/withdraw`);
  }

  // ==================== Loans ====================

  /** List loans in the portfolio. */
  async listLoans(
    pagination?: CreditshelfPaginationParams
  ): Promise<ApiResponse<CreditshelfPagedResponse<CreditshelfLoan>>> {
    return this.get<CreditshelfPagedResponse<CreditshelfLoan>>(
      "/loans",
      this.paginationParams(pagination)
    );
  }

  /** Get a loan by ID. */
  async getLoan(loanId: string): Promise<ApiResponse<CreditshelfLoan>> {
    return this.get<CreditshelfLoan>(`/loans/${loanId}`);
  }

  // ==================== Portfolio ====================

  /** Get portfolio summary. */
  async getPortfolioSummary(): Promise<ApiResponse<CreditshelfPortfolioSummary>> {
    return this.get<CreditshelfPortfolioSummary>("/portfolio/summary");
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
    params?: CreditshelfPaginationParams
  ): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page != null) result.page = String(params.page);
    if (params?.perPage != null) result.per_page = String(params.perPage);
    if (params?.sortBy) result.sort_by = params.sortBy;
    if (params?.sortOrder) result.sort_order = params.sortOrder;
    return result;
  }
}
