import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  CurrencycloudEnvironment,
  CurrencycloudAuthResponse,
  CurrencycloudBalance,
  CurrencycloudBalanceListResponse,
  CurrencycloudBeneficiary,
  CurrencycloudBeneficiaryListResponse,
  CurrencycloudCreateBeneficiaryParams,
  CurrencycloudConversion,
  CurrencycloudConversionListResponse,
  CurrencycloudCreateConversionParams,
  CurrencycloudPayment,
  CurrencycloudPaymentListResponse,
  CurrencycloudCreatePaymentParams,
  CurrencycloudRatesResponse,
  CurrencycloudAccount,
  CurrencycloudListParams,
} from "./types.js";

export interface CurrencycloudClientOptions {
  loginId: string;
  apiKey: string;
  environment?: CurrencycloudEnvironment;
  timeout?: number;
  retries?: number;
}

const CURRENCYCLOUD_URLS: Record<CurrencycloudEnvironment, string> = {
  demo: "https://devapi.currencycloud.com/v2",
  production: "https://api.currencycloud.com/v2",
};

/**
 * Currencycloud API client for FX payments, conversions, beneficiaries, and balances.
 *
 * Uses API key authentication. First authenticates to obtain an auth token,
 * then uses the token for subsequent requests via the X-Auth-Token header.
 */
export class CurrencycloudClient extends BaseIntegrationClient {
  private readonly loginId: string;
  private readonly apiKey: string;
  private authToken: string | null = null;

