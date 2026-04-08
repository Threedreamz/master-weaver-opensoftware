import { BaseIntegrationClient } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  FigoClientConfig,
  FinAPIBank,
  FinAPIBankConnection,
  FinAPIImportBankConnectionRequest,
  FinAPIImportBankConnectionResponse,
  FinAPIAccount,
  FinAPIAccountsResponse,
  FinAPIAccountsParams,
  FinAPITransaction,
  FinAPITransactionsResponse,
  FinAPITransactionsParams,
  FinAPICategory,
  FinAPICategoriesResponse,
  FinAPILabel,
  FinAPILabelsResponse,
  FinAPICategorizeTransactionsRequest,
} from "./types.js";

const FINAPI_PRODUCTION_URL = "https://live.finapi.io/api/v2";
const FINAPI_SANDBOX_URL = "https://sandbox.finapi.io/api/v2";
const FINAPI_AUTH_URL = "https://live.finapi.io/oauth/authorize";
const FINAPI_TOKEN_URL = "https://live.finapi.io/oauth/token";
const FINAPI_SANDBOX_AUTH_URL = "https://sandbox.finapi.io/oauth/authorize";
const FINAPI_SANDBOX_TOKEN_URL = "https://sandbox.finapi.io/oauth/token";

/**
 * figo / finAPI client.
 *
 * finAPI is the German multi-banking API (successor to figo).
 * Supports: bank connections, accounts, transactions, categorization, labels.
 * Auth: OAuth2 Bearer token.
 */
export class FigoClient extends BaseIntegrationClient {
  private oauth: OAuthManager;
  private tokens: OAuthTokens;
  private isSandbox: boolean;

  constructor(private config: FigoClientConfig) {
    const isSandbox = config.sandbox ?? false;
    const baseUrl = isSandbox ? FINAPI_SANDBOX_URL : FINAPI_PRODUCTION_URL;

    super({
      baseUrl,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
    });

    this.isSandbox = isSandbox;

    this.oauth = new OAuthManager({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: isSandbox ? FINAPI_SANDBOX_AUTH_URL : FINAPI_AUTH_URL,
      tokenUrl: isSandbox ? FINAPI_SANDBOX_TOKEN_URL : FINAPI_TOKEN_URL,
      scopes: [],
      redirectUri: config.redirectUri,
    });

    this.tokens = {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
    };
  }

  // ==================== Token Management ====================

  getAuthorizationUrl(state: string): string {
    return this.oauth.getAuthorizationUrl(state);
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    this.tokens = await this.oauth.exchangeCode(code);
    this.updateCredentials(this.tokens.accessToken);
    return this.tokens;
  }

  async ensureValidToken(): Promise<void> {
    const refreshed = await this.oauth.getValidTokens(this.tokens);
    if (refreshed.accessToken !== this.tokens.accessToken) {
      this.tokens = refreshed;
      this.updateCredentials(refreshed.accessToken);
    }
  }

  getTokens(): OAuthTokens {
    return { ...this.tokens };
  }

  // ==================== Banks ====================

