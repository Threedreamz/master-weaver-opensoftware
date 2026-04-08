import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  DBAccount,
  DBAccountsResponse,
  DBBalance,
  DBBalancesResponse,
  DBTransaction,
  DBTransactionsResponse,
  DBTransactionsParams,
  DBClientConfig,
  DBConsentRequest,
  DBConsentResponse,
} from "./types.js";

// ==================== Deutsche Bank PSD2 Client ====================

const DB_BASE_URL = "https://api.db.com/gw/dbapi/banking/v2";
const DB_AUTH_URL = "https://api.db.com/gw/oidc/authorize";
const DB_TOKEN_URL = "https://api.db.com/gw/oidc/token";
const DB_SCOPES = ["read_accounts", "read_transactions"];

/**
 * Deutsche Bank PSD2 Open Banking client.
 *
 * Implements the Deutsche Bank dbAPI which follows PSD2/XS2A standards
 * with bank-specific extensions. Requires TPP registration with
 * Deutsche Bank's developer portal and valid eIDAS certificates.
 */
export class DeutscheBankClient extends BaseIntegrationClient {
  private oauth: OAuthManager;
  private tokens: OAuthTokens;
  private consentId: string | undefined;
  private psuIpAddress: string | undefined;

  constructor(private config: DBClientConfig) {
    super({
      baseUrl: DB_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      rateLimit: { requestsPerMinute: 30 },
      timeout: 30_000,
    });

    this.oauth = new OAuthManager({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: DB_AUTH_URL,
      tokenUrl: DB_TOKEN_URL,
      scopes: DB_SCOPES,
      redirectUri: config.redirectUri,
    });

    this.tokens = {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
    };

    this.consentId = config.consentId;
    this.psuIpAddress = config.psuIpAddress;
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

  // ==================== PSD2 Consent Management ====================

  /**
   * Create a consent for account information access.
   * Returns a redirect URL for SCA (Strong Customer Authentication).
   */
  async createConsent(
    consentRequest: DBConsentRequest
  ): Promise<DBConsentResponse> {
    await this.ensureValidToken();

    const response = await this.request<DBConsentResponse>({
      method: "POST",
      path: "/consents",
      body: consentRequest,
      headers: this.getPSD2Headers(),
    });

    this.consentId = response.data.consentId;
    return response.data;
  }

  /**
   * Create a consent for all accounts belonging to the PSU.
   * Convenience method for the common use case.
   */
  async createAllAccountsConsent(
    ibans: string[],
    validUntilDays: number = 90,
    frequencyPerDay: number = 4
  ): Promise<DBConsentResponse> {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validUntilDays);

    const ibanAccess = ibans.map((iban) => ({ iban }));

    return this.createConsent({
      accounts: ibanAccess,
      balances: ibanAccess,
      transactions: ibanAccess,
      validUntil: validUntil.toISOString().split("T")[0]!,
      frequencyPerDay,
      recurringIndicator: true,
    });
  }

  /**
   * Delete (revoke) an existing consent.
   */
  async deleteConsent(consentId?: string): Promise<void> {
    await this.ensureValidToken();
    const id = consentId ?? this.consentId;
    if (!id) {
      throw new IntegrationError("VALIDATION_ERROR", "No consent ID available");
    }

    await this.delete(`/consents/${id}`);
    if (id === this.consentId) {
      this.consentId = undefined;
    }
  }

  /** Set the active consent ID after SCA redirect */
  setConsentId(consentId: string): void {
    this.consentId = consentId;
  }

  // ==================== Accounts ====================

  /**
   * List all accounts the TPP has consent to access.
   */
  async listAccounts(): Promise<DBAccount[]> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<DBAccountsResponse>({
      method: "GET",
      path: "/accounts",
      headers: this.getPSD2Headers(),
    });
    return response.data.accounts;
  }

  /**
   * Get a single account by its resource ID.
   */
  async getAccount(accountId: string): Promise<DBAccount> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<DBAccount>({
      method: "GET",
      path: `/accounts/${accountId}`,
      headers: this.getPSD2Headers(),
    });
    return response.data;
  }

  // ==================== Balances ====================

  /**
   * Get balances for an account.
   * Returns multiple balance types (closingBooked, interimAvailable, etc.)
   */
  async getBalances(accountId: string): Promise<DBBalance[]> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<DBBalancesResponse>({
      method: "GET",
      path: `/accounts/${accountId}/balances`,
      headers: this.getPSD2Headers(),
    });
    return response.data.balances;
  }

  // ==================== Transactions ====================

  /**
   * List transactions for an account with optional filters.
   * Supports date range, booking status, and pagination.
   */
  async listTransactions(
    params: DBTransactionsParams
  ): Promise<DBTransactionsResponse> {
    await this.ensureValidToken();
    this.requireConsent();

    const queryParams: Record<string, string> = {};
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params.dateTo) queryParams.dateTo = params.dateTo;
    if (params.bookingStatus) queryParams.bookingStatus = params.bookingStatus;
    if (params.limit != null) queryParams.limit = String(params.limit);
    if (params.page != null) queryParams.page = String(params.page);

    const response = await this.request<DBTransactionsResponse>({
      method: "GET",
      path: `/accounts/${params.accountId}/transactions`,
      params: queryParams,
      headers: this.getPSD2Headers(),
    });
    return response.data;
  }

  /**
   * Fetch all booked transactions for a date range across all pages.
   */
  async getAllTransactions(
    accountId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<DBTransaction[]> {
    const allTransactions: DBTransaction[] = [];
    let page = 0;
    let hasMore = true;
    const pageSize = 100;

    while (hasMore) {
      const response = await this.listTransactions({
        accountId,
        dateFrom,
        dateTo,
        bookingStatus: "booked",
        limit: pageSize,
        page,
      });

      allTransactions.push(...response.transactions);

      const totalPages = response.totalPages ?? 1;
      page++;
      hasMore = page < totalPages;
    }

    return allTransactions;
  }

  // ==================== Connection Test ====================

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      if (this.consentId) {
        await this.listAccounts();
      }
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Private Helpers ====================

  private updateCredentials(accessToken: string): void {
    this.credentials = { accessToken };
  }

  private requireConsent(): void {
    if (!this.consentId) {
      throw new IntegrationError(
        "VALIDATION_ERROR",
        "A valid PSD2 consent is required. Call createConsent() first."
      );
    }
  }

  /**
   * Build PSD2-compliant request headers.
   */
  private getPSD2Headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "X-Request-ID": crypto.randomUUID(),
    };
    if (this.consentId) {
      headers["Consent-ID"] = this.consentId;
    }
    if (this.psuIpAddress) {
      headers["PSU-IP-Address"] = this.psuIpAddress;
    }
    return headers;
  }
}
