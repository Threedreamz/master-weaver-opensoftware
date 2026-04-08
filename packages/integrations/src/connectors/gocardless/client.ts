import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  GoCardlessClientConfig,
  GoCardlessEnvironment,
  GoCardlessCustomer,
  GoCardlessCustomerCreateRequest,
  GoCardlessCustomerUpdateRequest,
  GoCardlessCustomerListParams,
  GoCardlessCustomerBankAccount,
  GoCardlessCustomerBankAccountCreateRequest,
  GoCardlessMandate,
  GoCardlessMandateCreateRequest,
  GoCardlessMandateListParams,
  GoCardlessPayment,
  GoCardlessPaymentCreateRequest,
  GoCardlessPaymentListParams,
  GoCardlessPayout,
  GoCardlessPayoutListParams,
  GoCardlessPayoutItem,
  GoCardlessPayoutItemListParams,
  GoCardlessSubscription,
  GoCardlessSubscriptionCreateRequest,
  GoCardlessSubscriptionUpdateRequest,
  GoCardlessSubscriptionListParams,
  GoCardlessMeta,
} from "./types.js";

const GOCARDLESS_URLS: Record<GoCardlessEnvironment, string> = {
  sandbox: "https://api-sandbox.gocardless.com",
  live: "https://api.gocardless.com",
};

interface GoCardlessListResponse<T> {
  meta: GoCardlessMeta;
  [key: string]: T[] | GoCardlessMeta;
}

/**
 * GoCardless API client for SEPA Direct Debit payments.
 *
 * All mutating requests require an idempotency key (auto-generated).
 * GoCardless uses envelope-style JSON: `{ customers: { ... } }`.
 */
export class GoCardlessClient extends BaseIntegrationClient {
  constructor(config: GoCardlessClientConfig) {
    const env: GoCardlessEnvironment = config.environment ?? "live";

    super({
      baseUrl: GOCARDLESS_URLS[env],
      authType: "api_key",
      credentials: { apiKey: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        "GoCardless-Version": "2015-07-06",
      },
    });
  }

  /** Generate a unique idempotency key for POST requests. */
  private idempotencyKey(): Record<string, string> {
    return { "Idempotency-Key": crypto.randomUUID() };
  }

  // ==================== Customers ====================

  /** Create a new customer. */
  async createCustomer(params: GoCardlessCustomerCreateRequest): Promise<GoCardlessCustomer> {
    const { data } = await this.request<{ customers: GoCardlessCustomer }>({
      method: "POST",
      path: "/customers",
      body: { customers: params },
      headers: this.idempotencyKey(),
    });
    return data.customers;
  }

  /** Get a customer by ID. */
  async getCustomer(customerId: string): Promise<GoCardlessCustomer> {
    const { data } = await this.get<{ customers: GoCardlessCustomer }>(`/customers/${customerId}`);
    return data.customers;
  }

  /** Update a customer. */
  async updateCustomer(customerId: string, params: GoCardlessCustomerUpdateRequest): Promise<GoCardlessCustomer> {
    const { data } = await this.put<{ customers: GoCardlessCustomer }>(
      `/customers/${customerId}`,
      { customers: params },
    );
    return data.customers;
  }

  /** List customers with optional filters. */
  async listCustomers(params?: GoCardlessCustomerListParams): Promise<{ customers: GoCardlessCustomer[]; meta: GoCardlessMeta }> {
    const query = this.buildListParams(params as Record<string, unknown>);
    const { data } = await this.get<{ customers: GoCardlessCustomer[]; meta: GoCardlessMeta }>(
      "/customers",
      query,
    );
    return data;
  }

  /** Remove a customer (soft delete). */
  async removeCustomer(customerId: string): Promise<void> {
    await this.delete(`/customers/${customerId}`);
  }

  // ==================== Customer Bank Accounts ====================

  /** Create a customer bank account. */
  async createCustomerBankAccount(params: GoCardlessCustomerBankAccountCreateRequest): Promise<GoCardlessCustomerBankAccount> {
    const { data } = await this.request<{ customer_bank_accounts: GoCardlessCustomerBankAccount }>({
      method: "POST",
      path: "/customer_bank_accounts",
      body: { customer_bank_accounts: params },
      headers: this.idempotencyKey(),
    });
    return data.customer_bank_accounts;
  }

  /** Get a customer bank account by ID. */
  async getCustomerBankAccount(bankAccountId: string): Promise<GoCardlessCustomerBankAccount> {
    const { data } = await this.get<{ customer_bank_accounts: GoCardlessCustomerBankAccount }>(
      `/customer_bank_accounts/${bankAccountId}`,
    );
    return data.customer_bank_accounts;
  }

