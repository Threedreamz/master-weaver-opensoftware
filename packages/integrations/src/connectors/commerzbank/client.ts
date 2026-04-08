import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  CommerzbankAccount,
  CommerzbankAccountsResponse,
  CommerzbankBalance,
  CommerzbankBalancesResponse,
  CommerzbankTransaction,
  CommerzbankTransactionsResponse,
  CommerzbankTransactionsParams,
  CommerzbankClientConfig,
  ConsentRequest,
  ConsentResponse,
  ConsentStatusResponse,
} from "./types.js";

// ==================== Commerzbank PSD2 Client ====================

const CBK_BASE_URL = "https://api.commerzbank.com/accounts-api/v1";
const CBK_AUTH_URL = "https://api.commerzbank.com/auth/realms/CBAPI/protocol/openid-connect/auth";
const CBK_TOKEN_URL = "https://api.commerzbank.com/auth/realms/CBAPI/protocol/openid-connect/token";
const CBK_SCOPES = ["AIS:accounts", "AIS:balances", "AIS:transactions"];

/**
 * Commerzbank PSD2 Open Banking client.
 *
 * Implements the Berlin Group NextGenPSD2 (XS2A) interface used by
 * Commerzbank's developer portal. Requires a valid TPP certificate and
 * an active consent before account data can be accessed.
 */
export class CommerzbankClient extends BaseIntegrationClient {
  private oauth: OAuthManager;
  private tokens: OAuthTokens;
  private consentId: string | undefined;
  private psuIpAddress: string | undefined;

  constructor(private config: CommerzbankClientConfig) {
    super({
      baseUrl: CBK_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      rateLimit: { requestsPerMinute: 30 },
      timeout: 30_000,
    });

    this.oauth = new OAuthManager({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: CBK_AUTH_URL,
      tokenUrl: CBK_TOKEN_URL,
      scopes: CBK_SCOPES,
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
   * Create a new consent for account access.
   * The response contains a redirect URL where the PSU (Payment Service User)
   * must authorize the consent via SCA (Strong Customer Authentication).
   */
  async createConsent(consentRequest: ConsentRequest): Promise<ConsentResponse> {
    await this.ensureValidToken();

    const response = await this.request<ConsentResponse>({
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
   * Convenience wrapper around createConsent for the common case.
   */
  async createAllAccountsConsent(
    validUntilDays: number = 90,
    frequencyPerDay: number = 4
  ): Promise<ConsentResponse> {
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

    const response = await this.get<ConsentStatusResponse>(
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

  /** Set the active consent ID */
  setConsentId(consentId: string): void {
    this.consentId = consentId;
  }

  // ==================== Accounts ====================

  /**
   * List all accounts the TPP has been granted access to.
   * Requires an active consent.
   */
  async listAccounts(): Promise<CommerzbankAccount[]> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<CommerzbankAccountsResponse>({
      method: "GET",
      path: "/accounts",
      headers: this.getPSD2Headers(),
    });
    return response.data.accounts;
  }

  /**
   * Get details of a single account.
   */
  async getAccount(accountId: string): Promise<CommerzbankAccount> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<CommerzbankAccount>({
      method: "GET",
      path: `/accounts/${accountId}`,
      headers: this.getPSD2Headers(),
    });
    return response.data;
  }

  // ==================== Balances ====================

  /**
   * Get balances for an account.
   * Returns multiple balance types (closingBooked, expected, etc.)
   */
  async getBalances(accountId: string): Promise<CommerzbankBalance[]> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<CommerzbankBalancesResponse>({
      method: "GET",
      path: `/accounts/${accountId}/balances`,
      headers: this.getPSD2Headers(),
    });
    return response.data.balances;
  }

  // ==================== Transactions ====================

  /**
   * List transactions for an account.
   * Supports date range filtering and booking status (booked/pending/both).
   */
  async listTransactions(
    params: CommerzbankTransactionsParams
  ): Promise<CommerzbankTransactionsResponse> {
    await this.ensureValidToken();
    this.requireConsent();

    const queryParams: Record<string, string> = {};
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params.dateTo) queryParams.dateTo = params.dateTo;
    if (params.bookingStatus) queryParams.bookingStatus = params.bookingStatus;
    if (params.withBalance != null) {
      queryParams.withBalance = String(params.withBalance);
    }

    const response = await this.request<CommerzbankTransactionsResponse>({
      method: "GET",
      path: `/accounts/${params.accountId}/transactions`,
      params: queryParams,
      headers: this.getPSD2Headers(),
    });
    return response.data;
  }

  /**
   * Fetch all booked transactions for a date range.
   * Handles pagination via _links.next if present.
   */
  async getAllTransactions(
    accountId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<CommerzbankTransaction[]> {
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
      const response = await this.request<CommerzbankTransactionsResponse>({
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
      // Without a consent we can only verify the token is valid
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
   * Build PSD2-required headers.
   * - Consent-ID: the active consent
   * - PSU-IP-Address: the end-user's IP (required for certain calls)
   * - X-Request-ID: unique request identifier
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
