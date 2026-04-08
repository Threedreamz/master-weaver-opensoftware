import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  ConsentmanagerClientConfig,
  CmpConfiguration,
  ConsentLogEntry,
  ConsentLogParams,
  ConsentReport,
  ConsentReportParams,
  ConsentListResponse,
  ConsentWebhook,
  CreateWebhookParams,
  ConsentWebhookPayload,
} from "./types.js";

const CONSENTMANAGER_BASE_URL = "https://api.consentmanager.net/v1";

/**
 * Consentmanager API client for managing consent management platform settings.
 *
 * Provides access to CMP configurations, consent logs, statistics reports,
 * and webhook management. Used for GDPR/ePrivacy compliance.
 *
 * API key authentication. Supports webhooks for real-time consent events.
 *
 * @see https://www.consentmanager.net/
 */
export class ConsentmanagerClient extends BaseIntegrationClient {
  private cmpId: string;

  constructor(config: ConsentmanagerClientConfig) {
    super({
      baseUrl: config.baseUrl ?? CONSENTMANAGER_BASE_URL,
      authType: "api_key",
      credentials: {
        apiKey: config.apiKey,
        headerName: "X-CM-API-Key",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });

    this.cmpId = config.cmpId;
  }

  // ==================== CMP Settings ====================

  /**
   * Get the current CMP configuration for the account.
   */
  async getCmpConfiguration(): Promise<ApiResponse<CmpConfiguration>> {
    return this.get<CmpConfiguration>(`/cmps/${this.cmpId}`);
  }

  /**
   * List all CMP configurations in the account.
   */
  async listCmpConfigurations(): Promise<ApiResponse<CmpConfiguration[]>> {
    return this.get<CmpConfiguration[]>("/cmps");
  }

  /**
   * Update CMP configuration settings.
   */
  async updateCmpConfiguration(
    updates: Partial<Pick<CmpConfiguration, "name" | "domains" | "languages" | "defaultLanguage" | "regulationMode" | "iabTcfEnabled" | "googleConsentModeEnabled">>
  ): Promise<ApiResponse<CmpConfiguration>> {
    return this.put<CmpConfiguration>(`/cmps/${this.cmpId}`, updates);
  }

  /**
   * Publish the current CMP configuration (make it live).
   */
  async publishCmpConfiguration(): Promise<ApiResponse<CmpConfiguration>> {
    return this.post<CmpConfiguration>(`/cmps/${this.cmpId}/publish`, {});
  }

  // ==================== Purposes ====================

  /**
   * Add a purpose to the CMP configuration.
   */
  async addPurpose(
    purpose: {
      name: string;
      description: string;
      type: string;
      required?: boolean;
      defaultEnabled?: boolean;
    }
  ): Promise<ApiResponse<CmpConfiguration>> {
    return this.post<CmpConfiguration>(
      `/cmps/${this.cmpId}/purposes`,
      purpose
    );
  }

  /**
   * Update a purpose in the CMP configuration.
   */
  async updatePurpose(
    purposeId: string,
    updates: Partial<{ name: string; description: string; required: boolean; defaultEnabled: boolean }>
  ): Promise<ApiResponse<CmpConfiguration>> {
    return this.put<CmpConfiguration>(
      `/cmps/${this.cmpId}/purposes/${purposeId}`,
      updates
    );
  }

  /**
   * Remove a purpose from the CMP configuration.
   */
  async removePurpose(purposeId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/cmps/${this.cmpId}/purposes/${purposeId}`);
  }

  // ==================== Vendors ====================

  /**
   * Add a vendor to the CMP configuration.
   */
  async addVendor(
    vendor: {
      name: string;
      privacyPolicyUrl?: string;
      purposeIds: string[];
      cookies?: string[];
      retentionDays?: number;
    }
  ): Promise<ApiResponse<CmpConfiguration>> {
    return this.post<CmpConfiguration>(
      `/cmps/${this.cmpId}/vendors`,
      vendor
    );
  }

  /**
   * Remove a vendor from the CMP configuration.
   */
  async removeVendor(vendorId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/cmps/${this.cmpId}/vendors/${vendorId}`);
  }

  // ==================== Consent Logs ====================

