import { BaseIntegrationClient } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  RevolutBusinessClientConfig,
  RevolutAccount,
  RevolutCounterparty,
  RevolutCreateCounterpartyRequest,
  RevolutCreatePaymentRequest,
  RevolutPayment,
  RevolutTransaction,
  RevolutTransactionsParams,
  RevolutExchangeRequest,
  RevolutExchangeResponse,
  RevolutExchangeRateResponse,
  RevolutCreateWebhookRequest,
  RevolutWebhookResponse,
} from "./types.js";

const REVOLUT_PRODUCTION_URL = "https://b2b.revolut.com/api/1.0";
const REVOLUT_SANDBOX_URL = "https://sandbox-b2b.revolut.com/api/1.0";
const REVOLUT_AUTH_URL = "https://business.revolut.com/app-confirm";
const REVOLUT_TOKEN_URL = "https://b2b.revolut.com/api/1.0/auth/token";
const REVOLUT_SANDBOX_TOKEN_URL = "https://sandbox-b2b.revolut.com/api/1.0/auth/token";

/**
 * Revolut Business API client.
 *
 * Supports: accounts, payments, counterparties, FX exchange, transactions, webhooks.
 * Auth: OAuth2 Bearer token.
 * Rate limit: 300 RPM.
 */
export class RevolutBusinessClient extends BaseIntegrationClient {
  private oauth: OAuthManager | undefined;
  private tokens: OAuthTokens;
  private isSandbox: boolean;

  constructor(private config: RevolutBusinessClientConfig) {
    const baseUrl = config.sandbox ? REVOLUT_SANDBOX_URL : REVOLUT_PRODUCTION_URL;

    super({
      baseUrl,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 300 },
    });

    this.isSandbox = config.sandbox ?? false;
    this.tokens = {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
    };

