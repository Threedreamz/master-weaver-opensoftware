import { BaseIntegrationClient } from '../../core/base-client.js';
import type { ApiResponse } from '../../core/types.js';
import type {
  StripeCustomer,
  CreateCustomerParams,
  UpdateCustomerParams,
  StripeCharge,
  CreateChargeParams,
  StripePaymentIntent,
  CreatePaymentIntentParams,
  UpdatePaymentIntentParams,
  ConfirmPaymentIntentParams,
  StripeInvoice,
  CreateInvoiceParams,
  UpdateInvoiceParams,
  StripeSubscription,
  CreateSubscriptionParams,
  UpdateSubscriptionParams,
  StripeList,
  StripeListParams,
} from './types.js';

export interface StripeClientConfig {
  apiKey: string;
  apiVersion?: string;
  timeout?: number;
  retries?: number;
}

export class StripeClient extends BaseIntegrationClient {
  private readonly apiVersion: string;
  private readonly apiKey: string;

  constructor(config: StripeClientConfig) {
    const apiVersion = config.apiVersion ?? '2024-12-18.acacia';
    super({
      baseUrl: 'https://api.stripe.com/v1',
      authType: 'api_key',
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      retry: config.retries ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 } : undefined,
      rateLimit: { requestsPerMinute: 25 * 60 },
      defaultHeaders: { 'Stripe-Version': apiVersion },
    });
    this.apiKey = config.apiKey;
    this.apiVersion = apiVersion;
  }

  // ── Customers ───────────────────────────────────────────────────────────

  async listCustomers(params?: StripeListParams): Promise<ApiResponse<StripeList<StripeCustomer>>> {
    return this.get<StripeList<StripeCustomer>>('/customers', params as Record<string, string>);
  }

  async getCustomer(id: string): Promise<ApiResponse<StripeCustomer>> {
    return this.get<StripeCustomer>(`/customers/${id}`);
  }

  async createCustomer(params: CreateCustomerParams): Promise<ApiResponse<StripeCustomer>> {
    return this.post<StripeCustomer>('/customers', params);
  }

  async updateCustomer(id: string, params: UpdateCustomerParams): Promise<ApiResponse<StripeCustomer>> {
    return this.post<StripeCustomer>(`/customers/${id}`, params);
  }

  async deleteCustomer(id: string): Promise<ApiResponse<{ id: string; object: 'customer'; deleted: boolean }>> {
    return this.delete(`/customers/${id}`);
  }

  // ── Charges ─────────────────────────────────────────────────────────────

  async listCharges(params?: StripeListParams & { customer?: string }): Promise<ApiResponse<StripeList<StripeCharge>>> {
    return this.get<StripeList<StripeCharge>>('/charges', params as Record<string, string>);
  }

  async getCharge(id: string): Promise<ApiResponse<StripeCharge>> {
    return this.get<StripeCharge>(`/charges/${id}`);
  }

  async createCharge(params: CreateChargeParams): Promise<ApiResponse<StripeCharge>> {
    return this.post<StripeCharge>('/charges', params);
  }

  async captureCharge(id: string, params?: { amount?: number }): Promise<ApiResponse<StripeCharge>> {
    return this.post<StripeCharge>(`/charges/${id}/capture`, params);
  }

  // ── Payment Intents ─────────────────────────────────────────────────────

  async listPaymentIntents(
    params?: StripeListParams & { customer?: string },
  ): Promise<ApiResponse<StripeList<StripePaymentIntent>>> {
    return this.get<StripeList<StripePaymentIntent>>('/payment_intents', params as Record<string, string>);
  }

  async getPaymentIntent(id: string): Promise<ApiResponse<StripePaymentIntent>> {
    return this.get<StripePaymentIntent>(`/payment_intents/${id}`);
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<ApiResponse<StripePaymentIntent>> {
    return this.post<StripePaymentIntent>('/payment_intents', params);
  }

  async updatePaymentIntent(
    id: string,
    params: UpdatePaymentIntentParams,
  ): Promise<ApiResponse<StripePaymentIntent>> {
    return this.post<StripePaymentIntent>(`/payment_intents/${id}`, params);
  }

  async confirmPaymentIntent(
    id: string,
    params?: ConfirmPaymentIntentParams,
  ): Promise<ApiResponse<StripePaymentIntent>> {
    return this.post<StripePaymentIntent>(`/payment_intents/${id}/confirm`, params);
  }

  async capturePaymentIntent(
    id: string,
    params?: { amount_to_capture?: number },
  ): Promise<ApiResponse<StripePaymentIntent>> {
    return this.post<StripePaymentIntent>(`/payment_intents/${id}/capture`, params);
  }

  async cancelPaymentIntent(
    id: string,
    params?: { cancellation_reason?: string },
  ): Promise<ApiResponse<StripePaymentIntent>> {
    return this.post<StripePaymentIntent>(`/payment_intents/${id}/cancel`, params);
  }

  // ── Invoices ────────────────────────────────────────────────────────────

  async listInvoices(
    params?: StripeListParams & { customer?: string; status?: string },
  ): Promise<ApiResponse<StripeList<StripeInvoice>>> {
    return this.get<StripeList<StripeInvoice>>('/invoices', params as Record<string, string>);
  }

  async getInvoice(id: string): Promise<ApiResponse<StripeInvoice>> {
    return this.get<StripeInvoice>(`/invoices/${id}`);
  }

  async createInvoice(params: CreateInvoiceParams): Promise<ApiResponse<StripeInvoice>> {
    return this.post<StripeInvoice>('/invoices', params);
  }

  async updateInvoice(id: string, params: UpdateInvoiceParams): Promise<ApiResponse<StripeInvoice>> {
    return this.post<StripeInvoice>(`/invoices/${id}`, params);
  }

  async finalizeInvoice(id: string): Promise<ApiResponse<StripeInvoice>> {
    return this.post<StripeInvoice>(`/invoices/${id}/finalize`);
  }

  async payInvoice(id: string, params?: { payment_method?: string }): Promise<ApiResponse<StripeInvoice>> {
    return this.post<StripeInvoice>(`/invoices/${id}/pay`, params);
  }

  async voidInvoice(id: string): Promise<ApiResponse<StripeInvoice>> {
    return this.post<StripeInvoice>(`/invoices/${id}/void`);
  }

  async sendInvoice(id: string): Promise<ApiResponse<StripeInvoice>> {
    return this.post<StripeInvoice>(`/invoices/${id}/send`);
  }

  // ── Subscriptions ─────────────────────────────────────────────────────

  async listSubscriptions(
    params?: StripeListParams & { customer?: string; status?: string },
  ): Promise<ApiResponse<StripeList<StripeSubscription>>> {
    return this.get<StripeList<StripeSubscription>>('/subscriptions', params as Record<string, string>);
  }

  async getSubscription(id: string): Promise<ApiResponse<StripeSubscription>> {
    return this.get<StripeSubscription>(`/subscriptions/${id}`);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<ApiResponse<StripeSubscription>> {
    return this.post<StripeSubscription>('/subscriptions', params);
  }

  async updateSubscription(id: string, params: UpdateSubscriptionParams): Promise<ApiResponse<StripeSubscription>> {
    return this.post<StripeSubscription>(`/subscriptions/${id}`, params);
  }

  async cancelSubscription(
    id: string,
    params?: { invoice_now?: boolean; prorate?: boolean },
  ): Promise<ApiResponse<StripeSubscription>> {
    return this.delete<StripeSubscription>(`/subscriptions/${id}`);
  }

  async resumeSubscription(id: string): Promise<ApiResponse<StripeSubscription>> {
    return this.post<StripeSubscription>(`/subscriptions/${id}/resume`);
  }
}