  /**
   * Query consent log entries for audit purposes.
   *
   * Returns a paginated list of consent decisions made by visitors.
   */
  async getConsentLogs(
    params: ConsentLogParams = {}
  ): Promise<ApiResponse<ConsentListResponse<ConsentLogEntry>>> {
    const queryParams: Record<string, string> = {
      cmpId: this.cmpId,
    };

    if (params.domain) queryParams.domain = params.domain;
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params.dateTo) queryParams.dateTo = params.dateTo;
    if (params.visitorId) queryParams.visitorId = params.visitorId;
    if (params.country) queryParams.country = params.country;
    if (params.page != null) queryParams.page = String(params.page);
    if (params.pageSize != null) queryParams.pageSize = String(params.pageSize);

    return this.get<ConsentListResponse<ConsentLogEntry>>(
      "/consent-logs",
      queryParams
    );
  }

  /**
   * Get a specific consent log entry by ID.
   */
  async getConsentLogEntry(
    logId: string
  ): Promise<ApiResponse<ConsentLogEntry>> {
    return this.get<ConsentLogEntry>(`/consent-logs/${logId}`);
  }

  /**
   * Look up consent status for a specific visitor.
   *
   * @param visitorId - Pseudonymized visitor identifier
   * @param domain - Domain to check consent for
   */
  async getVisitorConsent(
    visitorId: string,
    domain: string
  ): Promise<ApiResponse<ConsentLogEntry | null>> {
    return this.get<ConsentLogEntry | null>("/consent-logs/lookup", {
      visitorId,
      domain,
      cmpId: this.cmpId,
    });
  }

  // ==================== Reports ====================

  /**
   * Generate a consent statistics report for a domain and date range.
   */
  async getReport(
    params: ConsentReportParams
  ): Promise<ApiResponse<ConsentReport>> {
    const queryParams: Record<string, string> = {
      cmpId: this.cmpId,
      domain: params.domain,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    };

    if (params.granularity) {
      queryParams.granularity = params.granularity;
    }
    if (params.includeTimeSeries != null) {
      queryParams.includeTimeSeries = String(params.includeTimeSeries);
    }

    return this.get<ConsentReport>("/reports/consent", queryParams);
  }

  /**
   * Get the overall acceptance rate across all domains.
   */
  async getAcceptanceRate(
    dateFrom: string,
    dateTo: string
  ): Promise<ApiResponse<{ acceptanceRate: number; totalVisitors: number }>> {
    return this.get<{ acceptanceRate: number; totalVisitors: number }>(
      "/reports/acceptance-rate",
      {
        cmpId: this.cmpId,
        dateFrom,
        dateTo,
      }
    );
  }

  // ==================== Webhooks ====================

  /**
   * List all registered webhooks.
   */
  async listWebhooks(): Promise<ApiResponse<ConsentWebhook[]>> {
    return this.get<ConsentWebhook[]>(`/cmps/${this.cmpId}/webhooks`);
  }

  /**
   * Create a new webhook subscription.
   */
  async createWebhook(
    params: CreateWebhookParams
  ): Promise<ApiResponse<ConsentWebhook>> {
    return this.post<ConsentWebhook>(
      `/cmps/${this.cmpId}/webhooks`,
      params
    );
  }

  /**
   * Update an existing webhook.
   */
  async updateWebhook(
    webhookId: string,
    updates: Partial<CreateWebhookParams & { active: boolean }>
  ): Promise<ApiResponse<ConsentWebhook>> {
    return this.put<ConsentWebhook>(
      `/cmps/${this.cmpId}/webhooks/${webhookId}`,
      updates
    );
  }

  /**
   * Delete a webhook.
   */
  async deleteWebhook(webhookId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/cmps/${this.cmpId}/webhooks/${webhookId}`);
  }

  /**
   * Test a webhook by sending a test event.
   */
  async testWebhook(webhookId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post<{ success: boolean }>(
      `/cmps/${this.cmpId}/webhooks/${webhookId}/test`,
      {}
    );
  }

  /**
   * Verify a webhook payload signature.
   *
   * @param payload - Raw request body
   * @param signature - Value of the X-CM-Signature header
   * @param secret - Webhook secret
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    // Consentmanager uses HMAC-SHA256 for webhook signatures
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Timing-safe comparison
    const { timingSafeEqual } = require("node:crypto") as typeof import("node:crypto");
    try {
      return timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    } catch {
      return false;
    }
  }

  /**
   * Parse a webhook payload into a typed event object.
   */
  static parseWebhookPayload(body: string): ConsentWebhookPayload {
    return JSON.parse(body) as ConsentWebhookPayload;
  }

  // ==================== Utilities ====================

  /**
   * Test API connectivity.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get("/health");
      return true;
    } catch {
      return false;
    }
  }
}
