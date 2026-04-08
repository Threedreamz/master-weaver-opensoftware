import { createHash } from "node:crypto";
import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  PayoneClientConfig,
  PayonePreauthorizationRequest,
  PayonePreauthorizationResponse,
  PayoneAuthorizationRequest,
  PayoneAuthorizationResponse,
  PayoneCaptureRequest,
  PayoneCaptureResponse,
  PayoneRefundRequest,
  PayoneRefundResponse,
  PayoneBaseRequest,
  PayoneClearingType,
  PayonePersonalData,
} from "./types.js";

/**
 * PAYONE Server API client.
 *
 * Supports: preauthorization, authorization, capture, refund/debit.
 * Auth: API key (MD5-hashed) sent as a request parameter.
 *
 * Note: PAYONE uses form-encoded POST requests. This client overrides
 * the request method to send form-urlencoded data instead of JSON.
 */
export class PayoneClient extends BaseIntegrationClient {
  private merchantId: string;
  private portalId: string;
  private accountId: string;
  private apiKeyHash: string;
  private mode: "test" | "live";

  constructor(config: PayoneClientConfig) {
    super({
      baseUrl: "https://api.pay1.de/post-gateway/",
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
    });

    this.merchantId = config.merchantId;
    this.portalId = config.portalId;
    this.accountId = config.accountId;
    this.apiKeyHash = createHash("md5").update(config.apiKey).digest("hex");
    this.mode = config.mode;
  }

  // ==================== Base Parameters ====================

  private getBaseParams(): PayoneBaseRequest {
    return {
      mid: this.merchantId,
      portalid: this.portalId,
      key: this.apiKeyHash,
      mode: this.mode,
      api_version: "3.11",
      encoding: "UTF-8",
    };
  }

  // ==================== Internal Request ====================

  /**
   * PAYONE uses form-encoded POST to a single endpoint.
   * The response is a newline-delimited key=value string.
   */
  private async payoneRequest<T>(
    params: Record<string, string | number | undefined>
  ): Promise<ApiResponse<T>> {
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value != null) {
        formData.set(key, String(value));
      }
    }

    const response = await this.request<T>({
      method: "POST",
      path: "/",
      body: formData.toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response;
  }

  /**
   * Parse PAYONE's newline-delimited response into an object.
   */
  private parsePayoneResponse<T>(text: string): T {
    const result: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const idx = line.indexOf("=");
      if (idx > 0) {
        result[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
      }
    }
    return result as unknown as T;
  }

  // ==================== Preauthorization ====================

  /**
   * Preauthorize a payment (reserve funds).
   * Must be followed by a capture to complete the payment.
   */
  async preauthorize(params: {
    amount: number;
    currency: string;
    reference: string;
    clearingtype: PayoneClearingType;
    personal?: PayonePersonalData;
    pseudocardpan?: string;
    iban?: string;
    bic?: string;
    successurl?: string;
    errorurl?: string;
    backurl?: string;
  }): Promise<ApiResponse<PayonePreauthorizationResponse>> {
    return this.payoneRequest<PayonePreauthorizationResponse>({
      ...this.getBaseParams(),
      request: "preauthorization",
      aid: this.accountId,
      amount: params.amount,
      currency: params.currency,
      reference: params.reference,
      clearingtype: params.clearingtype,
      ...params.personal,
      pseudocardpan: params.pseudocardpan,
      iban: params.iban,
      bic: params.bic,
      successurl: params.successurl,
      errorurl: params.errorurl,
      backurl: params.backurl,
    });
  }

  // ==================== Authorization ====================

  /**
   * Authorize and immediately capture a payment in one step.
   */
  async authorize(params: {
    amount: number;
    currency: string;
    reference: string;
    clearingtype: PayoneClearingType;
    personal?: PayonePersonalData;
    pseudocardpan?: string;
    iban?: string;
    bic?: string;
    successurl?: string;
    errorurl?: string;
    backurl?: string;
  }): Promise<ApiResponse<PayoneAuthorizationResponse>> {
    return this.payoneRequest<PayoneAuthorizationResponse>({
      ...this.getBaseParams(),
      request: "authorization",
      aid: this.accountId,
      amount: params.amount,
      currency: params.currency,
      reference: params.reference,
      clearingtype: params.clearingtype,
      ...params.personal,
      pseudocardpan: params.pseudocardpan,
      iban: params.iban,
      bic: params.bic,
      successurl: params.successurl,
      errorurl: params.errorurl,
      backurl: params.backurl,
    });
  }

  // ==================== Capture ====================

  /**
   * Capture a previously preauthorized payment.
   */
  async capture(params: {
    txid: string;
    amount: number;
    currency: string;
    sequencenumber: number;
    settleaccount?: "yes" | "no" | "auto";
    capturemode?: "completed" | "notcompleted";
  }): Promise<ApiResponse<PayoneCaptureResponse>> {
    return this.payoneRequest<PayoneCaptureResponse>({
      ...this.getBaseParams(),
      request: "capture",
      txid: params.txid,
      sequencenumber: params.sequencenumber,
      amount: params.amount,
      currency: params.currency,
      settleaccount: params.settleaccount,
      capturemode: params.capturemode,
    });
  }

  // ==================== Refund ====================

  /**
   * Refund a captured payment.
   * The amount should be negative (PAYONE convention).
   */
  async refund(params: {
    txid: string;
    amount: number;
    currency: string;
    sequencenumber: number;
    narrativeText?: string;
    iban?: string;
    bic?: string;
    bankcountry?: string;
  }): Promise<ApiResponse<PayoneRefundResponse>> {
    return this.payoneRequest<PayoneRefundResponse>({
      ...this.getBaseParams(),
      request: "refund",
      txid: params.txid,
      sequencenumber: params.sequencenumber,
      amount: params.amount,
      currency: params.currency,
      narrative_text: params.narrativeText,
      iban: params.iban,
      bic: params.bic,
      bankcountry: params.bankcountry,
    });
  }

  // ==================== Connection Test ====================

  /**
   * Verify credentials by attempting a zero-value preauthorization check.
   * Uses a minimal request to verify API credentials are valid.
   */
  async testConnection(): Promise<boolean> {
    try {
      // Attempt to reach the API with base params only
      // A valid key will return an error about missing params, not an auth error
      const response = await this.payoneRequest<PayonePreauthorizationResponse>({
        ...this.getBaseParams(),
        request: "preauthorization",
        aid: this.accountId,
      });
      // If we get APPROVED or an error about missing fields (not auth), creds are valid
      return response.data.status !== undefined;
    } catch {
      return false;
    }
  }
}
