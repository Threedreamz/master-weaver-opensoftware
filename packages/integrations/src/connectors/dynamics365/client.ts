import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import { OAuthManager } from "../../core/oauth-manager.js";
import type { OAuthTokens } from "../../core/oauth-manager.js";
import type {
  Dynamics365Config,
  DynamicsODataCollection,
  DynamicsQueryParams,
  Customer,
  CustomerCreatePayload,
  Vendor,
  VendorCreatePayload,
  GeneralLedgerEntry,
  SalesInvoice,
  SalesInvoiceCreatePayload,
  SalesInvoiceLineCreatePayload,
  PurchaseInvoice,
  PurchaseInvoiceCreatePayload,
  DynamicsItem,
  DynamicsItemCreatePayload,
} from "./types.js";

const DYNAMICS_SCOPE = "https://api.businesscentral.dynamics.com/.default";

/**
 * Microsoft Dynamics 365 Business Central API client.
 *
 * Uses OAuth2 client credentials flow with Azure AD for authentication.
 * All entity endpoints follow the OData v4 pattern:
 *   /v2.0/{tenantId}/{environment}/api/v2.0/companies({companyId})/<entity>
 */
export class Dynamics365Client extends BaseIntegrationClient {
  private readonly tenantId: string;
  private readonly environment: string;
  private readonly companyId: string;
  private readonly oauth: OAuthManager;
  private tokens: OAuthTokens | null = null;

  constructor(config: Dynamics365Config) {
    const baseUrl = `https://api.businesscentral.dynamics.com/v2.0/${config.tenantId}/${config.environment}/api/v2.0`;

    super({
      baseUrl,
      authType: "oauth2",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "OData-Version": "4.0",
      },
    });

    this.tenantId = config.tenantId;
    this.environment = config.environment;
    this.companyId = config.companyId;