  /** Disable a customer bank account. */
  async disableCustomerBankAccount(bankAccountId: string): Promise<GoCardlessCustomerBankAccount> {
    const { data } = await this.post<{ customer_bank_accounts: GoCardlessCustomerBankAccount }>(
      `/customer_bank_accounts/${bankAccountId}/actions/disable`,
    );
    return data.customer_bank_accounts;
  }

  // ==================== Mandates ====================

  /** Create a Direct Debit mandate. */
  async createMandate(params: GoCardlessMandateCreateRequest): Promise<GoCardlessMandate> {
    const { data } = await this.request<{ mandates: GoCardlessMandate }>({
      method: "POST",
      path: "/mandates",
      body: { mandates: params },
      headers: this.idempotencyKey(),
    });
    return data.mandates;
  }

  /** Get a mandate by ID. */
  async getMandate(mandateId: string): Promise<GoCardlessMandate> {
    const { data } = await this.get<{ mandates: GoCardlessMandate }>(`/mandates/${mandateId}`);
    return data.mandates;
  }

  /** List mandates with optional filters. */
  async listMandates(params?: GoCardlessMandateListParams): Promise<{ mandates: GoCardlessMandate[]; meta: GoCardlessMeta }> {
    const query = this.buildListParams(params as Record<string, unknown>);
    const { data } = await this.get<{ mandates: GoCardlessMandate[]; meta: GoCardlessMeta }>(
      "/mandates",
      query,
    );
    return data;
  }

  /** Cancel an active mandate. */
  async cancelMandate(mandateId: string, metadata?: Record<string, string>): Promise<GoCardlessMandate> {
    const { data } = await this.post<{ mandates: GoCardlessMandate }>(
      `/mandates/${mandateId}/actions/cancel`,
      metadata ? { data: { metadata } } : undefined,
    );
    return data.mandates;
  }

  /** Reinstate a cancelled mandate. */
  async reinstateMandate(mandateId: string, metadata?: Record<string, string>): Promise<GoCardlessMandate> {
    const { data } = await this.post<{ mandates: GoCardlessMandate }>(
      `/mandates/${mandateId}/actions/reinstate`,
      metadata ? { data: { metadata } } : undefined,
    );
    return data.mandates;
  }

  // ==================== Payments ====================

  /** Create a payment against a mandate. */
  async createPayment(params: GoCardlessPaymentCreateRequest): Promise<GoCardlessPayment> {
    const { data } = await this.request<{ payments: GoCardlessPayment }>({
      method: "POST",
      path: "/payments",
      body: { payments: params },
      headers: this.idempotencyKey(),
    });
    return data.payments;
  }

  /** Get a payment by ID. */
  async getPayment(paymentId: string): Promise<GoCardlessPayment> {
    const { data } = await this.get<{ payments: GoCardlessPayment }>(`/payments/${paymentId}`);
    return data.payments;
  }

  /** List payments with optional filters. */
  async listPayments(params?: GoCardlessPaymentListParams): Promise<{ payments: GoCardlessPayment[]; meta: GoCardlessMeta }> {
    const query = this.buildListParams(params as Record<string, unknown>);
    const { data } = await this.get<{ payments: GoCardlessPayment[]; meta: GoCardlessMeta }>(
      "/payments",
      query,
    );
    return data;
  }

  /** Cancel a pending payment. */
  async cancelPayment(paymentId: string, metadata?: Record<string, string>): Promise<GoCardlessPayment> {
    const { data } = await this.post<{ payments: GoCardlessPayment }>(
      `/payments/${paymentId}/actions/cancel`,
      metadata ? { data: { metadata } } : undefined,
    );
    return data.payments;
  }

  /** Retry a failed payment. */
  async retryPayment(paymentId: string, metadata?: Record<string, string>): Promise<GoCardlessPayment> {
    const { data } = await this.post<{ payments: GoCardlessPayment }>(
      `/payments/${paymentId}/actions/retry`,
      metadata ? { data: { metadata } } : undefined,
    );
    return data.payments;
  }

  // ==================== Payouts ====================

  /** Get a payout by ID. */
  async getPayout(payoutId: string): Promise<GoCardlessPayout> {
    const { data } = await this.get<{ payouts: GoCardlessPayout }>(`/payouts/${payoutId}`);
    return data.payouts;
  }

