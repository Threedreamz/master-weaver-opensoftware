import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SchufaClientConfig,
  SchufaCreditCheckRequest,
  SchufaCreditCheckResponse,
  SchufaScore,
  SchufaMonitoringRequest,
  SchufaMonitoringSubscription,
  SchufaMonitoringEvent,
} from "./types.js";

const SCHUFA_BASE_URL = "https://gateway.schufa.de/api/v1";

/**
 * SCHUFA B2B API client.
 *
 * German credit bureau providing business credit checks, scoring,
 * and monitoring for commercial partners.
 *
 * Uses custom certificate-based authentication (mutual TLS).
 * The certificate and private key are passed as headers for the
 * gateway proxy — actual mTLS is handled at the transport layer.
 */
export class SchufaClient extends BaseIntegrationClient {
  private readonly partnerId: string;

  constructor(config: SchufaClientConfig) {
    super({
      baseUrl: SCHUFA_BASE_URL,
      authType: "custom",
      credentials: {
        partnerId: config.partnerId,
        certificate: config.certificate,
        privateKey: config.privateKey,
      },
      timeout: config.timeout ?? 60_000,
      rateLimit: { requestsPerMinute: 10 },
      defaultHeaders: {
        "X-Partner-Id": config.partnerId,
      },
    });
    this.partnerId = config.partnerId;
  }

  // ==================== Credit Checks ====================

  /** Request a business credit check for a company. */
  async requestCreditCheck(
    data: SchufaCreditCheckRequest
  ): Promise<ApiResponse<SchufaCreditCheckResponse>> {
    return this.post<SchufaCreditCheckResponse>("/credit-checks", {
      ...data,
      partnerId: this.partnerId,
    });
  }

  /** Get a previously requested credit check by ID. */
  async getCreditCheck(
    requestId: string
  ): Promise<ApiResponse<SchufaCreditCheckResponse>> {
    return this.get<SchufaCreditCheckResponse>(`/credit-checks/${requestId}`);
  }

  // ==================== Scoring ====================

  /** Get the current score for a company by SCHUFA ID. */
  async getScore(schufaId: string): Promise<ApiResponse<SchufaScore>> {
    return this.get<SchufaScore>(`/scores/${schufaId}`);
  }

  // ==================== Monitoring ====================

  /** Create a monitoring subscription. */
  async createMonitoring(
    data: SchufaMonitoringRequest
  ): Promise<ApiResponse<SchufaMonitoringSubscription>> {
    return this.post<SchufaMonitoringSubscription>(
      "/monitoring/subscriptions",
      data
    );
  }

  /** List monitoring subscriptions. */
  async listMonitoringSubscriptions(): Promise<
    ApiResponse<SchufaMonitoringSubscription[]>
  > {
    return this.get<SchufaMonitoringSubscription[]>(
      "/monitoring/subscriptions"
    );
  }

  /** Cancel a monitoring subscription. */
  async cancelMonitoring(
    subscriptionId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/monitoring/subscriptions/${subscriptionId}`);
  }

  /** List monitoring events. */
  async listMonitoringEvents(
    subscriptionId?: string
  ): Promise<ApiResponse<SchufaMonitoringEvent[]>> {
    const params: Record<string, string> = {};
    if (subscriptionId) params.subscriptionId = subscriptionId;
    return this.get<SchufaMonitoringEvent[]>("/monitoring/events", params);
  }

  // ==================== Connection Test ====================

  /** Verify credentials by checking partner status. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get<{ partnerId: string; status: string }>(
        "/partner/status"
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
