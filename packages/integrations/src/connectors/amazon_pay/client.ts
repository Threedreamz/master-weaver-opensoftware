import { createSign, createPrivateKey } from 'node:crypto';
import { BaseIntegrationClient } from '../../core/base-client.js';
import type { ApiResponse } from '../../core/types.js';
import type {
  AmazonPayClientConfig,
  AmazonPayCheckoutSession,
  CreateCheckoutSessionParams,
  UpdateCheckoutSessionParams,
  CompleteCheckoutSessionParams,
  AmazonPayCharge,
  CreateChargeParams,
  CaptureChargeParams,
  AmazonPayRefund,
  CreateRefundParams,
} from './types.js';

const REGION_URLS: Record<string, { live: string; sandbox: string }> = {
  na: {
    live: 'https://pay-api.amazon.com/v2',
    sandbox: 'https://pay-api.amazon.com/v2',
  },
  eu: {
    live: 'https://pay-api.amazon.eu/v2',
    sandbox: 'https://pay-api.amazon.eu/v2',
  },
  jp: {
    live: 'https://pay-api.amazon.jp/v2',
    sandbox: 'https://pay-api.amazon.jp/v2',
  },
};

export class AmazonPayClient extends BaseIntegrationClient {
  private readonly publicKeyId: string;
  private readonly privateKey: string;
  private readonly sandbox: boolean;

  constructor(config: AmazonPayClientConfig) {
    const region = config.region ?? 'na';
    const urls = REGION_URLS[region]!;
    const baseUrl = config.sandbox ? urls.sandbox : urls.live;

    super({
      baseUrl,
      authType: 'custom',
      credentials: {},
      timeout: config.timeout ?? 30_000,
      retry: config.retries ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 } : undefined,
      rateLimit: { requestsPerMinute: 10 * 60 },
    });
    this.publicKeyId = config.publicKeyId;
    this.privateKey = config.privateKey;
    this.sandbox = config.sandbox ?? false;
  }

  private buildRegionHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'x-amz-pay-region': 'na',
    };

    if (this.sandbox) {
      headers['x-amz-pay-sandbox'] = 'true';
    }

    return headers;
  }

  private signRequest(method: string, path: string, body?: string): Record<string, string> {
    const timestamp = new Date().toISOString();
    const hashedPayload = body ?? '';

    const canonicalRequest = [
      method,
      path,
      '',
      `accept:application/json`,
      `content-type:application/json`,
      `x-amz-pay-date:${timestamp}`,
      '',
      'accept;content-type;x-amz-pay-date',
      hashedPayload,
    ].join('\n');

    const stringToSign = [
      'AMZN-PAY-RSASSA-PSS-V2',
      timestamp,
      canonicalRequest,
    ].join('\n');

    const key = createPrivateKey(this.privateKey);
    const signature = createSign('RSA-SHA256')
      .update(stringToSign)
      .sign({ key, padding: 6, saltLength: 32 }, 'base64');

    return {
      Authorization: `AMZN-PAY-RSASSA-PSS-V2 PublicKeyId=${this.publicKeyId}, SignedHeaders=accept;content-type;x-amz-pay-date, Signature=${signature}`,
      'x-amz-pay-date': timestamp,
      ...this.buildRegionHeaders(),
    };
  }

  // ── Checkout Sessions ─────────────────────────────────────────────────

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<ApiResponse<AmazonPayCheckoutSession>> {
    const body = JSON.stringify(params);
    const headers = this.signRequest('POST', '/checkoutSessions', body);
    return this.request<AmazonPayCheckoutSession>({
      method: 'POST',
      path: '/checkoutSessions',
      body: params,
      headers,
    });
  }

  async getCheckoutSession(checkoutSessionId: string): Promise<ApiResponse<AmazonPayCheckoutSession>> {
    const headers = this.signRequest('GET', `/checkoutSessions/${checkoutSessionId}`);
    return this.request<AmazonPayCheckoutSession>({
      method: 'GET',
      path: `/checkoutSessions/${checkoutSessionId}`,
      headers,
    });
  }

  async updateCheckoutSession(
    checkoutSessionId: string,
    params: UpdateCheckoutSessionParams,
  ): Promise<ApiResponse<AmazonPayCheckoutSession>> {
    const body = JSON.stringify(params);
    const headers = this.signRequest('PATCH', `/checkoutSessions/${checkoutSessionId}`, body);
    return this.request<AmazonPayCheckoutSession>({
      method: 'PATCH',
      path: `/checkoutSessions/${checkoutSessionId}`,
      body: params,
      headers,
    });
  }

  async completeCheckoutSession(
    checkoutSessionId: string,
    params: CompleteCheckoutSessionParams,
  ): Promise<ApiResponse<AmazonPayCheckoutSession>> {
    const body = JSON.stringify(params);
    const headers = this.signRequest('POST', `/checkoutSessions/${checkoutSessionId}/complete`, body);
    return this.request<AmazonPayCheckoutSession>({
      method: 'POST',
      path: `/checkoutSessions/${checkoutSessionId}/complete`,
      body: params,
      headers,
    });
  }

  // ── Charges ─────────────────────────────────────────────────────────────

  async createCharge(params: CreateChargeParams): Promise<ApiResponse<AmazonPayCharge>> {
    const body = JSON.stringify(params);
    const headers = this.signRequest('POST', '/charges', body);
    return this.request<AmazonPayCharge>({
      method: 'POST',
      path: '/charges',
      body: params,
      headers,
    });
  }

  async getCharge(chargeId: string): Promise<ApiResponse<AmazonPayCharge>> {
    const headers = this.signRequest('GET', `/charges/${chargeId}`);
    return this.request<AmazonPayCharge>({
      method: 'GET',
      path: `/charges/${chargeId}`,
      headers,
    });
  }

  async captureCharge(chargeId: string, params: CaptureChargeParams): Promise<ApiResponse<AmazonPayCharge>> {
    const body = JSON.stringify(params);
    const headers = this.signRequest('POST', `/charges/${chargeId}/capture`, body);
    return this.request<AmazonPayCharge>({
      method: 'POST',
      path: `/charges/${chargeId}/capture`,
      body: params,
      headers,
    });
  }

  async cancelCharge(chargeId: string, _params?: { cancellationReason?: string }): Promise<ApiResponse<AmazonPayCharge>> {
    const headers = this.signRequest('DELETE', `/charges/${chargeId}`);
    return this.request<AmazonPayCharge>({
      method: 'DELETE',
      path: `/charges/${chargeId}`,
      headers,
    });
  }

  // ── Refunds ─────────────────────────────────────────────────────────────

  async createRefund(params: CreateRefundParams): Promise<ApiResponse<AmazonPayRefund>> {
    const body = JSON.stringify(params);
    const headers = this.signRequest('POST', '/refunds', body);
    return this.request<AmazonPayRefund>({
      method: 'POST',
      path: '/refunds',
      body: params,
      headers,
    });
  }

  async getRefund(refundId: string): Promise<ApiResponse<AmazonPayRefund>> {
    const headers = this.signRequest('GET', `/refunds/${refundId}`);
    return this.request<AmazonPayRefund>({
      method: 'GET',
      path: `/refunds/${refundId}`,
      headers,
    });
  }
}
