import { createHmac } from "node:crypto";
import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  GiropayClientConfig,
  GiropayBankStatusResponse,
  GiropayInitPaymentRequest,
  GiropayInitPaymentResponse,
  GiropayPaymentStatusResponse,
} from "./types.js";

/**
 * giropay API client.
 *
 * Supports: bank status checks, payment initiation, and payment status queries.
 * Auth: HMAC-MD5 signature over request parameters using the project API key.
 *
 * Note: giropay has been integrated into paydirekt/giropay. This client
 * targets the giropay REST API (api.giropay.de).
 */
export class GiropayClient extends BaseIntegrationClient {
  private merchantId: string;
  private projectId: string;
  private apiKey: string;

  constructor(config: GiropayClientConfig) {
    super({
      baseUrl: "https://payment.giropay.de/girocheckout/api/v2",
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });

    this.merchantId = config.merchantId;
    this.projectId = config.projectId;
    this.apiKey = config.apiKey;
  }

  // ==================== HMAC Signature ====================

  /**
   * Generate HMAC-MD5 hash for giropay request authentication.
   * The hash is computed over concatenated parameter values.
   */
  private generateHash(params: Record<string, string | number | undefined>): string {
    const values = Object.values(params)
      .filter((v) => v != null)
      .map((v) => String(v))
      .join("");

    return createHmac("md5", this.apiKey)
      .update(values)
      .digest("hex");
  }

  // ==================== Bank Status ====================

  /**
   * Check if a bank (identified by BIC) supports giropay.
   */
  async checkBankStatus(
    bic: string
  ): Promise<ApiResponse<GiropayBankStatusResponse>> {
    const params = {
      merchantId: this.merchantId,
      projectId: this.projectId,
      bic,
    };
    const hash = this.generateHash(params);

    return this.post<GiropayBankStatusResponse>(
      "/transaction/start",
      { ...params, hash }
    );
  }

  // ==================== Payment Initiation ====================

  /**
   * Initiate a giropay payment.
   * Returns a redirect URL where the customer completes the payment.
   */
  async initiatePayment(
    params: Omit<GiropayInitPaymentRequest, "merchantId" | "projectId">
  ): Promise<ApiResponse<GiropayInitPaymentResponse>> {
    const requestParams = {
      merchantId: this.merchantId,
      projectId: this.projectId,
      merchantTxId: params.merchantTxId,
      amount: params.amount,
      currency: params.currency,
      purpose: params.purpose,
      bic: params.bic,
      iban: params.iban,
      urlRedirect: params.urlRedirect,
      urlNotify: params.urlNotify,
      type: params.type,
      expiryDate: params.expiryDate,
      info1Label: params.info1Label,
      info1Text: params.info1Text,
      info2Label: params.info2Label,
      info2Text: params.info2Text,
      info3Label: params.info3Label,
      info3Text: params.info3Text,
      info4Label: params.info4Label,
      info4Text: params.info4Text,
      info5Label: params.info5Label,
      info5Text: params.info5Text,
    };

    const hash = this.generateHash({
      merchantId: this.merchantId,
      projectId: this.projectId,
      merchantTxId: params.merchantTxId,
      amount: params.amount,
      currency: params.currency,
      purpose: params.purpose,
      urlRedirect: params.urlRedirect,
      urlNotify: params.urlNotify,
    });

    return this.post<GiropayInitPaymentResponse>(
      "/transaction/start",
      { ...requestParams, hash }
    );
  }

  // ==================== Payment Status ====================

  /**
   * Check the status of an existing payment by its reference.
   */
  async getPaymentStatus(
    reference: string
  ): Promise<ApiResponse<GiropayPaymentStatusResponse>> {
    const params = {
      merchantId: this.merchantId,
      projectId: this.projectId,
      reference,
    };
    const hash = this.generateHash(params);

    return this.post<GiropayPaymentStatusResponse>(
      "/transaction/status",
      { ...params, hash }
    );
  }

  // ==================== Notification Verification ====================

  /**
   * Verify the hash on an incoming giropay notification.
   */
  verifyNotification(
    params: Record<string, string>,
    providedHash: string
  ): boolean {
    const { gcHash, ...rest } = params;
    const expectedHash = this.generateHash(rest);
    return expectedHash === providedHash;
  }

  // ==================== Connection Test ====================

  /**
   * Verify credentials by checking bank status for a known German BIC.
   */
  async testConnection(): Promise<boolean> {
    try {
      // Use Deutsche Bank BIC as a known test
      const response = await this.checkBankStatus("DEUTDEDB");
      return response.data.rc !== undefined;
    } catch {
      return false;
    }
  }
}
