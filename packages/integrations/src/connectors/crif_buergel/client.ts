import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  CrifBuergelClientConfig,
  CrifCompanySearchParams,
  CrifCompanySearchResponse,
  CrifCreditReport,
  CrifCreditAssessment,
  CrifDebtor,
  CrifCreateDebtorRequest,
  CrifUpdateDebtorRequest,
  CrifDebtorAction,
  CrifPagedResponse,
  CrifPaginationParams,
} from "./types.js";

const CRIF_BASE_URL = "https://api.crifbuergel.de/v1";

/**
 * CRIF Bürgel API client.
 *
 * German credit information provider offering business credit reports,
 * credit assessments, and debtor management services.
 *
 * Uses API key authentication via X-Api-Key header.
 */
export class CrifBuergelClient extends BaseIntegrationClient {
  constructor(config: CrifBuergelClientConfig) {
    super({
      baseUrl: CRIF_BASE_URL,
      authType: "api_key",
      credentials: {
        apiKey: config.apiKey,
        headerName: "X-Api-Key",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
      defaultHeaders: {
        "X-Username": config.username,
      },
    });
  }

  // ==================== Company Search ====================

  /** Search for companies in the CRIF Bürgel database. */
  async searchCompanies(
    params: CrifCompanySearchParams
  ): Promise<ApiResponse<CrifCompanySearchResponse>> {
    const queryParams: Record<string, string> = {};
    if (params.name) queryParams.name = params.name;
    if (params.city) queryParams.city = params.city;
    if (params.postalCode) queryParams.postalCode = params.postalCode;
    if (params.country) queryParams.country = params.country;
    if (params.registerNumber) queryParams.registerNumber = params.registerNumber;
    if (params.vatId) queryParams.vatId = params.vatId;
    if (params.limit != null) queryParams.limit = String(params.limit);

    return this.get<CrifCompanySearchResponse>("/companies/search", queryParams);
  }

  // ==================== Credit Reports ====================

  /** Get a full credit report for a company. */
  async getCreditReport(
    crifId: string
  ): Promise<ApiResponse<CrifCreditReport>> {
    return this.get<CrifCreditReport>(`/companies/${crifId}/report`);
  }

  /** Get only the credit assessment (score) for a company. */
  async getCreditAssessment(
    crifId: string
  ): Promise<ApiResponse<CrifCreditAssessment>> {
    return this.get<CrifCreditAssessment>(`/companies/${crifId}/assessment`);
  }

  // ==================== Debtor Management ====================

  /** List debtors with optional pagination. */
  async listDebtors(
    pagination?: CrifPaginationParams
  ): Promise<ApiResponse<CrifPagedResponse<CrifDebtor>>> {
    const params: Record<string, string> = {};
    if (pagination?.page != null) params.page = String(pagination.page);
    if (pagination?.limit != null) params.limit = String(pagination.limit);

    return this.get<CrifPagedResponse<CrifDebtor>>("/debtors", params);
  }

  /** Get a debtor by ID. */
  async getDebtor(debtorId: string): Promise<ApiResponse<CrifDebtor>> {
    return this.get<CrifDebtor>(`/debtors/${debtorId}`);
  }

  /** Create a new debtor record. */
  async createDebtor(
    data: CrifCreateDebtorRequest
  ): Promise<ApiResponse<CrifDebtor>> {
    return this.post<CrifDebtor>("/debtors", data);
  }

  /** Update a debtor record. */
  async updateDebtor(
    debtorId: string,
    data: CrifUpdateDebtorRequest
  ): Promise<ApiResponse<CrifDebtor>> {
    return this.patch<CrifDebtor>(`/debtors/${debtorId}`, data);
  }

  /** Delete a debtor record. */
  async deleteDebtor(debtorId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/debtors/${debtorId}`);
  }

  /** List actions for a debtor. */
  async listDebtorActions(
    debtorId: string
  ): Promise<ApiResponse<CrifDebtorAction[]>> {
    return this.get<CrifDebtorAction[]>(`/debtors/${debtorId}/actions`);
  }

  /** Record a new action on a debtor. */
  async createDebtorAction(
    debtorId: string,
    data: Omit<CrifDebtorAction, "actionId" | "debtorId" | "performedAt">
  ): Promise<ApiResponse<CrifDebtorAction>> {
    return this.post<CrifDebtorAction>(`/debtors/${debtorId}/actions`, data);
  }

  // ==================== Connection Test ====================

  /** Verify credentials by calling the status endpoint. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get<{ status: string }>("/status");
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
