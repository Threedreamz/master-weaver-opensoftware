import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  CreditreformClientConfig,
  CreditreformCompanySearchParams,
  CreditreformCompanySearchResponse,
  CreditreformCreditReport,
  CreditreformCreditScore,
  CreditreformMonitoringRequest,
  CreditreformMonitoringSubscription,
  CreditreformMonitoringAlert,
  CreditreformPagedResponse,
  CreditreformPaginationParams,
} from "./types.js";

const CREDITREFORM_BASE_URL = "https://api.creditreform.de/v1";

/**
 * Creditreform API client.
 *
 * German credit agency providing company search, credit reports,
 * credit scoring, and monitoring services.
 *
 * Uses API key authentication via X-Api-Key header.
 */
export class CreditreformClient extends BaseIntegrationClient {
  private readonly customerId: string;

  constructor(config: CreditreformClientConfig) {
    super({
      baseUrl: CREDITREFORM_BASE_URL,
      authType: "api_key",
      credentials: {
        apiKey: config.apiKey,
        headerName: "X-Api-Key",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
    });
    this.customerId = config.customerId;
  }

  // ==================== Company Search ====================

  /** Search for companies by name, location, or register number. */
  async searchCompanies(
    params: CreditreformCompanySearchParams
  ): Promise<ApiResponse<CreditreformCompanySearchResponse>> {
    const queryParams: Record<string, string> = {
      customerId: this.customerId,
    };
    if (params.name) queryParams.name = params.name;
    if (params.location) queryParams.location = params.location;
    if (params.country) queryParams.country = params.country;
    if (params.creditreformId) queryParams.creditreformId = params.creditreformId;
    if (params.registerNumber) queryParams.registerNumber = params.registerNumber;
    if (params.maxResults != null) queryParams.maxResults = String(params.maxResults);

    return this.get<CreditreformCompanySearchResponse>("/companies/search", queryParams);
  }

  // ==================== Credit Reports ====================

  /** Get a full credit report for a company. */
  async getCreditReport(
    creditreformId: string
  ): Promise<ApiResponse<CreditreformCreditReport>> {
    return this.get<CreditreformCreditReport>(
      `/companies/${creditreformId}/report`,
      { customerId: this.customerId }
    );
  }

  /** Get the credit score for a company. */
  async getCreditScore(
    creditreformId: string
  ): Promise<ApiResponse<CreditreformCreditScore>> {
    return this.get<CreditreformCreditScore>(
      `/companies/${creditreformId}/score`,
      { customerId: this.customerId }
    );
  }

  // ==================== Monitoring ====================

  /** Create a monitoring subscription for a company. */
  async createMonitoring(
    data: CreditreformMonitoringRequest
  ): Promise<ApiResponse<CreditreformMonitoringSubscription>> {
    return this.post<CreditreformMonitoringSubscription>(
      "/monitoring/subscriptions",
      { ...data, customerId: this.customerId }
    );
  }

  /** List active monitoring subscriptions. */
  async listMonitoringSubscriptions(
    pagination?: CreditreformPaginationParams
  ): Promise<ApiResponse<CreditreformPagedResponse<CreditreformMonitoringSubscription>>> {
    const params: Record<string, string> = { customerId: this.customerId };
    if (pagination?.page != null) params.page = String(pagination.page);
    if (pagination?.pageSize != null) params.pageSize = String(pagination.pageSize);

    return this.get<CreditreformPagedResponse<CreditreformMonitoringSubscription>>(
      "/monitoring/subscriptions",
      params
    );
  }

  /** Cancel a monitoring subscription. */
  async cancelMonitoring(
    subscriptionId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/monitoring/subscriptions/${subscriptionId}`);
  }

  /** List monitoring alerts. */
  async listAlerts(
    pagination?: CreditreformPaginationParams
  ): Promise<ApiResponse<CreditreformPagedResponse<CreditreformMonitoringAlert>>> {
    const params: Record<string, string> = { customerId: this.customerId };
    if (pagination?.page != null) params.page = String(pagination.page);
    if (pagination?.pageSize != null) params.pageSize = String(pagination.pageSize);

    return this.get<CreditreformPagedResponse<CreditreformMonitoringAlert>>(
      "/monitoring/alerts",
      params
    );
  }

  /** Acknowledge a monitoring alert. */
  async acknowledgeAlert(
    alertId: string
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/monitoring/alerts/${alertId}/acknowledge`);
  }

  // ==================== Connection Test ====================

  /** Verify credentials by performing a basic API call. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get<{ status: string }>(
        "/status",
        { customerId: this.customerId }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
