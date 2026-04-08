import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  AdyenClientConfig,
  AdyenCreateSessionRequest,
  AdyenCreateSessionResponse,
  AdyenPaymentRequest,
  AdyenPaymentResponse,
  AdyenPaymentDetailsRequest,
  AdyenCaptureRequest,
  AdyenCaptureResponse,
  AdyenRefundRequest,
  AdyenRefundResponse,
  AdyenCancelRequest,
  AdyenCancelResponse,
  AdyenPaymentMethodsRequest,
  AdyenPaymentMethodsResponse,
  AdyenListStoredPaymentMethodsResponse,
  AdyenRemoveStoredPaymentMethodResponse,
} from "./types.js";

/**
 * Adyen Checkout & Payments API client.
 *
 * Supports: checkout sessions, payments, captures, refunds, cancellations,
 * payment methods, and recurring/stored payment methods.
 *
 * Auth: X-API-Key header.
 * Environments: test (checkout-test.adyen.com) or live ({prefix}-checkout-live.adyenpayments.com).
 */
export class AdyenClient extends BaseIntegrationClient {
  private merchantAccount: string;

  constructor(private config: AdyenClientConfig) {
    const baseUrl = config.environment === "live" && config.liveUrlPrefix
      ? `https://${config.liveUrlPrefix}-checkout-live.adyenpayments.com/checkout/v71`
      : "https://checkout-test.adyen.com/v71";

    super({
      baseUrl,
      authType: "api_key",
      credentials: {
        apiKey: config.apiKey,
        headerName: "X-API-Key",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 300 },
    });

    this.merchantAccount = config.merchantAccount;
  }

  // ==================== Checkout Sessions ====================

  /**
   * Create a checkout session for Drop-in / Components integration.
   * Returns session data the frontend uses to render the payment form.
   */
  async createSession(
    params: Omit<AdyenCreateSessionRequest, "merchantAccount"> & { merchantAccount?: string }
  ): Promise<ApiResponse<AdyenCreateSessionResponse>> {
    return this.post<AdyenCreateSessionResponse>("/sessions", {
      merchantAccount: params.merchantAccount ?? this.merchantAccount,
      ...params,
    });
  }

  // ==================== Payments ====================

  /**
   * Submit a payment with full payment method details.
   * For server-to-server payment flows (e.g., tokenized recurring).
   */
  async makePayment(
    params: Omit<AdyenPaymentRequest, "merchantAccount"> & { merchantAccount?: string }
  ): Promise<ApiResponse<AdyenPaymentResponse>> {
    return this.post<AdyenPaymentResponse>("/payments", {
      merchantAccount: params.merchantAccount ?? this.merchantAccount,
      ...params,
    });
  }

  /**
   * Submit additional payment details (e.g., 3DS2 challenge result).
   */
  async submitPaymentDetails(
    details: AdyenPaymentDetailsRequest
  ): Promise<ApiResponse<AdyenPaymentResponse>> {
    return this.post<AdyenPaymentResponse>("/payments/details", details);
  }

  // ==================== Payment Methods ====================

  /**
   * Retrieve available payment methods for a given context.
   */
  async getPaymentMethods(
    params: Omit<AdyenPaymentMethodsRequest, "merchantAccount"> & { merchantAccount?: string }
  ): Promise<ApiResponse<AdyenPaymentMethodsResponse>> {
    return this.post<AdyenPaymentMethodsResponse>("/paymentMethods", {
      merchantAccount: params.merchantAccount ?? this.merchantAccount,
      ...params,
    });
  }

  // ==================== Modifications ====================

  /**
   * Capture an authorized payment (partial or full).
   */
  async capturePayment(
    paymentPspReference: string,
    params: Omit<AdyenCaptureRequest, "merchantAccount"> & { merchantAccount?: string }
  ): Promise<ApiResponse<AdyenCaptureResponse>> {
    return this.post<AdyenCaptureResponse>(
      `/payments/${paymentPspReference}/captures`,
      {
        merchantAccount: params.merchantAccount ?? this.merchantAccount,
        ...params,
      }
    );
  }

  /**
   * Refund a captured payment (partial or full).
   */
  async refundPayment(
    paymentPspReference: string,
    params: Omit<AdyenRefundRequest, "merchantAccount"> & { merchantAccount?: string }
  ): Promise<ApiResponse<AdyenRefundResponse>> {
    return this.post<AdyenRefundResponse>(
      `/payments/${paymentPspReference}/refunds`,
      {
        merchantAccount: params.merchantAccount ?? this.merchantAccount,
        ...params,
      }
    );
  }

  /**
   * Cancel an authorized payment that has not yet been captured.
   */
  async cancelPayment(
    paymentPspReference: string,
    params?: Omit<AdyenCancelRequest, "merchantAccount"> & { merchantAccount?: string }
  ): Promise<ApiResponse<AdyenCancelResponse>> {
    return this.post<AdyenCancelResponse>(
      `/payments/${paymentPspReference}/cancels`,
      {
        merchantAccount: params?.merchantAccount ?? this.merchantAccount,
        reference: params?.reference,
      }
    );
  }

  // ==================== Recurring / Stored Payment Methods ====================

  /**
   * List stored payment methods for a shopper.
   */
  async listStoredPaymentMethods(
    shopperReference: string
  ): Promise<ApiResponse<AdyenListStoredPaymentMethodsResponse>> {
    return this.get<AdyenListStoredPaymentMethodsResponse>(
      `/storedPaymentMethods`,
      {
        merchantAccount: this.merchantAccount,
        shopperReference,
      }
    );
  }

  /**
   * Remove a stored payment method.
   */
  async removeStoredPaymentMethod(
    recurringId: string,
    shopperReference: string
  ): Promise<ApiResponse<AdyenRemoveStoredPaymentMethodResponse>> {
    return this.delete<AdyenRemoveStoredPaymentMethodResponse>(
      `/storedPaymentMethods/${recurringId}?merchantAccount=${encodeURIComponent(this.merchantAccount)}&shopperReference=${encodeURIComponent(shopperReference)}`
    );
  }

  // ==================== Connection Test ====================

  /**
   * Verify credentials by fetching payment methods.
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.getPaymentMethods({});
      return response.status === 200 && Array.isArray(response.data.paymentMethods);
    } catch {
      return false;
    }
  }
}
