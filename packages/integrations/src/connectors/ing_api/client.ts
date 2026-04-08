import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  INGAccount,
  INGAccountsResponse,
  INGBalance,
  INGBalancesResponse,
  INGTransaction,
  INGTransactionsResponse,
  INGTransactionsParams,
  INGClientConfig,
  INGConsentRequest,
  INGConsentResponse,
  INGConsentStatusResponse,
} from "./types.js";

// ==================== ING Open Banking PSD2 Client ====================

const ING_BASE_URL = "https://api.ing.com/v3";
const ING_AUTH_URL = "https://api.ing.com/oauth2/authorization-server-url";
const ING_TOKEN_URL = "https://api.ing.com/oauth2/token";
const ING_SCOPES = ["payment-accounts:balances:view", "payment-accounts:transactions:view"];

/**
 * ING Open Banking PSD2 client.
 *
 * Implements the ING Open Banking API following PSD2/XS2A standards.
 * Requires TPP registration with ING developer portal and
 * valid eIDAS/QWAC certificates for mutual TLS.
 *
 * Supports: accounts, balances, transactions, consent management.
 * Auth: OAuth2 with PSD2 consent flow.
 */
export class INGClient extends BaseIntegrationClient {
  private oauth: OAuthManager;
  private tokens: OAuthTokens;
  private consentId: string | undefined;
  private psuIpAddress: string | undefined;

  constructor(private config: INGClientConfig) {
    super({
      baseUrl: ING_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      rateLimit: { requestsPerMinute: 30 },
      timeout: 30_000,
    });

    this.oauth = new OAuthManager({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: ING_AUTH_URL,
      tokenUrl: ING_TOKEN_URL,
      scopes: ING_SCOPES,
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
   * Returns a redirect URL for SCA (Strong Customer Authentication).
   */
  async createConsent(consentRequest: INGConsentRequest): Promise<INGConsentResponse> {
    await this.ensureValidToken();

    const response = await this.request<INGConsentResponse>({
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
  ): Promise<INGConsentResponse> {
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

    const response = await this.get<INGConsentStatusResponse>(
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
  async listAccounts(): Promise<INGAccount[]> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<INGAccountsResponse>({
      method: "GET",
      path: "/accounts",
      headers: this.getPSD2Headers(),
    });
    return response.data.accounts;
  }

  /**
   * Get a single account by resource ID.
   */
  async getAccount(accountId: string): Promise<INGAccount> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<INGAccount>({
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
  async getBalances(accountId: string): Promise<INGBalance[]> {
    await this.ensureValidToken();
    this.requireConsent();

    const response = await this.request<INGBalancesResponse>({
      method: "GET",
      path: `/accounts/${accountId}/balances`,
      headers: this.getPSD2Headers(),
    });
    return response.data.balances;
  }

  // ==================== Transactions ====================

  /**
   * List transactions for an account with optional date range and booking status filter.
   */
  async listTransactions(
    params: INGTransactionsParams
  ): Promise<INGTransactionsResponse> {
    await this.ensureValidToken();
    this.requireConsent();

    const queryParams: Record<string, string> = {};
    if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params.dateTo) queryParams.dateTo = params.dateTo;
    if (params.bookingStatus) queryParams.bookingStatus = params.bookingStatus;
    if (params.withBalance != null) {
      queryParams.withBalance = String(params.withBalance);
    }

    const response = await this.request<INGTransactionsResponse>({
      method: "GET",
      path: `/accounts/${params.accountId}/transactions`,
      params: queryParams,
      headers: this.getPSD2Headers(),
    });
    return response.data;
  }

  /**
   * Fetch all booked transactions for a date range, following pagination links.
   */
  async getAllTransactions(
    accountId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<INGTransaction[]> {
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
      const response = await this.request<INGTransactionsResponse>({
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