  /** Search for banks by name, BIC, or BLZ. */
  async searchBanks(
    search: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<ApiResponse<{ banks: FinAPIBank[]; paging: { totalCount: number } }>> {
    await this.ensureValidToken();
    return this.get<{ banks: FinAPIBank[]; paging: { totalCount: number } }>("/banks", {
      search,
      page: String(page),
      perPage: String(perPage),
    });
  }

  /** Get a bank by ID. */
  async getBank(bankId: number): Promise<ApiResponse<FinAPIBank>> {
    await this.ensureValidToken();
    return this.get<FinAPIBank>(`/banks/${bankId}`);
  }

  // ==================== Bank Connections ====================

  /**
   * Import (create) a new bank connection.
   * Initiates the connection to a bank via PSD2 or screen scraping.
   */
  async importBankConnection(
    params: FinAPIImportBankConnectionRequest
  ): Promise<ApiResponse<FinAPIImportBankConnectionResponse>> {
    await this.ensureValidToken();
    return this.post<FinAPIImportBankConnectionResponse>(
      "/bankConnections/import",
      params
    );
  }

  /** List all bank connections. */
  async listBankConnections(): Promise<ApiResponse<{ connections: FinAPIBankConnection[] }>> {
    await this.ensureValidToken();
    return this.get<{ connections: FinAPIBankConnection[] }>("/bankConnections");
  }

  /** Get a bank connection by ID. */
  async getBankConnection(connectionId: number): Promise<ApiResponse<FinAPIBankConnection>> {
    await this.ensureValidToken();
    return this.get<FinAPIBankConnection>(`/bankConnections/${connectionId}`);
  }

  /** Update a bank connection (trigger re-sync). */
  async updateBankConnection(
    connectionId: number,
    params?: { bankingPin?: string; storePin?: boolean; challengeResponse?: string; redirectUrl?: string }
  ): Promise<ApiResponse<FinAPIBankConnection>> {
    await this.ensureValidToken();
    return this.post<FinAPIBankConnection>(
      `/bankConnections/update`,
      { bankConnectionId: connectionId, ...params }
    );
  }

  /** Delete a bank connection. */
  async deleteBankConnection(connectionId: number): Promise<ApiResponse<void>> {
    await this.ensureValidToken();
    return this.delete<void>(`/bankConnections/${connectionId}`);
  }

  // ==================== Accounts ====================

  /** List accounts with optional filters. */
  async listAccounts(
    params?: FinAPIAccountsParams
  ): Promise<ApiResponse<FinAPIAccountsResponse>> {
    await this.ensureValidToken();
    const queryParams: Record<string, string> = {};
    if (params?.ids?.length) queryParams.ids = params.ids.join(",");
    if (params?.search) queryParams.search = params.search;
    if (params?.bankConnectionIds?.length) queryParams.bankConnectionIds = params.bankConnectionIds.join(",");
    if (params?.minBalance != null) queryParams.minBalance = String(params.minBalance);
    if (params?.maxBalance != null) queryParams.maxBalance = String(params.maxBalance);
    if (params?.page != null) queryParams.page = String(params.page);
    if (params?.perPage != null) queryParams.perPage = String(params.perPage);
    if (params?.order?.length) queryParams.order = params.order.join(",");

    return this.get<FinAPIAccountsResponse>("/accounts", queryParams);
  }

  /** Get an account by ID. */
  async getAccount(accountId: number): Promise<ApiResponse<FinAPIAccount>> {
    await this.ensureValidToken();
    return this.get<FinAPIAccount>(`/accounts/${accountId}`);
  }

  /** Delete an account. */
  async deleteAccount(accountId: number): Promise<ApiResponse<void>> {
    await this.ensureValidToken();
    return this.delete<void>(`/accounts/${accountId}`);
  }

  // ==================== Transactions ====================

  /** List transactions with filters. */
  async listTransactions(
    params: FinAPITransactionsParams
  ): Promise<ApiResponse<FinAPITransactionsResponse>> {
    await this.ensureValidToken();
    const queryParams: Record<string, string> = {
      view: params.view,
    };
    if (params.ids?.length) queryParams.ids = params.ids.join(",");
    if (params.search) queryParams.search = params.search;
    if (params.counterpart) queryParams.counterpart = params.counterpart;
    if (params.purpose) queryParams.purpose = params.purpose;
    if (params.accountIds?.length) queryParams.accountIds = params.accountIds.join(",");
    if (params.minBankBookingDate) queryParams.minBankBookingDate = params.minBankBookingDate;
    if (params.maxBankBookingDate) queryParams.maxBankBookingDate = params.maxBankBookingDate;
    if (params.minAmount != null) queryParams.minAmount = String(params.minAmount);
    if (params.maxAmount != null) queryParams.maxAmount = String(params.maxAmount);
    if (params.direction) queryParams.direction = params.direction;
    if (params.labelIds?.length) queryParams.labelIds = params.labelIds.join(",");
    if (params.categoryIds?.length) queryParams.categoryIds = params.categoryIds.join(",");
    if (params.isNew != null) queryParams.isNew = String(params.isNew);
    if (params.page != null) queryParams.page = String(params.page);
    if (params.perPage != null) queryParams.perPage = String(params.perPage);
    if (params.order?.length) queryParams.order = params.order.join(",");

    return this.get<FinAPITransactionsResponse>("/transactions", queryParams);
  }

  /** Get a single transaction by ID. */
  async getTransaction(transactionId: number): Promise<ApiResponse<FinAPITransaction>> {
    await this.ensureValidToken();
    return this.get<FinAPITransaction>(`/transactions/${transactionId}`);
  }

  /**
   * Fetch all transactions across pages for given accounts.
   */
  async getAllTransactions(
    accountIds: number[],
    minBankBookingDate?: string,
    maxBankBookingDate?: string
  ): Promise<FinAPITransaction[]> {
    const allTransactions: FinAPITransaction[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.listTransactions({
        view: "userView",
        accountIds,
        minBankBookingDate,
        maxBankBookingDate,
        page,
        perPage: 500,
      });

      allTransactions.push(...response.data.transactions);

      const paging = response.data.paging;
      hasMore = page < paging.pageCount;
      page++;
    }

    return allTransactions;
  }

  // ==================== Categorization ====================

  /** Categorize transactions (assign a category). */
  async categorizeTransactions(
    params: FinAPICategorizeTransactionsRequest
  ): Promise<ApiResponse<void>> {
    await this.ensureValidToken();
    return this.post<void>("/transactions/categorize", params);
  }

  /** List all categories. */
  async listCategories(
    page: number = 1,
    perPage: number = 100
  ): Promise<ApiResponse<FinAPICategoriesResponse>> {
    await this.ensureValidToken();
    return this.get<FinAPICategoriesResponse>("/categories", {
      page: String(page),
      perPage: String(perPage),
    });
  }

  // ==================== Labels ====================

  /** List all labels. */
  async listLabels(
    page: number = 1,
    perPage: number = 100
  ): Promise<ApiResponse<FinAPILabelsResponse>> {
    await this.ensureValidToken();
    return this.get<FinAPILabelsResponse>("/labels", {
      page: String(page),
      perPage: String(perPage),
    });
  }

  /** Create a label. */
  async createLabel(name: string): Promise<ApiResponse<FinAPILabel>> {
    await this.ensureValidToken();
    return this.post<FinAPILabel>("/labels", { name });
  }

  /** Delete a label. */
  async deleteLabel(labelId: number): Promise<ApiResponse<void>> {
    await this.ensureValidToken();
    return this.delete<void>(`/labels/${labelId}`);
  }

  // ==================== Connection Test ====================

  /** Verify credentials by listing bank connections. */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      const response = await this.listBankConnections();
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // ==================== Private Helpers ====================

  private updateCredentials(accessToken: string): void {
    this.credentials = { accessToken };
  }
}
