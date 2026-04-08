import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  UnzerClientConfig,
  UnzerCustomer,
  UnzerMetadata,
  UnzerBasket,
  UnzerAuthorizeRequest,
  UnzerChargeRequest,
  UnzerTransaction,
  UnzerPayment,
  UnzerCancelRequest,
  UnzerCardResource,
  UnzerSepaResource,
} from "./types.js";

/**
 * Unzer (formerly Heidelpay) API client.
 *
 * Supports: payments, charges, authorizations, customers, baskets, metadata,
 * and payment type resources (card, SEPA, etc.).
 *
 * Auth: Basic auth with the private key as username, empty password.
 * Base URL: https://api.unzer.com/v1
 */
export class UnzerClient extends BaseIntegrationClient {
  constructor(config: UnzerClientConfig) {
    super({
      baseUrl: "https://api.unzer.com/v1",
      authType: "basic_auth",
      credentials: {
        username: config.privateKey,
        password: "",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
    });
  }

  // ==================== Customers ====================

  /** Create a new customer resource. */
  async createCustomer(
    customer: UnzerCustomer
  ): Promise<ApiResponse<UnzerCustomer>> {
    return this.post<UnzerCustomer>("/customers", customer);
  }

  /** Get a customer by ID. */
  async getCustomer(customerId: string): Promise<ApiResponse<UnzerCustomer>> {
    return this.get<UnzerCustomer>(`/customers/${customerId}`);
  }

  /** Update an existing customer. */
  async updateCustomer(
    customerId: string,
    customer: Partial<UnzerCustomer>
  ): Promise<ApiResponse<UnzerCustomer>> {
    return this.put<UnzerCustomer>(`/customers/${customerId}`, customer);
  }

  /** Delete a customer. */
  async deleteCustomer(customerId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/customers/${customerId}`);
  }

  // ==================== Payment Type Resources ====================

  /** Create a card payment type resource. */
  async createCard(
    card: UnzerCardResource
  ): Promise<ApiResponse<UnzerCardResource>> {
    return this.post<UnzerCardResource>("/types/card", card);
  }

  /** Get a payment type resource by ID. */
  async getPaymentType(typeId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return this.get<Record<string, unknown>>(`/types/${typeId}`);
  }

  /** Create a SEPA direct debit payment type resource. */
  async createSepa(
    sepa: UnzerSepaResource
  ): Promise<ApiResponse<UnzerSepaResource>> {
    return this.post<UnzerSepaResource>("/types/sepa-direct-debit", sepa);
  }

  // ==================== Metadata ====================

  /** Create a metadata resource. */
  async createMetadata(
    metadata: Record<string, unknown>
  ): Promise<ApiResponse<UnzerMetadata>> {
    return this.post<UnzerMetadata>("/metadata", metadata);
  }

  /** Get metadata by ID. */
  async getMetadata(metadataId: string): Promise<ApiResponse<UnzerMetadata>> {
    return this.get<UnzerMetadata>(`/metadata/${metadataId}`);
  }

  // ==================== Baskets ====================

  /** Create a basket resource. */
  async createBasket(basket: UnzerBasket): Promise<ApiResponse<UnzerBasket>> {
    return this.post<UnzerBasket>("/baskets", basket);
  }

  /** Get a basket by ID. */
  async getBasket(basketId: string): Promise<ApiResponse<UnzerBasket>> {
    return this.get<UnzerBasket>(`/baskets/${basketId}`);
  }

  /** Update a basket. */
  async updateBasket(
    basketId: string,
    basket: Partial<UnzerBasket>
  ): Promise<ApiResponse<UnzerBasket>> {
    return this.put<UnzerBasket>(`/baskets/${basketId}`, basket);
  }

  // ==================== Authorization ====================

  /**
   * Authorize a payment (reserve funds without capturing).
   * The type resource (typeId) must be created first.
   */
  async authorize(
    params: UnzerAuthorizeRequest
  ): Promise<ApiResponse<UnzerTransaction>> {
    return this.post<UnzerTransaction>("/payments/authorize", params);
  }

  // ==================== Charges ====================

  /**
   * Charge a payment directly (authorize + capture in one step).
   */
  async charge(
    params: UnzerChargeRequest
  ): Promise<ApiResponse<UnzerTransaction>> {
    return this.post<UnzerTransaction>("/payments/charges", params);
  }

  /**
   * Charge an existing authorization (capture).
   */
  async chargeAuthorization(
    paymentId: string,
    amount?: number
  ): Promise<ApiResponse<UnzerTransaction>> {
    const body: Record<string, unknown> = {};
    if (amount != null) body.amount = amount;
    return this.post<UnzerTransaction>(
      `/payments/${paymentId}/charges`,
      body
    );
  }

  // ==================== Payments ====================

  /** Get the full payment resource (includes all transactions). */
  async getPayment(paymentId: string): Promise<ApiResponse<UnzerPayment>> {
    return this.get<UnzerPayment>(`/payments/${paymentId}`);
  }

  /** Get a specific charge transaction. */
  async getCharge(
    paymentId: string,
    chargeId: string
  ): Promise<ApiResponse<UnzerTransaction>> {
    return this.get<UnzerTransaction>(
      `/payments/${paymentId}/charges/${chargeId}`
    );
  }

  /** Get the authorization transaction for a payment. */
  async getAuthorization(
    paymentId: string
  ): Promise<ApiResponse<UnzerTransaction>> {
    return this.get<UnzerTransaction>(
      `/payments/${paymentId}/authorize`
    );
  }

  // ==================== Cancel / Refund ====================

  /**
   * Cancel an authorization (reversal).
   */
  async cancelAuthorization(
    paymentId: string,
    params?: UnzerCancelRequest
  ): Promise<ApiResponse<UnzerTransaction>> {
    return this.post<UnzerTransaction>(
      `/payments/${paymentId}/authorize/cancels`,
      params ?? {}
    );
  }

  /**
   * Cancel (refund) a charge.
   */
  async cancelCharge(
    paymentId: string,
    chargeId: string,
    params?: UnzerCancelRequest
  ): Promise<ApiResponse<UnzerTransaction>> {
    return this.post<UnzerTransaction>(
      `/payments/${paymentId}/charges/${chargeId}/cancels`,
      params ?? {}
    );
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching the keypair. */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.get<{ publicKey: string }>("/keypair");
      return response.status === 200 && !!response.data.publicKey;
    } catch {
      return false;
    }
  }
}