  /** List payouts with optional filters. */
  async listPayouts(params?: GoCardlessPayoutListParams): Promise<{ payouts: GoCardlessPayout[]; meta: GoCardlessMeta }> {
    const query = this.buildListParams(params as Record<string, unknown>);
    const { data } = await this.get<{ payouts: GoCardlessPayout[]; meta: GoCardlessMeta }>(
      "/payouts",
      query,
    );
    return data;
  }

  /** List items within a payout (individual payment movements). */
  async listPayoutItems(params: GoCardlessPayoutItemListParams): Promise<{ payout_items: GoCardlessPayoutItem[]; meta: GoCardlessMeta }> {
    const query: Record<string, string> = { payout: params.payout };
    if (params.after) query.after = params.after;
    if (params.before) query.before = params.before;
    if (params.limit) query.limit = String(params.limit);

    const { data } = await this.get<{ payout_items: GoCardlessPayoutItem[]; meta: GoCardlessMeta }>(
      "/payout_items",
      query,
    );
    return data;
  }

  // ==================== Subscriptions ====================

  /** Create a recurring subscription. */
  async createSubscription(params: GoCardlessSubscriptionCreateRequest): Promise<GoCardlessSubscription> {
    const { data } = await this.request<{ subscriptions: GoCardlessSubscription }>({
      method: "POST",
      path: "/subscriptions",
      body: { subscriptions: params },
      headers: this.idempotencyKey(),
    });
    return data.subscriptions;
  }

  /** Get a subscription by ID. */
  async getSubscription(subscriptionId: string): Promise<GoCardlessSubscription> {
    const { data } = await this.get<{ subscriptions: GoCardlessSubscription }>(
      `/subscriptions/${subscriptionId}`,
    );
    return data.subscriptions;
  }

  /** Update a subscription. */
  async updateSubscription(subscriptionId: string, params: GoCardlessSubscriptionUpdateRequest): Promise<GoCardlessSubscription> {
    const { data } = await this.put<{ subscriptions: GoCardlessSubscription }>(
      `/subscriptions/${subscriptionId}`,
      { subscriptions: params },
    );
    return data.subscriptions;
  }

  /** List subscriptions with optional filters. */
  async listSubscriptions(params?: GoCardlessSubscriptionListParams): Promise<{ subscriptions: GoCardlessSubscription[]; meta: GoCardlessMeta }> {
    const query = this.buildListParams(params as Record<string, unknown>);
    const { data } = await this.get<{ subscriptions: GoCardlessSubscription[]; meta: GoCardlessMeta }>(
      "/subscriptions",
      query,
    );
    return data;
  }

  /** Cancel an active subscription. */
  async cancelSubscription(subscriptionId: string, metadata?: Record<string, string>): Promise<GoCardlessSubscription> {
    const { data } = await this.post<{ subscriptions: GoCardlessSubscription }>(
      `/subscriptions/${subscriptionId}/actions/cancel`,
      metadata ? { data: { metadata } } : undefined,
    );
    return data.subscriptions;
  }

  /** Pause an active subscription. */
  async pauseSubscription(subscriptionId: string, metadata?: Record<string, string>): Promise<GoCardlessSubscription> {
    const { data } = await this.post<{ subscriptions: GoCardlessSubscription }>(
      `/subscriptions/${subscriptionId}/actions/pause`,
      metadata ? { data: { metadata } } : undefined,
    );
    return data.subscriptions;
  }

  /** Resume a paused subscription. */
  async resumeSubscription(subscriptionId: string, metadata?: Record<string, string>): Promise<GoCardlessSubscription> {
    const { data } = await this.post<{ subscriptions: GoCardlessSubscription }>(
      `/subscriptions/${subscriptionId}/actions/resume`,
      metadata ? { data: { metadata } } : undefined,
    );
    return data.subscriptions;
  }

  // ==================== Connection Test ====================

  /** Test the connection by listing customers with limit 1. */
  async testConnection(): Promise<boolean> {
    try {
      await this.listCustomers({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Helpers ====================

  /** Convert list params to query string record. */
  private buildListParams(params?: Record<string, unknown>): Record<string, string> {
    if (!params) return {};
    const query: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;

      if (typeof value === "object" && !Array.isArray(value)) {
        // Nested date filters: created_at[gt]=2024-01-01
        for (const [op, v] of Object.entries(value as Record<string, string>)) {
          if (v !== undefined) {
            query[`${key}[${op}]`] = String(v);
          }
        }
      } else {
        query[key] = String(value);
      }
    }

    return query;
  }
}
