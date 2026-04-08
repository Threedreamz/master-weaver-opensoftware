import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  PostbankAccount,
  PostbankAccountsResponse,
  PostbankBalance,
  PostbankBalancesResponse,
  PostbankTransaction,
  PostbankTransactionsResponse,
  PostbankTransactionsParams,
  PostbankClientConfig,
  PostbankConsentRequest,
  PostbankConsentResponse,
  PostbankConsentStatusResponse,
} from "./types.js";

// ==================== Postbank PSD2 Client ====================

// Postbank uses Deutsche Bank's API infrastructure
const PB_BASE_URL = "https://api.postbank.de/gw/dbapi/banking/v2";
const PB_AUTH_URL = "https://api.postbank.de/gw/oidc/authorize";
const PB_TOKEN_URL = "https://api.postbank.de/gw/oidc/token";
const PB_SCOPES = ["read_accounts", "read_transactions"];

/**
 * Postbank PSD2 Open Banking client.
 *
 * Postbank (a subsidiary of Deutsche Bank) implements the PSD2/XS2A interface.
 * Requires TPP registration and valid eIDAS certificates.
 *
 * Supports: accounts, balances, transactions, consent management.
 * Auth: OAuth2 with PSD2 consent flow.
 */
export class PostbankClient extends BaseIntegrationClient {
  private oauth: OAuthManager;
  private tokens: OAuthTokens;
  private consentId: string | undefined;
  private psuIpAddress: string | undefined;

  constructor(private config: PostbankClientConfig) {
    super({
      baseUrl: PB_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      rateLimit: { requestsPerMinute: 30 },
      timeout: 30_000,
    });

    this.oauth = new OAuthManager({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: PB_AUTH_URL,
      tokenUrl: PB_TOKEN_URL,
      scopes: PB_SCOPES,
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
   * Create a new consent for account information access.
   */
  async createConsent(consentRequest: PostbankConsentRequest): Promise<PostbankConsentResponse> {
    await this.ensureValidToken();

    const response = await this.request<PostbankConsentResponse>({
      method: "POST",
      path: "/consents",
      body: consentRequest,
      headers: this.getPSD2Headers(),
    });

    this.consentId = response.data.consentId;
    return response.data;
  }

  /**
   * Create a consent requesting access to all accounts.
   */
  async createAllAccountsConsent(
    validUntilDays: number = 90,
    frequencyPerDay: number = 4
  ): Promise<PostbankConsentResponse> {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validUntilDays);

    return this.createConsent({
      access: { availableAccounts: "allAccountsWithOwnerName" },
      recurringIndicator: true,
      validUntil: validUntil.toISOString().split("T")[0]!,
      frequencyPerDay,
    });
  }

  /**
   * Check the status of an existing consent.
   */
  async getConsentStatus(consentId?: string): Promise<string> {
    await this.ensureValidToken();
    const id = consentId ?? this.consentId;
    if (!id) {
      throw new IntegrationError("VALIDATION_ERROR", "No consent ID available");
    }

    const response = await this.get<PostbankConsentStatusResponse>(
      `/consents/${id}/status`
    );
    return response.data.consentStatus;
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

  /** Set the active consent ID after SCA redirect. */
  setConsentId(consentId: string): void {
    this.consentId = consentId;
  }

  // ==================== Accounts ====================

  /**
   * List all accounts the TPP has consent to access.
   */
  async listAccounts(): Promise<PostbankAccount[]> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<PostbankAccountsResponse>({
      method: "GET",
      path: "/accounts",
      headers: this.getPSD2Headers(),
    });
    return response.data.accounts;
  }

  /**
   * Get a single account by resource ID.
   */
  async getAccount(accountId: string): Promise<PostbankAccount> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<PostbankAccount>({
      method: "GET",
      path: `/accounts/${accountId}`,
      headers: this.getPSD2Headers(),
    });
    return response.data;
  }

  // ==================== Balances ====================

  /**
   * Get balances for an account.
   */
  async getBalances(accountId: string): Promise<PostbankBalance[]> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<PostbankBalancesResponse>({
      method: "GET",
      path: `/accounts/${accountId}/balances`,
      headers: this.getPSD2Headers(),
    });
    return response.data.balances;
  }

  // ==================== Transactions ====================

  /**
   * List transactions for an account.
   */
  async listTransactions(
    params: PostbankTransactionsParams
  ): Promise<PostbankTransactionsResponse> {
    await this.ensureValidToken();
    this.requireConsent();

    const queryParams: Record<string, string> = {};
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params.dateTo) queryParams.dateTo = params.dateTo;
    if (params.bookingStatus) queryParams.bookingStatus = params.bookingStatus;
    if (params.withBalance != null) {
      queryParams.withBalance = String(params.withBalance);
    }

    const response = await this.request<PostbankTransactionsResponse>({
      method: "GET",
      path: `/accounts/${params.accountId}/transactions`,
      params: queryParams,
      headers: this.getPSD2Headers(),
    });
    return response.data;
  }

  /**
   * Fetch all booked transactions for a date range, following pagination.
   */
  async getAllTransactions(
    accountId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<PostbankTransaction[]> {
    const result = await this.listTransactions({
      accountId,
      dateFrom,
      dateTo,
      bookingStatus: "booked",
    });

    const allTransactions = [...result.transactions.booked];
    let nextLink = result.transactions._links?.next;

    while (nextLink) {
      await this.ensureValidToken();
      const response = await this.request<PostbankTransactionsResponse>({
        method: "GET",
        path: nextLink.href,
        headers: this.getPSD2Headers(),
      });
      allTransactions.push(...response.data.transactions.booked);
      nextLink = response.data.transactions._links?.next;
    }

    return allTransactions;
  }

  // ==================== Connection Test ====================

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      if (this.consentId) {
        const status = await this.getConsentStatus();
        return status === "valid";
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
