import { BaseIntegrationClient } from '../../core/base-client.js';
import type { ApiResponse } from '../../core/types.js';
import type {
  SumUpClientConfig,
  SumUpMerchantProfile,
  SumUpCheckout,
  CreateCheckoutParams,
  ProcessCheckoutParams,
  SumUpTransaction,
  TransactionListParams,
  RefundTransactionParams,
} from './types.js';

export class SumUpClient extends BaseIntegrationClient {
  private readonly accessToken: string;
  private readonly merchantCode: string | undefined;

  constructor(config: SumUpClientConfig) {
    super({
      baseUrl: 'https://api.sumup.com/v0.1',
      authType: 'api_key',
      credentials: { apiKey: config.accessToken },
      timeout: config.timeout ?? 30_000,
      retry: config.retries ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 } : undefined,
      rateLimit: { requestsPerMinute: 10 * 60 },
    });
    this.accessToken = config.accessToken;
    this.merchantCode = config.merchantCode;
  }

  // ── Merchant ────────────────────────────────────────────────────────────

  async getMerchantProfile(): Promise<ApiResponse<SumUpMerchantProfile>> {
    return this.get<SumUpMerchantProfile>('/me/merchant-profile');
  }

  // ── Checkouts ───────────────────────────────────────────────────────────

  async createCheckout(params: CreateCheckoutParams): Promise<ApiResponse<SumUpCheckout>> {
    return this.post<SumUpCheckout>('/checkouts', params);
  }

  async getCheckout(checkoutId: string): Promise<ApiResponse<SumUpCheckout>> {
    return this.get<SumUpCheckout>(`/checkouts/${checkoutId}`);
  }

  async processCheckout(checkoutId: string, params: ProcessCheckoutParams): Promise<ApiResponse<SumUpCheckout>> {
    return this.put<SumUpCheckout>(`/checkouts/${checkoutId}`, params);
  }

  async listCheckouts(): Promise<ApiResponse<SumUpCheckout[]>> {
    return this.get<SumUpCheckout[]>('/checkouts');
  }

  async deactivateCheckout(checkoutId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/checkouts/${checkoutId}`);
  }

  // ── Transactions ──────────────────────────────────────────────────────

  async listTransactions(params?: TransactionListParams): Promise<ApiResponse<{ items: SumUpTransaction[] }>> {
    const queryParams: Record<string, string | undefined> = {};
    if (params?.order) queryParams.order = params.order;
    if (params?.limit) queryParams.limit = String(params.limit);
    if (params?.oldest_time) queryParams.oldest_time = params.oldest_time;
    if (params?.newest_time) queryParams.newest_time = params.newest_time;
    if (params?.changes_since) queryParams.changes_since = params.changes_since;
    if (params?.statuses) queryParams.statuses = params.statuses.join(',');
    if (params?.payment_types) queryParams.payment_types = params.payment_types.join(',');

    const filteredParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined) filteredParams[k] = v;
    }
    return this.get<{ items: SumUpTransaction[] }>('/me/transactions/history', filteredParams);
  }

  async getTransaction(transactionId: string): Promise<ApiResponse<SumUpTransaction>> {
    return this.get<SumUpTransaction>(`/me/transactions/history`, { transaction_code: transactionId });
  }

  async refundTransaction(
    transactionId: string,
    params: RefundTransactionParams,
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/me/refund/${transactionId}`, params);
  }
}
