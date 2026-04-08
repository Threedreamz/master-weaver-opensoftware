import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type {
  SapSession,
  SapODataCollection,
  SapQueryParams,
  SapBusinessOneConfig,
  BusinessPartner,
  BusinessPartnerCreatePayload,
  JournalEntry,
  JournalEntryCreatePayload,
  Invoice,
  InvoiceCreatePayload,
  Item,
  ItemCreatePayload,
  ChartOfAccount,
  ChartOfAccountCreatePayload,
} from "./types.js";

/**
 * SAP Business One Service Layer client.
 *
 * Authentication uses session-based login: POST /Login returns a SessionId
 * cookie (B1SESSION) that must be sent with every subsequent request.
 * Sessions are kept alive automatically and re-authenticated on 401.
 */
export class SapBusinessOneClient extends BaseIntegrationClient {
  private sessionId: string | null = null;
  private sessionExpiresAt = 0;
  private readonly companyDb: string;
  private readonly username: string;
  private readonly password: string;

  constructor(config: SapBusinessOneConfig) {
    super({
      baseUrl: config.serviceLayerUrl,
      authType: "custom",
      credentials: {
        username: config.username,
        password: config.password,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 30 },
      defaultHeaders: {
        "Content-Type": "application/json",
      },
    });
    this.companyDb = config.companyDb;
    this.username = config.username;
    this.password = config.password;
  }

  // ==================== Session Management ====================

  /**
   * Authenticate with SAP B1 Service Layer.
   * POST /Login with CompanyDB, UserName, Password.
   * Returns a B1SESSION cookie used for all subsequent requests.
   */
  async login(): Promise<void> {
    const response = await this.post<SapSession>("/Login", {
      CompanyDB: this.companyDb,
      UserName: this.username,
      Password: this.password,
    });

    if (!response.data.SessionId) {
      throw new IntegrationError("AUTH_ERROR", "SAP B1 Login did not return a SessionId");
    }

    this.sessionId = response.data.SessionId;
    // SAP B1 sessions default to 30 minutes; refresh at 25 min
    const timeout = (response.data.SessionTimeout || 30) * 60 * 1000;
    this.sessionExpiresAt = Date.now() + timeout - 5 * 60 * 1000;
  }

  /** Terminate the current session */
  async logout(): Promise<void> {
    if (!this.sessionId) return;
    try {
      await this.authenticatedPost("/Logout", undefined);
    } finally {
      this.sessionId = null;
      this.sessionExpiresAt = 0;
    }
  }

  /** Ensure we have a valid session, re-authenticating if necessary */
  private async ensureSession(): Promise<void> {
    if (!this.sessionId || Date.now() >= this.sessionExpiresAt) {
      await this.login();
    }
  }

  /** Build the session cookie header */
  private sessionHeaders(): Record<string, string> {
    if (!this.sessionId) {
      throw new IntegrationError("AUTH_ERROR", "No active SAP B1 session. Call login() first.");
    }
    return { Cookie: `B1SESSION=${this.sessionId}` };
  }

  // ==================== Authenticated Request Helpers ====================

  private async authenticatedGet<T>(
    path: string,
    params?: Record<string, string>,
  ) {
    await this.ensureSession();
    return this.request<T>({
      method: "GET",
      path,
      params,
      headers: this.sessionHeaders(),
    });
  }

  private async authenticatedPost<T>(path: string, body: unknown) {
    await this.ensureSession();
    return this.request<T>({
      method: "POST",
      path,
      body,
      headers: this.sessionHeaders(),
    });
  }

  private async authenticatedPatch<T>(path: string, body: unknown) {
    await this.ensureSession();
    return this.request<T>({
      method: "PATCH",
      path,
      body,
      headers: this.sessionHeaders(),
    });
  }

  private async authenticatedDelete<T>(path: string) {
    await this.ensureSession();
    return this.request<T>({
      method: "DELETE",
      path,
      headers: this.sessionHeaders(),
    });
  }

