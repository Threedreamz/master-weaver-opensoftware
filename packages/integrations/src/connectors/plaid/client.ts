import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  PlaidClientConfig,
  PlaidEnvironment,
  PlaidLinkTokenCreateRequest,
  PlaidLinkTokenCreateResponse,
  PlaidItemPublicTokenExchangeRequest,
  PlaidItemPublicTokenExchangeResponse,
  PlaidItemGetResponse,
  PlaidAccountsGetRequest,
  PlaidAccountsGetResponse,
  PlaidBalanceGetRequest,
  PlaidBalanceGetResponse,
  PlaidTransactionsSyncRequest,
  PlaidTransactionsSyncResponse,
  PlaidTransactionsGetRequest,
  PlaidTransactionsGetResponse,
  PlaidIdentityGetRequest,
  PlaidIdentityGetResponse,
  PlaidWebhookVerificationKeyResponse,
} from "./types.js";

const PLAID_URLS: Record<PlaidEnvironment, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

/**
 * Plaid API client for bank account aggregation.
 *
 * Plaid uses a unique auth model: every request includes `client_id` and `secret`
 * in the JSON body rather than in headers.
 */
export class PlaidClient extends BaseIntegrationClient {
  private readonly clientId: string;
  private readonly secret: string;

  constructor(config: PlaidClientConfig) {
    const env: PlaidEnvironment = config.environment ?? "production";

    super({
      baseUrl: PLAID_URLS[env],
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
      defaultHeaders: {
        "PLAID-CLIENT-ID": config.clientId,
        "PLAID-SECRET": config.secret,
      },
    });

    this.clientId = config.clientId;
    this.secret = config.secret;
  }

  /** Inject client_id and secret into every POST body (Plaid convention). */
  private withAuth<T extends object>(body: T): T & { client_id: string; secret: string } {
    return { ...body, client_id: this.clientId, secret: this.secret };
  }

  // ==================== Link Tokens ====================

  /** Create a link token for initializing Plaid Link in the frontend. */
  async createLinkToken(params: PlaidLinkTokenCreateRequest): Promise<PlaidLinkTokenCreateResponse> {
    const { data } = await this.post<PlaidLinkTokenCreateResponse>(
      "/link/token/create",
      this.withAuth(params),
    );
    return data;
  }

  // ==================== Token Exchange ====================

  /** Exchange a public token from Plaid Link for a persistent access token. */
  async exchangePublicToken(publicToken: string): Promise<PlaidItemPublicTokenExchangeResponse> {
    const body: PlaidItemPublicTokenExchangeRequest = { public_token: publicToken };
    const { data } = await this.post<PlaidItemPublicTokenExchangeResponse>(
      "/item/public_token/exchange",
      this.withAuth(body),
    );
    return data;
  }

  // ==================== Items ====================

  /** Retrieve metadata about a connected Item (bank). */
  async getItem(accessToken: string): Promise<PlaidItemGetResponse> {
    const { data } = await this.post<PlaidItemGetResponse>(
      "/item/get",
      this.withAuth({ access_token: accessToken }),
    );
    return data;
  }

  /** Remove an Item, revoking the access token. */
  async removeItem(accessToken: string): Promise<{ request_id: string }> {
    const { data } = await this.post<{ request_id: string }>(
      "/item/remove",
      this.withAuth({ access_token: accessToken }),
    );
    return data;
  }

  /** Update the webhook URL for an Item. */
  async updateItemWebhook(accessToken: string, webhook: string): Promise<PlaidItemGetResponse> {
    const { data } = await this.post<PlaidItemGetResponse>(
      "/item/webhook/update",
      this.withAuth({ access_token: accessToken, webhook }),
    );
    return data;
  }

  // ==================== Accounts ====================

  /** List all accounts associated with an Item. */
  async getAccounts(params: PlaidAccountsGetRequest): Promise<PlaidAccountsGetResponse> {
    const { data } = await this.post<PlaidAccountsGetResponse>(
      "/accounts/get",
      this.withAuth(params),
    );
    return data;
  }

  // ==================== Balances ====================

