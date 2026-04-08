import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  WiseClientConfig,
  WiseEnvironment,
  WiseProfile,
  WiseAccount,
  WiseAccountCreateRequest,
  WiseAccountListParams,
  WiseAccountRequirements,
  WiseQuote,
  WiseQuoteCreateRequest,
  WiseTransfer,
  WiseTransferCreateRequest,
  WiseTransferListParams,
  WiseFundTransferRequest,
  WiseFundTransferResponse,
  WiseBalance,
  WiseBalanceStatement,
  WiseBalanceStatementParams,
  WiseWebhookSubscription,
  WiseWebhookSubscriptionCreateRequest,
} from "./types.js";

const WISE_URLS: Record<WiseEnvironment, string> = {
  sandbox: "https://api.sandbox.transferwise.tech",
  production: "https://api.transferwise.com",
};

/**
 * Wise (TransferWise) API client for international money transfers.
 *
 * Uses Bearer token authentication. Most endpoints require a profile ID,
 * which you can obtain via `getProfiles()`.
 */
export class WiseClient extends BaseIntegrationClient {
  constructor(config: WiseClientConfig) {
    const env: WiseEnvironment = config.environment ?? "production";

    super({
      baseUrl: WISE_URLS[env],
      authType: "api_key",
      credentials: { apiKey: config.apiToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });
  }

  // ==================== Profiles ====================

  /** List all profiles (personal and business) for the authenticated user. */
  async getProfiles(): Promise<WiseProfile[]> {
    const { data } = await this.get<WiseProfile[]>("/v2/profiles");
    return data;
  }

  /** Get a specific profile by ID. */
  async getProfile(profileId: number): Promise<WiseProfile> {
    const { data } = await this.get<WiseProfile>(`/v2/profiles/${profileId}`);
    return data;
  }

  // ==================== Recipient Accounts ====================

  /** Create a recipient account. */
  async createAccount(params: WiseAccountCreateRequest): Promise<WiseAccount> {
    const { data } = await this.post<WiseAccount>("/v1/accounts", params);
    return data;
  }

  /** Get a recipient account by ID. */
  async getAccount(accountId: number): Promise<WiseAccount> {
    const { data } = await this.get<WiseAccount>(`/v1/accounts/${accountId}`);
    return data;
  }

  /** List recipient accounts for a profile. */
  async listAccounts(params?: WiseAccountListParams): Promise<WiseAccount[]> {
    const query: Record<string, string> = {};
    if (params?.profile) query.profile = String(params.profile);
    if (params?.currency) query.currency = params.currency;

    const { data } = await this.get<WiseAccount[]>("/v1/accounts", query);
    return data;
  }

  /** Delete a recipient account. */
  async deleteAccount(accountId: number): Promise<void> {
    await this.delete(`/v1/accounts/${accountId}`);
  }

  /** Get recipient account requirements for a given currency route. */
  async getAccountRequirements(
    sourceCurrency: string,
    targetCurrency: string,
    sourceAmount: number,
  ): Promise<WiseAccountRequirements[]> {
    const { data } = await this.get<WiseAccountRequirements[]>(
      "/v1/account-requirements",
      {
        source: sourceCurrency,
        target: targetCurrency,
        sourceAmount: String(sourceAmount),
      },
    );
    return data;
  }

  // ==================== Quotes ====================

  /** Create a quote for a transfer. Specify either sourceAmount or targetAmount. */
  async createQuote(params: WiseQuoteCreateRequest): Promise<WiseQuote> {
    const { data } = await this.post<WiseQuote>("/v3/profiles/" + params.profile + "/quotes", {
      sourceCurrency: params.sourceCurrency,
      targetCurrency: params.targetCurrency,
      sourceAmount: params.sourceAmount,
      targetAmount: params.targetAmount,
      targetAccount: params.targetAccount,
      payOut: params.payOut,
      preferredPayIn: params.preferredPayIn,
    });
    return data;
  }

  /** Get an existing quote by ID. */
  async getQuote(profileId: number, quoteId: string): Promise<WiseQuote> {
    const { data } = await this.get<WiseQuote>(`/v3/profiles/${profileId}/quotes/${quoteId}`);
    return data;
  }

  // ==================== Transfers ====================

  /** Create a transfer using a funded quote. */
  async createTransfer(params: WiseTransferCreateRequest): Promise<WiseTransfer> {
    const { data } = await this.post<WiseTransfer>("/v1/transfers", params);
    return data;
  }

  /** Get a transfer by ID. */
  async getTransfer(transferId: number): Promise<WiseTransfer> {
    const { data } = await this.get<WiseTransfer>(`/v1/transfers/${transferId}`);
    return data;
  }

  /** List transfers with optional filters. */
  async listTransfers(params?: WiseTransferListParams): Promise<WiseTransfer[]> {
    const query: Record<string, string> = {};
    if (params?.profile) query.profile = String(params.profile);
    if (params?.status) query.status = params.status;
    if (params?.sourceCurrency) query.sourceCurrency = params.sourceCurrency;
    if (params?.targetCurrency) query.targetCurrency = params.targetCurrency;
    if (params?.createdDateStart) query.createdDateStart = params.createdDateStart;
    if (params?.createdDateEnd) query.createdDateEnd = params.createdDateEnd;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);

    const { data } = await this.get<WiseTransfer[]>("/v1/transfers", query);
    return data;
  }

