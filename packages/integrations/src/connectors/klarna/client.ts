import { BaseIntegrationClient } from '../../core/base-client.js';
import type { ApiResponse } from '../../core/types.js';
import type {
  KlarnaClientConfig,
  KlarnaSession,
  CreateSessionParams,
  UpdateSessionParams,
  KlarnaOrder,
  CreateOrderParams,
  KlarnaCapture,
  CreateCaptureParams,
  KlarnaRefund,
  CreateRefundParams,
} from './types.js';

const BASE_URLS: Record<string, { live: string; test: string }> = {
  eu: { live: 'https://api.klarna.com', test: 'https://api.playground.klarna.com' },
  na: { live: 'https://api-na.klarna.com', test: 'https://api-na.playground.klarna.com' },
  oc: { live: 'https://api-oc.klarna.com', test: 'https://api-oc.playground.klarna.com' },
};

export class KlarnaClient extends BaseIntegrationClient {
  private readonly basicAuth: string;

  constructor(config: KlarnaClientConfig) {
    const region = config.region ?? 'eu';
    const urls = BASE_URLS[region]!;
    const baseUrl = config.testMode ? urls.test : urls.live;

    super({
      baseUrl,
      authType: 'basic_auth',
      credentials: { username: config.username, password: config.password },
      timeout: config.timeout ?? 30_000,
      retry: config.retries ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 } : undefined,
      rateLimit: { requestsPerMinute: 20 * 60 },
    });
    this.basicAuth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  }

  // ── Sessions ────────────────────────────────────────────────────────────

  async createSession(params: CreateSessionParams): Promise<ApiResponse<KlarnaSession>> {
    return this.post<KlarnaSession>('/payments/v1/sessions', params);
  }

  async getSession(sessionId: string): Promise<ApiResponse<KlarnaSession>> {
    return this.get<KlarnaSession>(`/payments/v1/sessions/${sessionId}`);
  }

  async updateSession(sessionId: string, params: UpdateSessionParams): Promise<ApiResponse<void>> {
    return this.post<void>(`/payments/v1/sessions/${sessionId}`, params);
  }

  // ── Orders ──────────────────────────────────────────────────────────────

  async createOrder(authorizationToken: string, params: Omit<CreateOrderParams, 'authorization_token'>): Promise<ApiResponse<KlarnaOrder>> {
    return this.post<KlarnaOrder>(`/payments/v1/authorizations/${authorizationToken}/order`, params);
  }

  async getOrder(orderId: string): Promise<ApiResponse<KlarnaOrder>> {
    return this.get<KlarnaOrder>(`/ordermanagement/v1/orders/${orderId}`);
  }

  async acknowledgeOrder(orderId: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/ordermanagement/v1/orders/${orderId}/acknowledge`);
  }

  async cancelOrder(orderId: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/ordermanagement/v1/orders/${orderId}/cancel`);
  }

  async extendAuthorizationTime(orderId: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/ordermanagement/v1/orders/${orderId}/extend-authorization-time`);
  }

  async updateMerchantReferences(
    orderId: string,
    params: { merchant_reference1?: string; merchant_reference2?: string },
  ): Promise<ApiResponse<void>> {
    return this.patch<void>(`/ordermanagement/v1/orders/${orderId}/merchant-references`, params);
  }

  // ── Captures ────────────────────────────────────────────────────────────

  async captureOrder(orderId: string, params: CreateCaptureParams): Promise<ApiResponse<void>> {
    return this.post<void>(`/ordermanagement/v1/orders/${orderId}/captures`, params);
  }

  async getCapture(orderId: string, captureId: string): Promise<ApiResponse<KlarnaCapture>> {
    return this.get<KlarnaCapture>(`/ordermanagement/v1/orders/${orderId}/captures/${captureId}`);
  }

  async addShippingInfo(
    orderId: string,
    captureId: string,
    params: {
      shipping_info: Array<{
        shipping_company: string;
        shipping_method: string;
        tracking_number: string;
        tracking_uri: string;
      }>;
    },
  ): Promise<ApiResponse<void>> {
    return this.post<void>(
      `/ordermanagement/v1/orders/${orderId}/captures/${captureId}/shipping-info`,
      params,
    );
  }

  // ── Refunds ─────────────────────────────────────────────────────────────

  async refundOrder(orderId: string, params: CreateRefundParams): Promise<ApiResponse<void>> {
    return this.post<void>(`/ordermanagement/v1/orders/${orderId}/refunds`, params);
  }

  async getRefund(orderId: string, refundId: string): Promise<ApiResponse<KlarnaRefund>> {
    return this.get<KlarnaRefund>(`/ordermanagement/v1/orders/${orderId}/refunds/${refundId}`);
  }
}