  /** Retrieve real-time balance data for each account. */
  async getBalances(params: PlaidBalanceGetRequest): Promise<PlaidBalanceGetResponse> {
    const { data } = await this.post<PlaidBalanceGetResponse>(
      "/accounts/balance/get",
      this.withAuth(params),
    );
    return data;
  }

  // ==================== Transactions ====================

  /**
   * Sync transactions incrementally using a cursor.
   * First call: omit `cursor` to get all historical transactions.
   * Subsequent calls: pass the `next_cursor` from the previous response.
   */
  async syncTransactions(params: PlaidTransactionsSyncRequest): Promise<PlaidTransactionsSyncResponse> {
    const { data } = await this.post<PlaidTransactionsSyncResponse>(
      "/transactions/sync",
      this.withAuth(params),
    );
    return data;
  }

  /**
   * Fetch all transactions in a date range using the sync endpoint.
   * Handles pagination automatically.
   */
  async syncAllTransactions(
    accessToken: string,
    cursor?: string,
  ): Promise<{ added: PlaidTransactionsSyncResponse["added"]; modified: PlaidTransactionsSyncResponse["modified"]; removed: PlaidTransactionsSyncResponse["removed"]; cursor: string }> {
    const added: PlaidTransactionsSyncResponse["added"] = [];
    const modified: PlaidTransactionsSyncResponse["modified"] = [];
    const removed: PlaidTransactionsSyncResponse["removed"] = [];
    let currentCursor = cursor ?? "";
    let hasMore = true;

    while (hasMore) {
      const response = await this.syncTransactions({
        access_token: accessToken,
        cursor: currentCursor || undefined,
        count: 500,
        options: { include_personal_finance_category: true },
      });

      added.push(...response.added);
      modified.push(...response.modified);
      removed.push(...response.removed);
      currentCursor = response.next_cursor;
      hasMore = response.has_more;
    }

    return { added, modified, removed, cursor: currentCursor };
  }

  /** Fetch transactions for a date range (legacy endpoint). */
  async getTransactions(params: PlaidTransactionsGetRequest): Promise<PlaidTransactionsGetResponse> {
    const { data } = await this.post<PlaidTransactionsGetResponse>(
      "/transactions/get",
      this.withAuth(params),
    );
    return data;
  }

  /**
   * Fetch all transactions for a date range, handling pagination automatically.
   */
  async getAllTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
    accountIds?: string[],
  ): Promise<PlaidTransactionsGetResponse["transactions"]> {
    const allTransactions: PlaidTransactionsGetResponse["transactions"] = [];
    let offset = 0;
    const count = 500;

    while (true) {
      const response = await this.getTransactions({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: {
          account_ids: accountIds,
          count,
          offset,
          include_personal_finance_category: true,
        },
      });

      allTransactions.push(...response.transactions);

      if (allTransactions.length >= response.total_transactions) break;
      offset += count;
    }

    return allTransactions;
  }

  // ==================== Identity ====================

  /** Retrieve identity data (name, email, phone, address) for account holders. */
  async getIdentity(params: PlaidIdentityGetRequest): Promise<PlaidIdentityGetResponse> {
    const { data } = await this.post<PlaidIdentityGetResponse>(
      "/identity/get",
      this.withAuth(params),
    );
    return data;
  }

  // ==================== Webhook Verification ====================

  /** Get the verification key used to verify webhook JWTs from Plaid. */
  async getWebhookVerificationKey(keyId: string): Promise<PlaidWebhookVerificationKeyResponse> {
    const { data } = await this.post<PlaidWebhookVerificationKeyResponse>(
      "/webhook_verification_key/get",
      this.withAuth({ key_id: keyId }),
    );
    return data;
  }

  // ==================== Connection Test ====================

  /** Test the connection by creating a sandbox link token. */
  async testConnection(): Promise<boolean> {
    try {
      await this.createLinkToken({
        client_name: "Connection Test",
        language: "en",
        country_codes: ["US"],
        user: { client_user_id: "test" },
        products: ["transactions"],
      });
      return true;
    } catch {
      return false;
    }
  }
}