  /** Convert SapQueryParams to Record<string, string> for URL params */
  private toParams(query?: SapQueryParams): Record<string, string> | undefined {
    if (!query) return undefined;
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params[key] = String(value);
      }
    }
    return Object.keys(params).length > 0 ? params : undefined;
  }

  // ==================== Business Partners ====================

  async listBusinessPartners(query?: SapQueryParams) {
    return this.authenticatedGet<SapODataCollection<BusinessPartner>>(
      "/BusinessPartners",
      this.toParams(query),
    );
  }

  async getBusinessPartner(cardCode: string) {
    return this.authenticatedGet<BusinessPartner>(
      `/BusinessPartners('${encodeURIComponent(cardCode)}')`,
    );
  }

  async createBusinessPartner(data: BusinessPartnerCreatePayload) {
    return this.authenticatedPost<BusinessPartner>("/BusinessPartners", data);
  }

  async updateBusinessPartner(cardCode: string, data: Partial<BusinessPartnerCreatePayload>) {
    return this.authenticatedPatch<void>(
      `/BusinessPartners('${encodeURIComponent(cardCode)}')`,
      data,
    );
  }

  async deleteBusinessPartner(cardCode: string) {
    return this.authenticatedDelete<void>(
      `/BusinessPartners('${encodeURIComponent(cardCode)}')`,
    );
  }

  // ==================== Journal Entries ====================

  async listJournalEntries(query?: SapQueryParams) {
    return this.authenticatedGet<SapODataCollection<JournalEntry>>(
      "/JournalEntries",
      this.toParams(query),
    );
  }

  async getJournalEntry(jdtNum: number) {
    return this.authenticatedGet<JournalEntry>(
      `/JournalEntries(${jdtNum})`,
    );
  }

  async createJournalEntry(data: JournalEntryCreatePayload) {
    return this.authenticatedPost<JournalEntry>("/JournalEntries", data);
  }

  /**
   * Cancel (reverse) a journal entry.
   * SAP B1 does not support PATCH on journal entries; use the Cancel action.
   */
  async cancelJournalEntry(jdtNum: number) {
    return this.authenticatedPost<void>(
      `/JournalEntries(${jdtNum})/Cancel`,
      undefined,
    );
  }

  // ==================== Invoices (AR) ====================

  async listInvoices(query?: SapQueryParams) {
    return this.authenticatedGet<SapODataCollection<Invoice>>(
      "/Invoices",
      this.toParams(query),
    );
  }

  async getInvoice(docEntry: number) {
    return this.authenticatedGet<Invoice>(`/Invoices(${docEntry})`);
  }

  async createInvoice(data: InvoiceCreatePayload) {
    return this.authenticatedPost<Invoice>("/Invoices", data);
  }

  async updateInvoice(docEntry: number, data: Partial<InvoiceCreatePayload>) {
    return this.authenticatedPatch<void>(`/Invoices(${docEntry})`, data);
  }

  /**
   * Cancel an invoice. Creates a reversal document.
   */
  async cancelInvoice(docEntry: number) {
    return this.authenticatedPost<void>(
      `/Invoices(${docEntry})/Cancel`,
      undefined,
    );
  }

  /**
   * Close an invoice.
   */
  async closeInvoice(docEntry: number) {
    return this.authenticatedPost<void>(
      `/Invoices(${docEntry})/Close`,
      undefined,
    );
  }

  // ==================== Purchase Invoices (AP) ====================

  async listPurchaseInvoices(query?: SapQueryParams) {
    return this.authenticatedGet<SapODataCollection<Invoice>>(
      "/PurchaseInvoices",
      this.toParams(query),
    );
  }

  async getPurchaseInvoice(docEntry: number) {
    return this.authenticatedGet<Invoice>(`/PurchaseInvoices(${docEntry})`);
  }

  async createPurchaseInvoice(data: InvoiceCreatePayload) {
    return this.authenticatedPost<Invoice>("/PurchaseInvoices", data);
  }

  // ==================== Items ====================

  async listItems(query?: SapQueryParams) {
    return this.authenticatedGet<SapODataCollection<Item>>(
      "/Items",
      this.toParams(query),
    );
  }

  async getItem(itemCode: string) {
    return this.authenticatedGet<Item>(
      `/Items('${encodeURIComponent(itemCode)}')`,
    );
  }

  async createItem(data: ItemCreatePayload) {
    return this.authenticatedPost<Item>("/Items", data);
  }

  async updateItem(itemCode: string, data: Partial<ItemCreatePayload>) {
    return this.authenticatedPatch<void>(
      `/Items('${encodeURIComponent(itemCode)}')`,
      data,
    );
  }

  async deleteItem(itemCode: string) {
    return this.authenticatedDelete<void>(
      `/Items('${encodeURIComponent(itemCode)}')`,
    );
  }

  // ==================== Chart of Accounts ====================

  async listChartOfAccounts(query?: SapQueryParams) {
    return this.authenticatedGet<SapODataCollection<ChartOfAccount>>(
      "/ChartOfAccounts",
      this.toParams(query),
    );
  }

  async getChartOfAccount(code: string) {
    return this.authenticatedGet<ChartOfAccount>(
      `/ChartOfAccounts('${encodeURIComponent(code)}')`,
    );
  }

  async createChartOfAccount(data: ChartOfAccountCreatePayload) {
    return this.authenticatedPost<ChartOfAccount>("/ChartOfAccounts", data);
  }

  async updateChartOfAccount(code: string, data: Partial<ChartOfAccountCreatePayload>) {
    return this.authenticatedPatch<void>(
      `/ChartOfAccounts('${encodeURIComponent(code)}')`,
      data,
    );
  }

  // ==================== Connection Test ====================

  /**
   * Test the connection by attempting to login and reading company info.
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.login();
      await this.authenticatedGet("/CompanyService_GetCompanyInfo");
      return true;
    } catch {
      return false;
    }
  }
}