    if (config.clientId && config.clientSecret && config.redirectUri) {
      this.oauth = new OAuthManager({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authorizationUrl: REVOLUT_AUTH_URL,
        tokenUrl: this.isSandbox ? REVOLUT_SANDBOX_TOKEN_URL : REVOLUT_TOKEN_URL,
        scopes: [],
        redirectUri: config.redirectUri,
      });
    }
  }

  // ==================== Token Management ====================

  getAuthorizationUrl(state: string): string | undefined {
    return this.oauth?.getAuthorizationUrl(state);
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    if (!this.oauth) throw new Error("OAuth not configured");
    this.tokens = await this.oauth.exchangeCode(code);
    this.updateCredentials(this.tokens.accessToken);
    return this.tokens;
  }

  async ensureValidToken(): Promise<void> {
    if (!this.oauth) return;
    const refreshed = await this.oauth.getValidTokens(this.tokens);
    if (refreshed.accessToken !== this.tokens.accessToken) {
      this.tokens = refreshed;
      this.updateCredentials(refreshed.accessToken);
    }
  }

  getTokens(): OAuthTokens {
    return { ...this.tokens };
  }

  // ==================== Accounts ====================

  /** List all business accounts. */
  async listAccounts(): Promise<ApiResponse<RevolutAccount[]>> {
    await this.ensureValidToken();
    return this.get<RevolutAccount[]>("/accounts");
  }

  /** Get a single account by ID. */
  async getAccount(accountId: string): Promise<ApiResponse<RevolutAccount>> {
    await this.ensureValidToken();
    return this.get<RevolutAccount>(`/accounts/${accountId}`);
  }

  // ==================== Counterparties ====================

  /** List all counterparties. */
  async listCounterparties(): Promise<ApiResponse<RevolutCounterparty[]>> {
    await this.ensureValidToken();
    return this.get<RevolutCounterparty[]>("/counterparties");
  }

  /** Get a counterparty by ID. */
  async getCounterparty(counterpartyId: string): Promise<ApiResponse<RevolutCounterparty>> {
    await this.ensureValidToken();
    return this.get<RevolutCounterparty>(`/counterparties/${counterpartyId}`);
  }

  /** Create a new counterparty. */
  async createCounterparty(
    data: RevolutCreateCounterpartyRequest
  ): Promise<ApiResponse<RevolutCounterparty>> {
    await this.ensureValidToken();
    return this.post<RevolutCounterparty>("/counterparties", data);
  }

  /** Delete a counterparty. */
  async deleteCounterparty(counterpartyId: string): Promise<ApiResponse<void>> {
    await this.ensureValidToken();
    return this.delete<void>(`/counterparties/${counterpartyId}`);
  }

  // ==================== Payments ====================

  /** Create a payment (transfer funds). */
  async createPayment(
    data: RevolutCreatePaymentRequest
  ): Promise<ApiResponse<RevolutPayment>> {
    await this.ensureValidToken();
    return this.post<RevolutPayment>("/pay", data);
  }

  /** Get a payment by ID. */
  async getPayment(paymentId: string): Promise<ApiResponse<RevolutPayment>> {
    await this.ensureValidToken();
    return this.get<RevolutPayment>(`/transaction/${paymentId}`);
  }

  /** Cancel a scheduled payment. */
  async cancelPayment(paymentId: string): Promise<ApiResponse<void>> {
    await this.ensureValidToken();
    return this.delete<void>(`/transaction/${paymentId}`);
  }

  // ==================== Transactions ====================

  /** List transactions with optional filters. */
  async listTransactions(
    params?: RevolutTransactionsParams
  ): Promise<ApiResponse<RevolutTransaction[]>> {
    await this.ensureValidToken();
    const queryParams: Record<string, string> = {};
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;
    if (params?.counterparty) queryParams.counterparty = params.counterparty;
    if (params?.count != null) queryParams.count = String(params.count);
    if (params?.type) queryParams.type = params.type;

    return this.get<RevolutTransaction[]>("/transactions", queryParams);
  }

  /** Get a single transaction by ID. */
  async getTransaction(transactionId: string): Promise<ApiResponse<RevolutTransaction>> {
    await this.ensureValidToken();
    return this.get<RevolutTransaction>(`/transaction/${transactionId}`);
  }

  // ==================== FX Exchange ====================

  /** Exchange currency between two accounts. */
  async exchange(
    data: RevolutExchangeRequest
  ): Promise<ApiResponse<RevolutExchangeResponse>> {
    await this.ensureValidToken();
    return this.post<RevolutExchangeResponse>("/exchange", data);
  }

  /** Get an exchange rate quote. */
  async getExchangeRate(
    from: string,
    to: string,
    amount: number
  ): Promise<ApiResponse<RevolutExchangeRateResponse>> {
    await this.ensureValidToken();
    return this.get<RevolutExchangeRateResponse>("/rate", {
      from,
      to,
      amount: String(amount),
    });
  }

  // ==================== Webhooks ====================

  /** Create a webhook endpoint. */
  async createWebhook(
    data: RevolutCreateWebhookRequest
  ): Promise<ApiResponse<RevolutWebhookResponse>> {
    await this.ensureValidToken();
    return this.post<RevolutWebhookResponse>("/webhook", data);
  }

  /** List all registered webhooks. */
  async listWebhooks(): Promise<ApiResponse<RevolutWebhookResponse[]>> {
    await this.ensureValidToken();
    return this.get<RevolutWebhookResponse[]>("/webhooks");
  }

  /** Delete a webhook. */
  async deleteWebhook(webhookId: string): Promise<ApiResponse<void>> {
    await this.ensureValidToken();
    return this.delete<void>(`/webhook/${webhookId}`);
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching accounts. */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      const response = await this.listAccounts();
      return response.status === 200 && Array.isArray(response.data);
    } catch {
      return false;
    }
  }

  // ==================== Private Helpers ====================

  private updateCredentials(accessToken: string): void {
    this.credentials = { accessToken };
  }
}