  /** Cancel a transfer (only possible in certain states). */
  async cancelTransfer(transferId: number): Promise<WiseTransfer> {
    const { data } = await this.put<WiseTransfer>(
      `/v1/transfers/${transferId}/cancel`,
    );
    return data;
  }

  /**
   * Fund a transfer from a Wise balance.
   * Only applicable for transfers where funds come from a Wise multi-currency account.
   */
  async fundTransfer(profileId: number, transferId: number, type: "balance" | "regular" = "balance"): Promise<WiseFundTransferResponse> {
    const body: WiseFundTransferRequest = { type };
    const { data } = await this.post<WiseFundTransferResponse>(
      `/v3/profiles/${profileId}/transfers/${transferId}/payments`,
      body,
    );
    return data;
  }

  /** Get delivery estimate for a transfer. */
  async getTransferDeliveryEstimate(transferId: number): Promise<{ estimatedDeliveryDate: string }> {
    const { data } = await this.get<{ estimatedDeliveryDate: string }>(
      `/v1/delivery-estimates/${transferId}`,
    );
    return data;
  }

  // ==================== Balances ====================

  /** List all balances for a profile. */
  async listBalances(profileId: number): Promise<WiseBalance[]> {
    const { data } = await this.get<WiseBalance[]>(
      `/v4/profiles/${profileId}/balances`,
      { types: "STANDARD,SAVINGS" },
    );
    return data;
  }

  /** Get a specific balance by ID. */
  async getBalance(profileId: number, balanceId: number): Promise<WiseBalance> {
    const { data } = await this.get<WiseBalance>(
      `/v4/profiles/${profileId}/balances/${balanceId}`,
    );
    return data;
  }

  /** Get a balance statement for a specific currency and date range. */
  async getBalanceStatement(
    profileId: number,
    balanceId: number,
    params: WiseBalanceStatementParams,
  ): Promise<WiseBalanceStatement> {
    const query: Record<string, string> = {
      currency: params.currency,
      intervalStart: params.intervalStart,
      intervalEnd: params.intervalEnd,
    };
    if (params.type) query.type = params.type;

    const { data } = await this.get<WiseBalanceStatement>(
      `/v1/profiles/${profileId}/balance-statements/${balanceId}/statement`,
      query,
    );
    return data;
  }

  /** Convert funds between two balances. */
  async convertBalance(
    profileId: number,
    quoteId: string,
  ): Promise<{ id: number; type: string; state: string; sourceAmount: { value: number; currency: string }; targetAmount: { value: number; currency: string } }> {
    const { data } = await this.post<{ id: number; type: string; state: string; sourceAmount: { value: number; currency: string }; targetAmount: { value: number; currency: string } }>(
      `/v2/profiles/${profileId}/balance-movements`,
      { quoteId },
    );
    return data;
  }

  // ==================== Webhook Subscriptions ====================

  /** List all webhook subscriptions for a profile. */
  async listWebhookSubscriptions(profileId: number): Promise<WiseWebhookSubscription[]> {
    const { data } = await this.get<WiseWebhookSubscription[]>(
      `/v3/profiles/${profileId}/subscriptions`,
    );
    return data;
  }

  /** Create a webhook subscription. */
  async createWebhookSubscription(
    profileId: number,
    params: WiseWebhookSubscriptionCreateRequest,
  ): Promise<WiseWebhookSubscription> {
    const { data } = await this.post<WiseWebhookSubscription>(
      `/v3/profiles/${profileId}/subscriptions`,
      params,
    );
    return data;
  }

  /** Delete a webhook subscription. */
  async deleteWebhookSubscription(profileId: number, subscriptionId: string): Promise<void> {
    await this.delete(`/v3/profiles/${profileId}/subscriptions/${subscriptionId}`);
  }

  // ==================== Exchange Rates ====================

  /** Get the current exchange rate for a currency pair. */
  async getExchangeRate(
    sourceCurrency: string,
    targetCurrency: string,
  ): Promise<Array<{ rate: number; source: string; target: string; time: string }>> {
    const { data } = await this.get<Array<{ rate: number; source: string; target: string; time: string }>>(
      "/v1/rates",
      { source: sourceCurrency, target: targetCurrency },
    );
    return data;
  }

  // ==================== Connection Test ====================

  /** Test the connection by fetching profiles. */
  async testConnection(): Promise<boolean> {
    try {
      const profiles = await this.getProfiles();
      return profiles.length > 0;
    } catch {
      return false;
    }
  }
}