  constructor(config: CurrencycloudClientOptions) {
    const env: CurrencycloudEnvironment = config.environment ?? "production";

    super({
      baseUrl: CURRENCYCLOUD_URLS[env],
      authType: "custom",
      credentials: {
        loginId: config.loginId,
        apiKey: config.apiKey,
      },
      timeout: config.timeout ?? 30_000,
      retry: config.retries
        ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 }
        : undefined,
      rateLimit: { requestsPerMinute: 120 },
    });
    this.loginId = config.loginId;
    this.apiKey = config.apiKey;
  }

  // ── Authentication ─────────────────────────────────────────────────────

  /** Authenticate and store the auth token. */
  async authenticate(): Promise<string> {
    const { data } = await this.post<CurrencycloudAuthResponse>(
      "/authenticate/api",
      {
        login_id: this.loginId,
        api_key: this.apiKey,
      },
    );
    this.authToken = data.auth_token;
    this.defaultHeaders["X-Auth-Token"] = data.auth_token;
    return data.auth_token;
  }

  /** Ensure we have an auth token, re-authenticating if needed. */
  private async ensureAuth(): Promise<void> {
    if (!this.authToken) {
      await this.authenticate();
    }
  }

  // ── Balances ───────────────────────────────────────────────────────────

  /** List all balances. */
  async listBalances(
    params?: CurrencycloudListParams,
  ): Promise<CurrencycloudBalanceListResponse> {
    await this.ensureAuth();
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);

    const { data } = await this.get<CurrencycloudBalanceListResponse>(
      "/balances/find",
      query,
    );
    return data;
  }

  /** Get a balance for a specific currency. */
  async getBalance(currency: string): Promise<CurrencycloudBalance> {
    await this.ensureAuth();
    const { data } = await this.get<CurrencycloudBalance>(
      `/balances/${currency}`,
    );
    return data;
  }

  // ── Beneficiaries ──────────────────────────────────────────────────────

  /** List beneficiaries. */
  async listBeneficiaries(
    params?: CurrencycloudListParams,
  ): Promise<CurrencycloudBeneficiaryListResponse> {
    await this.ensureAuth();
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);

    const { data } = await this.get<CurrencycloudBeneficiaryListResponse>(
      "/beneficiaries/find",
      query,
    );
    return data;
  }

  /** Get a beneficiary by ID. */
  async getBeneficiary(
    beneficiaryId: string,
  ): Promise<CurrencycloudBeneficiary> {
    await this.ensureAuth();
    const { data } = await this.get<CurrencycloudBeneficiary>(
      `/beneficiaries/${beneficiaryId}`,
    );
    return data;
  }

  /** Create a beneficiary. */
  async createBeneficiary(
    params: CurrencycloudCreateBeneficiaryParams,
  ): Promise<CurrencycloudBeneficiary> {
    await this.ensureAuth();
    const { data } = await this.post<CurrencycloudBeneficiary>(
      "/beneficiaries/create",
      params,
    );
    return data;
  }

  /** Delete a beneficiary. */
  async deleteBeneficiary(beneficiaryId: string): Promise<void> {
    await this.ensureAuth();
    await this.post(`/beneficiaries/${beneficiaryId}/delete`);
  }

  // ── Conversions ────────────────────────────────────────────────────────

  /** List conversions. */
  async listConversions(
    params?: CurrencycloudListParams,
  ): Promise<CurrencycloudConversionListResponse> {
    await this.ensureAuth();
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);

    const { data } = await this.get<CurrencycloudConversionListResponse>(
      "/conversions/find",
      query,
    );
    return data;
  }

  /** Get a conversion by ID. */
  async getConversion(conversionId: string): Promise<CurrencycloudConversion> {
    await this.ensureAuth();
    const { data } = await this.get<CurrencycloudConversion>(
      `/conversions/${conversionId}`,
    );
    return data;
  }

  /** Create a conversion. */
  async createConversion(
    params: CurrencycloudCreateConversionParams,
  ): Promise<CurrencycloudConversion> {
    await this.ensureAuth();
    const { data } = await this.post<CurrencycloudConversion>(
      "/conversions/create",
      { ...params, term_agreement: params.term_agreement ?? true },
    );
    return data;
  }

  /** Cancel a conversion. */
  async cancelConversion(conversionId: string): Promise<CurrencycloudConversion> {
    await this.ensureAuth();
    const { data } = await this.post<CurrencycloudConversion>(
      `/conversions/${conversionId}/cancel`,
    );
    return data;
  }

  // ── Payments ───────────────────────────────────────────────────────────

  /** List payments. */
  async listPayments(
    params?: CurrencycloudListParams,
  ): Promise<CurrencycloudPaymentListResponse> {
    await this.ensureAuth();
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.per_page) query.per_page = String(params.per_page);

    const { data } = await this.get<CurrencycloudPaymentListResponse>(
      "/payments/find",
      query,
    );
    return data;
  }

  /** Get a payment by ID. */
  async getPayment(paymentId: string): Promise<CurrencycloudPayment> {
    await this.ensureAuth();
    const { data } = await this.get<CurrencycloudPayment>(
      `/payments/${paymentId}`,
    );
    return data;
  }

  /** Create a payment. */
  async createPayment(
    params: CurrencycloudCreatePaymentParams,
  ): Promise<CurrencycloudPayment> {
    await this.ensureAuth();
    const { data } = await this.post<CurrencycloudPayment>(
      "/payments/create",
      params,
    );
    return data;
  }

  /** Delete a payment. */
  async deletePayment(paymentId: string): Promise<void> {
    await this.ensureAuth();
    await this.post(`/payments/${paymentId}/delete`);
  }

  // ── Rates ──────────────────────────────────────────────────────────────

  /** Get rates for currency pairs. */
  async getRates(
    currencyPair: string,
  ): Promise<CurrencycloudRatesResponse> {
    await this.ensureAuth();
    const { data } = await this.get<CurrencycloudRatesResponse>(
      "/rates/find",
      { currency_pair: currencyPair },
    );
    return data;
  }

  /** Get a detailed rate for a currency pair and amount. */
  async getDetailedRate(
    buyCurrency: string,
    sellCurrency: string,
    fixedSide: "buy" | "sell",
    amount: string,
  ): Promise<CurrencycloudConversion> {
    await this.ensureAuth();
    const { data } = await this.get<CurrencycloudConversion>(
      "/rates/detailed",
      {
        buy_currency: buyCurrency,
        sell_currency: sellCurrency,
        fixed_side: fixedSide,
        amount,
      },
    );
    return data;
  }

  // ── Accounts ───────────────────────────────────────────────────────────

  /** Get the current account. */
  async getCurrentAccount(): Promise<CurrencycloudAccount> {
    await this.ensureAuth();
    const { data } = await this.get<CurrencycloudAccount>(
      "/accounts/current",
    );
    return data;
  }

  // ── Connection Test ────────────────────────────────────────────────────

  /** Test the connection by authenticating. */
  async testConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch {
      return false;
    }
  }
}
