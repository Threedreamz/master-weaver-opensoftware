import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  VatifyClientConfig,
  VatifyValidationRequest,
  VatifyValidationResponse,
  VatifyBulkValidationRequest,
  VatifyBulkValidationResponse,
  VatifyMonitoringSubscription,
  VatifyCreateMonitoringRequest,
} from "./types.js";

const VATIFY_BASE_URL = "https://api.vatify.eu";

/**
 * Vatify API client for enhanced EU VAT validation, monitoring,
 * and bulk validation.
 *
 * Provides richer validation data than the free VIES API, including
 * company details, continuous monitoring with webhook notifications,
 * and batch processing of VAT numbers.
 *
 * Uses API key authentication. Supports webhooks for async results.
 */
export class VatifyClient extends BaseIntegrationClient {
  constructor(config: VatifyClientConfig) {
    super({
      baseUrl: VATIFY_BASE_URL,
      authType: "api_key",
      credentials: {
        apiKey: config.apiKey,
        headerName: "X-Api-Key",
      },
      timeout: config.timeout ?? 15_000,
      rateLimit: { requestsPerMinute: 120 },
    });
  }

  // ==================== Single Validation ====================

  /** Validate a single EU VAT number. */
  async validateVatNumber(
    request: VatifyValidationRequest
  ): Promise<ApiResponse<VatifyValidationResponse>> {
    return this.post<VatifyValidationResponse>("/v1/validate", request);
  }

  /** Quick validation returning only valid/invalid status. */
  async checkVatNumber(vatNumber: string): Promise<ApiResponse<{ valid: boolean }>> {
    return this.get<{ valid: boolean }>("/v1/check", { vat_number: vatNumber });
  }

  // ==================== Bulk Validation ====================

  /** Submit a batch of VAT numbers for validation. */
  async bulkValidate(
    request: VatifyBulkValidationRequest
  ): Promise<ApiResponse<VatifyBulkValidationResponse>> {
    return this.post<VatifyBulkValidationResponse>("/v1/validate/bulk", request);
  }

  /** Get the status/results of a bulk validation batch. */
  async getBulkValidationStatus(
    batchId: string
  ): Promise<ApiResponse<VatifyBulkValidationResponse>> {
    return this.get<VatifyBulkValidationResponse>(`/v1/validate/bulk/${batchId}`);
  }

  // ==================== Monitoring ====================

  /** Create a monitoring subscription for a VAT number. */
  async createMonitoring(
    request: VatifyCreateMonitoringRequest
  ): Promise<ApiResponse<VatifyMonitoringSubscription>> {
    return this.post<VatifyMonitoringSubscription>("/v1/monitoring", request);
  }

  /** List all active monitoring subscriptions. */
  async listMonitoring(): Promise<ApiResponse<VatifyMonitoringSubscription[]>> {
    return this.get<VatifyMonitoringSubscription[]>("/v1/monitoring");
  }

  /** Get a specific monitoring subscription. */
  async getMonitoring(
    subscriptionId: string
  ): Promise<ApiResponse<VatifyMonitoringSubscription>> {
    return this.get<VatifyMonitoringSubscription>(
      `/v1/monitoring/${subscriptionId}`
    );
  }

  /** Update a monitoring subscription. */
  async updateMonitoring(
    subscriptionId: string,
    update: Partial<VatifyCreateMonitoringRequest>
  ): Promise<ApiResponse<VatifyMonitoringSubscription>> {
    return this.patch<VatifyMonitoringSubscription>(
      `/v1/monitoring/${subscriptionId}`,
      update
    );
  }

  /** Delete a monitoring subscription. */
  async deleteMonitoring(subscriptionId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/v1/monitoring/${subscriptionId}`);
  }

  // ==================== Connection Test ====================

  /** Test the API connection. */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/v1/health");
      return true;
    } catch {
      return false;
    }
  }
}