    this.oauth = new OAuthManager({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      authorizationUrl: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      scopes: [DYNAMICS_SCOPE],
      redirectUri: config.redirectUri ?? "http://localhost/callback",
    });
  }

  // ==================== Authentication ====================

  /**
   * Authenticate using OAuth2 client credentials grant.
   * This is the standard server-to-server flow for Dynamics 365.
   */
  async authenticate(): Promise<void> {
    const tokenUrl = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.oauth["config"].clientId,
        client_secret: this.oauth["config"].clientSecret,
        scope: DYNAMICS_SCOPE,
      }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new IntegrationError(
        "AUTH_ERROR",
        `Azure AD token request failed: ${error}`,
        response.status,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    const accessToken = data.access_token as string | undefined;
    if (!accessToken) {
      throw new IntegrationError("AUTH_ERROR", "No access_token in Azure AD response");
    }

    const expiresIn = data.expires_in as number | undefined;
    this.tokens = {
      accessToken,
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
      tokenType: (data.token_type as string) || "Bearer",
    };

    // Update credentials so BaseIntegrationClient sends the Bearer token
    this.credentials.accessToken = accessToken;
  }

  /**
   * Set tokens from an existing authorization code flow.
   * Use OAuthManager.exchangeCode() to obtain tokens first.
   */
  setTokens(tokens: OAuthTokens): void {
    this.tokens = tokens;
    this.credentials.accessToken = tokens.accessToken;
  }

  /** Get the OAuth authorization URL for interactive login */
  getAuthorizationUrl(state: string): string {
    return this.oauth.getAuthorizationUrl(state);
  }

  /** Exchange an authorization code for tokens */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    const tokens = await this.oauth.exchangeCode(code);
    this.setTokens(tokens);
    return tokens;
  }

  /** Ensure we have valid tokens, refreshing or re-authenticating as needed */
  private async ensureAuth(): Promise<void> {
    if (!this.tokens) {
      await this.authenticate();
      return;
    }
    if (this.oauth.isTokenExpired(this.tokens)) {
      if (this.tokens.refreshToken) {
        const refreshed = await this.oauth.refreshAccessToken(this.tokens.refreshToken);
        this.setTokens(refreshed);
      } else {
        await this.authenticate();
      }
    }
  }

  // ==================== Request Helpers ====================

  /** Company-scoped API path prefix */
  private companyPath(entity: string): string {
    return `/companies(${this.companyId})/${entity}`;
  }

  /** Convert DynamicsQueryParams to Record<string, string> */
  private toParams(query?: DynamicsQueryParams): Record<string, string> | undefined {
    if (!query) return undefined;
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params[key] = String(value);
      }
    }
    return Object.keys(params).length > 0 ? params : undefined;
  }

  private async authGet<T>(path: string, params?: Record<string, string>) {
    await this.ensureAuth();
    return this.get<T>(path, params);
  }

  private async authPost<T>(path: string, body: unknown) {
    await this.ensureAuth();
    return this.post<T>(path, body);
  }

  private async authPatch<T>(path: string, body: unknown) {
    await this.ensureAuth();
    return this.patch<T>(path, body);
  }

  private async authDelete<T>(path: string) {
    await this.ensureAuth();
    return this.delete<T>(path);
  }

  // ==================== Customers ====================

  async listCustomers(query?: DynamicsQueryParams) {
    return this.authGet<DynamicsODataCollection<Customer>>(
      this.companyPath("customers"),
      this.toParams(query),
    );
  }

  async getCustomer(id: string) {
    return this.authGet<Customer>(
      this.companyPath(`customers(${id})`),
    );
  }

  async createCustomer(data: CustomerCreatePayload) {
    return this.authPost<Customer>(
      this.companyPath("customers"),
      data,
    );
  }

  async updateCustomer(id: string, data: Partial<CustomerCreatePayload>) {
    return this.authPatch<Customer>(
      this.companyPath(`customers(${id})`),
      data,
    );
  }

  async deleteCustomer(id: string) {
    return this.authDelete<void>(
      this.companyPath(`customers(${id})`),
    );
  }

  // ==================== Vendors ====================

  async listVendors(query?: DynamicsQueryParams) {
    return this.authGet<DynamicsODataCollection<Vendor>>(
      this.companyPath("vendors"),
      this.toParams(query),
    );
  }

  async getVendor(id: string) {
    return this.authGet<Vendor>(
      this.companyPath(`vendors(${id})`),
    );
  }

  async createVendor(data: VendorCreatePayload) {
    return this.authPost<Vendor>(
      this.companyPath("vendors"),
      data,
    );
  }

  async updateVendor(id: string, data: Partial<VendorCreatePayload>) {
    return this.authPatch<Vendor>(
      this.companyPath(`vendors(${id})`),
      data,
    );
  }

  async deleteVendor(id: string) {
    return this.authDelete<void>(
      this.companyPath(`vendors(${id})`),
    );
  }

  // ==================== General Ledger Entries ====================

  /**
   * List GL entries. These are read-only in Business Central's API.
   */
  async listGeneralLedgerEntries(query?: DynamicsQueryParams) {
    return this.authGet<DynamicsODataCollection<GeneralLedgerEntry>>(
      this.companyPath("generalLedgerEntries"),
      this.toParams(query),
    );
  }

  async getGeneralLedgerEntry(id: string) {
    return this.authGet<GeneralLedgerEntry>(
      this.companyPath(`generalLedgerEntries(${id})`),
    );
  }

  // ==================== Sales Invoices ====================

  async listSalesInvoices(query?: DynamicsQueryParams) {
    return this.authGet<DynamicsODataCollection<SalesInvoice>>(
      this.companyPath("salesInvoices"),
      this.toParams(query),
    );
  }

  async getSalesInvoice(id: string) {
    return this.authGet<SalesInvoice>(
      this.companyPath(`salesInvoices(${id})`),
    );
  }

  async createSalesInvoice(data: SalesInvoiceCreatePayload) {
    return this.authPost<SalesInvoice>(
      this.companyPath("salesInvoices"),
      data,
    );
  }

  async updateSalesInvoice(id: string, data: Partial<SalesInvoiceCreatePayload>) {
    return this.authPatch<SalesInvoice>(
      this.companyPath(`salesInvoices(${id})`),
      data,
    );
  }

  async deleteSalesInvoice(id: string) {
    return this.authDelete<void>(
      this.companyPath(`salesInvoices(${id})`),
    );
  }

  /** Add a line to an existing draft sales invoice */
  async addSalesInvoiceLine(invoiceId: string, line: SalesInvoiceLineCreatePayload) {
    return this.authPost<unknown>(
      this.companyPath(`salesInvoices(${invoiceId})/salesInvoiceLines`),
      line,
    );
  }

  /**
   * Post a draft sales invoice. This transitions the invoice from Draft to Open
   * and makes it immutable. Uses the bound action on the entity.
   */
  async postSalesInvoice(id: string) {
    await this.ensureAuth();
    return this.post<void>(
      this.companyPath(`salesInvoices(${id})/Microsoft.NAV.post`),
    );
  }

  // ==================== Purchase Invoices ====================

  async listPurchaseInvoices(query?: DynamicsQueryParams) {
    return this.authGet<DynamicsODataCollection<PurchaseInvoice>>(
      this.companyPath("purchaseInvoices"),
      this.toParams(query),
    );
  }

  async getPurchaseInvoice(id: string) {
    return this.authGet<PurchaseInvoice>(
      this.companyPath(`purchaseInvoices(${id})`),
    );
  }

  async createPurchaseInvoice(data: PurchaseInvoiceCreatePayload) {
    return this.authPost<PurchaseInvoice>(
      this.companyPath("purchaseInvoices"),
      data,
    );
  }

  async updatePurchaseInvoice(id: string, data: Partial<PurchaseInvoiceCreatePayload>) {
    return this.authPatch<PurchaseInvoice>(
      this.companyPath(`purchaseInvoices(${id})`),
      data,
    );
  }

  async deletePurchaseInvoice(id: string) {
    return this.authDelete<void>(
      this.companyPath(`purchaseInvoices(${id})`),
    );
  }

  /** Post a draft purchase invoice */
  async postPurchaseInvoice(id: string) {
    await this.ensureAuth();
    return this.post<void>(
      this.companyPath(`purchaseInvoices(${id})/Microsoft.NAV.post`),
    );
  }

  // ==================== Items ====================

  async listItems(query?: DynamicsQueryParams) {
    return this.authGet<DynamicsODataCollection<DynamicsItem>>(
      this.companyPath("items"),
      this.toParams(query),
    );
  }

  async getItem(id: string) {
    return this.authGet<DynamicsItem>(
      this.companyPath(`items(${id})`),
    );
  }

  async createItem(data: DynamicsItemCreatePayload) {
    return this.authPost<DynamicsItem>(
      this.companyPath("items"),
      data,
    );
  }

  async updateItem(id: string, data: Partial<DynamicsItemCreatePayload>) {
    return this.authPatch<DynamicsItem>(
      this.companyPath(`items(${id})`),
      data,
    );
  }

  async deleteItem(id: string) {
    return this.authDelete<void>(
      this.companyPath(`items(${id})`),
    );
  }

  // ==================== Connection Test ====================

  /**
   * Test the connection by authenticating and reading the company info endpoint.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      await this.authGet(this.companyPath("companyInformation"));
      return true;
    } catch {
      return false;
    }
  }
}
