import { BaseIntegrationClient } from '../../core/base-client.js';
import type { ApiResponse } from '../../core/types.js';
import type {
  PayPalClientConfig,
  PayPalOAuthToken,
  PayPalOrder,
  CreateOrderParams,
  PayPalCapture,
  PayPalRefund,
  CaptureRefundParams,
  PayPalInvoice,
  CreateInvoiceParams,
  PayPalTransactionList,
  TransactionSearchParams,
} from './types.js';

const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';
const LIVE_BASE = 'https://api-m.paypal.com';

export class PayPalClient extends BaseIntegrationClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: PayPalClientConfig) {
    const paypalBaseUrl = config.sandbox ? SANDBOX_BASE : LIVE_BASE;
    super({
      baseUrl: paypalBaseUrl,
      authType: 'custom',
      credentials: {},
      timeout: config.timeout ?? 30_000,
      retry: config.retries ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 } : undefined,
      rateLimit: { requestsPerMinute: 30 * 60 },
    });
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  async authenticate(): Promise<void> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiresAt) return;

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`PayPal OAuth2 authentication failed: ${response.status}`);
    }

    const token = (await response.json()) as PayPalOAuthToken;
    this.accessToken = token.access_token;
    this.tokenExpiresAt = now + (token.expires_in - 60) * 1000;
  }

  private async ensureAuth(): Promise<void> {
    await this.authenticate();
  }

  // ── Orders ──────────────────────────────────────────────────────────────

  async createOrder(params: CreateOrderParams): Promise<ApiResponse<PayPalOrder>> {
    await this.ensureAuth();
    return this.post<PayPalOrder>('/v2/checkout/orders', params);
  }

  async getOrder(orderId: string): Promise<ApiResponse<PayPalOrder>> {
    await this.ensureAuth();
    return this.get<PayPalOrder>(`/v2/checkout/orders/${orderId}`);
  }

  async captureOrder(orderId: string): Promise<ApiResponse<PayPalOrder>> {
    await this.ensureAuth();
    return this.post<PayPalOrder>(`/v2/checkout/orders/${orderId}/capture`);
  }

  async authorizeOrder(orderId: string): Promise<ApiResponse<PayPalOrder>> {
    await this.ensureAuth();
    return this.post<PayPalOrder>(`/v2/checkout/orders/${orderId}/authorize`);
  }

  // ── Payments (Captures / Refunds) ─────────────────────────────────────

  async getCapture(captureId: string): Promise<ApiResponse<PayPalCapture>> {
    await this.ensureAuth();
    return this.get<PayPalCapture>(`/v2/payments/captures/${captureId}`);
  }

  async refundCapture(captureId: string, params?: CaptureRefundParams): Promise<ApiResponse<PayPalRefund>> {
    await this.ensureAuth();
    return this.post<PayPalRefund>(`/v2/payments/captures/${captureId}/refund`, params);
  }

  async getRefund(refundId: string): Promise<ApiResponse<PayPalRefund>> {
    await this.ensureAuth();
    return this.get<PayPalRefund>(`/v2/payments/refunds/${refundId}`);
  }

  // ── Invoices ────────────────────────────────────────────────────────────

  async createInvoice(params: CreateInvoiceParams): Promise<ApiResponse<PayPalInvoice>> {
    await this.ensureAuth();
    return this.post<PayPalInvoice>('/v2/invoicing/invoices', params);
  }

  async getInvoice(invoiceId: string): Promise<ApiResponse<PayPalInvoice>> {
    await this.ensureAuth();
    return this.get<PayPalInvoice>(`/v2/invoicing/invoices/${invoiceId}`);
  }

  async sendInvoice(invoiceId: string, params?: { send_to_invoicer?: boolean; note?: string }): Promise<ApiResponse<void>> {
    await this.ensureAuth();
    return this.post<void>(`/v2/invoicing/invoices/${invoiceId}/send`, params ?? {});
  }

  async cancelInvoice(invoiceId: string, params?: { note?: string }): Promise<ApiResponse<void>> {
    await this.ensureAuth();
    return this.post<void>(`/v2/invoicing/invoices/${invoiceId}/cancel`, params ?? {});
  }

  async listInvoices(params?: { page?: number; page_size?: number; total_required?: boolean }): Promise<
    ApiResponse<{ items: PayPalInvoice[]; total_items: number; total_pages: number }>
  > {
    await this.ensureAuth();
    return this.get('/v2/invoicing/invoices', params as Record<string, string>);
  }

  // ── Transactions ──────────────────────────────────────────────────────

  async searchTransactions(params: TransactionSearchParams): Promise<ApiResponse<PayPalTransactionList>> {
    await this.ensureAuth();
    return this.get<PayPalTransactionList>('/v1/reporting/transactions', params as unknown as Record<string, string>);
  }
}
