import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  VividAccount,
  VividAccountsResponse,
  VividBalance,
  VividBalanceResponse,
  VividTransaction,
  VividTransactionsResponse,
  VividTransactionsParams,
  VividClientConfig,
} from "./types.js";

// ==================== Vivid Money Client ====================

const VIVID_BASE_URL = "https://api.vivid.money/v1";
const VIVID_AUTH_URL = "https://api.vivid.money/oauth2/authorize";
const VIVID_TOKEN_URL = "https://api.vivid.money/oauth2/token";
const VIVID_SCOPES = ["accounts:read", "transactions:read", "balances:read"];

export class VividClient extends BaseIntegrationClient {
  private oauth: OAuthManager;
  private tokens: OAuthTokens;

  constructor(private config: VividClientConfig) {
    super({
      baseUrl: VIVID_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      rateLimit: { requestsPerMinute: 30 },
      timeout: 30_000,
    });

    this.oauth = new OAuthManager({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: VIVID_AUTH_URL,
      tokenUrl: VIVID_TOKEN_URL,
      scopes: VIVID_SCOPES,
      redirectUri: config.redirectUri,
    });

    this.tokens = {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
    };
  }

  // ==================== Token Management ====================

  /**
   * Generate the OAuth2 authorization URL.
   * Redirect the user to this URL to start the consent flow.
   */
  getAuthorizationUrl(state: string): string {
    return this.oauth.getAuthorizationUrl(state);
  }

  /**
   * Exchange an authorization code for access + refresh tokens.
   */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    this.tokens = await this.oauth.exchangeCode(code);
    this.updateCredentials(this.tokens.accessToken);
    return this.tokens;
  }

  /**
   * Ensure the current access token is valid, refreshing if needed.
   */
  async ensureValidToken(): Promise<void> {
    const refreshed = await this.oauth.getValidTokens(this.tokens);
    if (refreshed.accessToken !== this.tokens.accessToken) {
      this.tokens = refreshed;
      this.updateCredentials(refreshed.accessToken);
    }
  }

  /** Get current tokens for persistence */
  getTokens(): OAuthTokens {
    return { ...this.tokens };
  }

  // ==================== Accounts ====================

  /**
   * List all accounts linked to the authenticated user.
   */
  async listAccounts(): Promise<VividAccount[]> {
    await this.ensureValidToken();
    const response = await this.get<VividAccountsResponse>("/accounts");
    return response.data.accounts;
  }

  /**
   * Get a single account by ID.
   */
  async getAccount(accountId: string): Promise<VividAccount> {
    await this.ensureValidToken();
    const response = await this.get<VividAccount>(`/accounts/${accountId}`);
    return response.data;
  }

  // ==================== Balances ====================

  /**
   * Get balances for a specific account.
   */
  async getBalances(accountId: string): Promise<VividBalance[]> {
    await this.ensureValidToken();
    const response = await this.get<VividBalanceResponse>(
      `/accounts/${accountId}/balances`
    );
    return response.data.balances;
  }

  // ==================== Transactions ====================

  /**
   * List transactions for an account with optional filters.
   */
  async listTransactions(
    params: VividTransactionsParams
  ): Promise<VividTransactionsResponse> {
    await this.ensureValidToken();

    const queryParams: Record<string, string> = {};
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params.dateTo) queryParams.dateTo = params.dateTo;
    if (params.limit != null) queryParams.limit = String(params.limit);
    if (params.offset != null) queryParams.offset = String(params.offset);

    const response = await this.get<VividTransactionsResponse>(
      `/accounts/${params.accountId}/transactions`,
      queryParams
    );
    return response.data;
  }

  /**
   * Get a single transaction by ID.
   */
  async getTransaction(
    accountId: string,
    transactionId: string
  ): Promise<VividTransaction> {
    await this.ensureValidToken();
    const response = await this.get<VividTransaction>(
      `/accounts/${accountId}/transactions/${transactionId}`
    );
    return response.data;
  }

  /**
   * Fetch all transactions across pages for a given date range.
   */
  async getAllTransactions(
    accountId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<VividTransaction[]> {
    const allTransactions: VividTransaction[] = [];
    const pageSize = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.listTransactions({
        accountId,
        dateFrom,
        dateTo,
        limit: pageSize,
        offset,
      });

      allTransactions.push(...response.transactions);
      hasMore = response.pagination.hasMore;
      offset += pageSize;
    }

    return allTransactions;
  }

  // ==================== Connection Test ====================

  /**
   * Test the connection by fetching accounts.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listAccounts();
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Private Helpers ====================

  private updateCredentials(accessToken: string): void {
    this.credentials = { accessToken };
  }
}
