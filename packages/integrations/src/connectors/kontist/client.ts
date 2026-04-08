import { BaseIntegrationClient } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  KontistClientConfig,
  KontistUser,
  KontistAccount,
  KontistTransaction,
  KontistTransactionsResponse,
  KontistTransactionsParams,
  KontistTaxEstimate,
  KontistAnnualTaxEstimate,
  KontistCreateTransferRequest,
  KontistTransfer,
  KontistCreateStandingOrderRequest,
  KontistStandingOrder,
  KontistTaxCategory,
} from "./types.js";

const KONTIST_BASE_URL = "https://api.kontist.com/api";
const KONTIST_AUTH_URL = "https://api.kontist.com/api/oauth/authorize";
const KONTIST_TOKEN_URL = "https://api.kontist.com/api/oauth/token";
const KONTIST_SCOPES = ["transactions", "accounts", "transfers", "users"];

/**
 * Kontist API client.
 *
 * Kontist is a German banking app for freelancers and self-employed professionals.
 * Supports: transactions, tax estimates, transfers, standing orders, account info.
 * Auth: OAuth2 Bearer token.
 */
export class KontistClient extends BaseIntegrationClient {
  private oauth: OAuthManager;
  private tokens: OAuthTokens;

  constructor(private config: KontistClientConfig) {
    super({
      baseUrl: KONTIST_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
    });

    this.oauth = new OAuthManager({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: KONTIST_AUTH_URL,
      tokenUrl: KONTIST_TOKEN_URL,
      scopes: KONTIST_SCOPES,
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

  // ==================== User ====================

  /** Get the authenticated user profile. */
  async getUser(): Promise<ApiResponse<KontistUser>> {
    await this.ensureValidToken();
    return this.get<KontistUser>("/user");
  }

  // ==================== Account ====================

  /** Get the main bank account. */
  async getAccount(): Promise<ApiResponse<KontistAccount>> {
    await this.ensureValidToken();
    return this.get<KontistAccount>("/accounts/me");
  }

  // ==================== Transactions ====================

  /** List transactions with optional filters. */
  async listTransactions(
    params?: KontistTransactionsParams
  ): Promise<ApiResponse<KontistTransactionsResponse>> {
    await this.ensureValidToken();
    const queryParams: Record<string, string> = {};
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;
    if (params?.type) queryParams.type = params.type;
    if (params?.status) queryParams.status = params.status;
    if (params?.category) queryParams.category = params.category;
    if (params?.page != null) queryParams.page = String(params.page);
    if (params?.pageSize != null) queryParams.pageSize = String(params.pageSize);

    return this.get<KontistTransactionsResponse>("/transactions", queryParams);
  }

  /** Get a single transaction by ID. */
  async getTransaction(transactionId: string): Promise<ApiResponse<KontistTransaction>> {
    await this.ensureValidToken();
    return this.get<KontistTransaction>(`/transactions/${transactionId}`);
  }

  /** Update the category of a transaction (for tax estimation). */
  async categorizeTransaction(
    transactionId: string,
    category: KontistTaxCategory
  ): Promise<ApiResponse<KontistTransaction>> {
    await this.ensureValidToken();
    return this.patch<KontistTransaction>(`/transactions/${transactionId}`, {
      category,
    });
  }

  /** Add a personal note to a transaction. */
  async addTransactionNote(
    transactionId: string,
    note: string
  ): Promise<ApiResponse<KontistTransaction>> {
    await this.ensureValidToken();
    return this.patch<KontistTransaction>(`/transactions/${transactionId}`, {
      personalNote: note,
    });
  }

  /**
   * Fetch all transactions across all pages.
   */
  async getAllTransactions(
    from?: string,
    to?: string
  ): Promise<KontistTransaction[]> {
    const allTransactions: KontistTransaction[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.listTransactions({
        from,
        to,
        page,
        pageSize: 100,
      });

      allTransactions.push(...response.data.items);

      const paging = response.data.paging;
      hasMore = page < paging.totalPages;
      page++;
    }

    return allTransactions;
  }

  // ==================== Tax Estimates ====================

  /**
   * Get the current tax estimate for the authenticated user.
   * Kontist automatically calculates tax obligations based on transactions.
   */
  async getTaxEstimate(year?: number): Promise<ApiResponse<KontistAnnualTaxEstimate>> {
    await this.ensureValidToken();
    const targetYear = year ?? new Date().getFullYear();
    return this.get<KontistAnnualTaxEstimate>(`/tax-estimates/${targetYear}`);
  }

  /**
   * Get monthly tax estimates for a specific year.
   */
  async getMonthlyTaxEstimates(
    year?: number
  ): Promise<ApiResponse<{ estimates: KontistTaxEstimate[] }>> {
    await this.ensureValidToken();
    const targetYear = year ?? new Date().getFullYear();
    return this.get<{ estimates: KontistTaxEstimate[] }>(
      `/tax-estimates/${targetYear}/monthly`
    );
  }

  // ==================== Transfers ====================

  /**
   * Create a SEPA credit transfer.
   * Requires confirmation via the Kontist app or a second factor.
   */
  async createTransfer(
    data: KontistCreateTransferRequest
  ): Promise<ApiResponse<KontistTransfer>> {
    await this.ensureValidToken();
    return this.post<KontistTransfer>("/transfers", data);
  }

  /** Get a transfer by ID. */
  async getTransfer(transferId: string): Promise<ApiResponse<KontistTransfer>> {
    await this.ensureValidToken();
    return this.get<KontistTransfer>(`/transfers/${transferId}`);
  }

  /**
   * Confirm a transfer (submit the TAN/confirmation code).
   */
  async confirmTransfer(
    transferId: string,
    confirmationCode: string
  ): Promise<ApiResponse<KontistTransfer>> {
    await this.ensureValidToken();
    return this.put<KontistTransfer>(`/transfers/${transferId}/confirm`, {
      authorizationToken: confirmationCode,
    });
  }

  // ==================== Standing Orders ====================

  /** Create a standing order (recurring transfer). */
  async createStandingOrder(
    data: KontistCreateStandingOrderRequest
  ): Promise<ApiResponse<KontistStandingOrder>> {
    await this.ensureValidToken();
    return this.post<KontistStandingOrder>("/standing-orders", data);
  }

  /** List all active standing orders. */
  async listStandingOrders(): Promise<ApiResponse<{ items: KontistStandingOrder[] }>> {
    await this.ensureValidToken();
    return this.get<{ items: KontistStandingOrder[] }>("/standing-orders");
  }

  /** Cancel a standing order. */
  async cancelStandingOrder(standingOrderId: string): Promise<ApiResponse<void>> {
    await this.ensureValidToken();
    return this.delete<void>(`/standing-orders/${standingOrderId}`);
  }

  // ==================== Connection Test ====================

  /** Verify credentials by fetching the user profile. */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      const response = await this.getUser();
      return response.status === 200 && !!response.data.id;
    } catch {
      return false;
    }
  }

  // ==================== Private Helpers ====================

  private updateCredentials(accessToken: string): void {
    this.credentials = { accessToken };
  }
}
