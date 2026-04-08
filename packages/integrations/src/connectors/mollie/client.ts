import { BaseIntegrationClient } from '../../core/base-client.js';
import type { ApiResponse } from '../../core/types.js';
import type {
  MollieClientConfig,
  MolliePayment,
  CreatePaymentParams,
  UpdatePaymentParams,
  MollieRefund,
  CreateRefundParams,
  MollieCustomer,
  CreateCustomerParams,
  UpdateCustomerParams,
  MollieMandate,
  CreateMandateParams,
  MollieSubscription,
  CreateSubscriptionParams,
  UpdateSubscriptionParams,
  MollieList,
  MollieListParams,
} from './types.js';

export class MollieClient extends BaseIntegrationClient {
  private readonly apiKey: string;

  constructor(config: MollieClientConfig) {
    super({
      baseUrl: 'https://api.mollie.com/v2',
      authType: 'api_key',
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      retry: config.retries ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 } : undefined,
      rateLimit: { requestsPerMinute: 25 * 60 },
    });
    this.apiKey = config.apiKey;
  }

  // ── Payments ────────────────────────────────────────────────────────────

  async createPayment(params: CreatePaymentParams): Promise<ApiResponse<MolliePayment>> {
    return this.post<MolliePayment>('/payments', params);
  }

  async getPayment(id: string): Promise<ApiResponse<MolliePayment>> {
    return this.get<MolliePayment>(`/payments/${id}`);
  }

  async updatePayment(id: string, params: UpdatePaymentParams): Promise<ApiResponse<MolliePayment>> {
    return this.patch<MolliePayment>(`/payments/${id}`, params);
  }

  async cancelPayment(id: string): Promise<ApiResponse<MolliePayment>> {
    return this.delete<MolliePayment>(`/payments/${id}`);
  }

  async listPayments(params?: MollieListParams): Promise<ApiResponse<MollieList<MolliePayment>>> {
    return this.get<MollieList<MolliePayment>>('/payments', params as Record<string, string>);
  }

  // ── Refunds ─────────────────────────────────────────────────────────────

  async createRefund(paymentId: string, params: CreateRefundParams): Promise<ApiResponse<MollieRefund>> {
    return this.post<MollieRefund>(`/payments/${paymentId}/refunds`, params);
  }

  async getRefund(paymentId: string, refundId: string): Promise<ApiResponse<MollieRefund>> {
    return this.get<MollieRefund>(`/payments/${paymentId}/refunds/${refundId}`);
  }

  async cancelRefund(paymentId: string, refundId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/payments/${paymentId}/refunds/${refundId}`);
  }

  async listRefunds(paymentId: string, params?: MollieListParams): Promise<ApiResponse<MollieList<MollieRefund>>> {
    return this.get<MollieList<MollieRefund>>(`/payments/${paymentId}/refunds`, params as Record<string, string>);
  }

  // ── Customers ───────────────────────────────────────────────────────────

  async createCustomer(params: CreateCustomerParams): Promise<ApiResponse<MollieCustomer>> {
    return this.post<MollieCustomer>('/customers', params);
  }

  async getCustomer(id: string): Promise<ApiResponse<MollieCustomer>> {
    return this.get<MollieCustomer>(`/customers/${id}`);
  }

  async updateCustomer(id: string, params: UpdateCustomerParams): Promise<ApiResponse<MollieCustomer>> {
    return this.patch<MollieCustomer>(`/customers/${id}`, params);
  }

  async deleteCustomer(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/customers/${id}`);
  }

  async listCustomers(params?: MollieListParams): Promise<ApiResponse<MollieList<MollieCustomer>>> {
    return this.get<MollieList<MollieCustomer>>('/customers', params as Record<string, string>);
  }

  // ── Mandates ────────────────────────────────────────────────────────────

  async createMandate(customerId: string, params: CreateMandateParams): Promise<ApiResponse<MollieMandate>> {
    return this.post<MollieMandate>(`/customers/${customerId}/mandates`, params);
  }

  async getMandate(customerId: string, mandateId: string): Promise<ApiResponse<MollieMandate>> {
    return this.get<MollieMandate>(`/customers/${customerId}/mandates/${mandateId}`);
  }

  async revokeMandate(customerId: string, mandateId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/customers/${customerId}/mandates/${mandateId}`);
  }

  async listMandates(customerId: string, params?: MollieListParams): Promise<ApiResponse<MollieList<MollieMandate>>> {
    return this.get<MollieList<MollieMandate>>(`/customers/${customerId}/mandates`, params as Record<string, string>);
  }

  // ── Subscriptions ─────────────────────────────────────────────────────

  async createSubscription(
    customerId: string,
    params: CreateSubscriptionParams,
  ): Promise<ApiResponse<MollieSubscription>> {
    return this.post<MollieSubscription>(`/customers/${customerId}/subscriptions`, params);
  }

  async getSubscription(customerId: string, subscriptionId: string): Promise<ApiResponse<MollieSubscription>> {
    return this.get<MollieSubscription>(`/customers/${customerId}/subscriptions/${subscriptionId}`);
  }

  async updateSubscription(
    customerId: string,
    subscriptionId: string,
    params: UpdateSubscriptionParams,
  ): Promise<ApiResponse<MollieSubscription>> {
    return this.patch<MollieSubscription>(`/customers/${customerId}/subscriptions/${subscriptionId}`, params);
  }

  async cancelSubscription(customerId: string, subscriptionId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/customers/${customerId}/subscriptions/${subscriptionId}`);
  }

  async listSubscriptions(
    customerId: string,
    params?: MollieListParams,
  ): Promise<ApiResponse<MollieList<MollieSubscription>>> {
    return this.get<MollieList<MollieSubscription>>(`/customers/${customerId}/subscriptions`, params as Record<string, string>);
  }
}
