import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  N26Account,
  N26AccountsResponse,
  N26Balance,
  N26Transaction,
  N26TransactionsResponse,
  N26TransactionsParams,
  N26ClientConfig,
} from "./types.js";

// ==================== N26 Business Client ====================

const N26_BASE_URL = "https://api.tech26.de/api";
const N26_AUTH_URL = "https://api.tech26.de/oauth2/authorize";
const N26_TOKEN_URL = "https://api.tech26.de/oauth2/token";
const N26_SCOPES = ["read", "accounts:read", "transactions:read"];

export class N26Client extends BaseIntegrationClient {
  private oauth: OAuthManager;
  private tokens: OAuthTokens;

  constructor(private config: N26ClientConfig) {
    super({
      baseUrl: N26_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      rateLimit: { requestsPerMinute: 30 },
      timeout: 30_000,
      defaultHeaders: {
        "User-Agent": "OpenSoftware-Integration/1.0",
      },
    });

    this.oauth = new OAuthManager({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: N26_AUTH_URL,
      tokenUrl: N26_TOKEN_URL,
      scopes: N26_SCOPES,
      redirectUri: config.redirectUri,
    });

    this.tokens = {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
    };
  }

  // ==================== Token Management ====================

  /**
   * Generate the OAuth2 authorization URL for user consent.
   */
  getAuthorizationUrl(state: string): string {
    return this.oauth.getAuthorizationUrl(state);
  }

  /**
   * Exchange an authorization code for tokens.
   */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    this.tokens = await this.oauth.exchangeCode(code);
    this.updateCredentials(this.tokens.accessToken);
    return this.tokens;
  }

  /**
   * Ensure the access token is valid, refreshing if expired.
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
   * List all accounts for the authenticated N26 Business user.
   */
  async listAccounts(): Promise<N26Account[]> {
    await this.ensureValidToken();
    const response = await this.get<N26AccountsResponse>("/accounts");
    return response.data.data;
  }

  /**
   * Get a single account by ID.
   */
  async getAccount(accountId: string): Promise<N26Account> {
    await this.ensureValidToken();
    const response = await this.get<N26Account>(`/accounts/${accountId}`);
    return response.data;
  }

  // ==================== Balances ====================

  /**
   * Get the balance for the primary account.
   * N26 returns a single balance object for the main account.
   */
  async getBalance(): Promise<N26Balance> {
    await this.ensureValidToken();
    const response = await this.get<N26Balance>("/accounts/balance");
    return response.data;
  }

  // ==================== Transactions ====================

  /**
   * List transactions with optional filters.
   * N26 uses Unix timestamps in milliseconds for date filtering.
   */
  async listTransactions(
    params: N26TransactionsParams = {}
  ): Promise<N26TransactionsResponse> {
    await this.ensureValidToken();

    const queryParams: Record<string, string> = {};
    if (params.from != null) queryParams.from = String(params.from);
    if (params.to != null) queryParams.to = String(params.to);
    if (params.limit != null) queryParams.limit = String(params.limit);
    if (params.offset != null) queryParams.offset = String(params.offset);
    if (params.textFilter) queryParams.textFilter = params.textFilter;

    const response = await this.get<N26TransactionsResponse>(
      "/smrt/transactions",
      queryParams
    );
    return response.data;
  }

  /**
   * Get a single transaction by ID.
   */
  async getTransaction(transactionId: string): Promise<N26Transaction> {
    await this.ensureValidToken();
    const response = await this.get<N26Transaction>(
      `/smrt/transactions/${transactionId}`
    );
    return response.data;
  }

  /**
   * Fetch all transactions across pages for a given date range.
   * Converts ISO date strings to N26 millisecond timestamps.
   */
  async getAllTransactions(
    dateFrom: string,
    dateTo: string
  ): Promise<N26Transaction[]> {
    const from = new Date(dateFrom).getTime();
    const to = new Date(dateTo).getTime();
    const allTransactions: N26Transaction[] = [];
    const pageSize = 50;
    let offset = 0;
    let fetchMore = true;

    while (fetchMore) {
      const response = await this.listTransactions({
        from,
        to,
        limit: pageSize,
        offset,
      });

      allTransactions.push(...response.data);

      if (response.data.length < pageSize) {
        fetchMore = false;
      } else {
        offset += pageSize;
      }
    }

    return allTransactions;
  }

  // ==================== Connection Test ====================

  /**
   * Test the connection by fetching the account balance.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getBalance();
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
