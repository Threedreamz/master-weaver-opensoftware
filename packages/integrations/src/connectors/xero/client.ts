import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  XeroContact,
  XeroInvoice,
  XeroBankTransaction,
  XeroManualJournal,
  XeroAccount,
  XeroPayment,
  XeroPaginationParams,
  XeroClientConfig,
} from "./types.js";

const XERO_BASE_URL = "https://api.xero.com/api.xro/2.0";

/**
 * Xero API client.
 *
 * Cloud accounting platform with invoices, contacts, bank transactions,
 * manual journals, accounts, and webhook support.
 *
 * Uses OAuth2 authentication via Bearer token. Requires tenant ID header
 * for multi-organization access.
 */
export class XeroClient extends BaseIntegrationClient {
  constructor(config: XeroClientConfig) {
    super({
      baseUrl: XERO_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        Accept: "application/json",
        "Xero-Tenant-Id": config.tenantId,
      },
    });
  }

  private buildParams(params?: XeroPaginationParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page != null) result.page = String(params.page);
    if (params?.where) result.where = params.where;
    if (params?.order) result.order = params.order;
    return result;
  }

  // ==================== Contacts ====================

  /** List contacts with optional filtering. */
  async listContacts(
    params?: XeroPaginationParams
  ): Promise<ApiResponse<{ Contacts: XeroContact[] }>> {
    return this.get<{ Contacts: XeroContact[] }>("/Contacts", this.buildParams(params));
  }

  /** Get a contact by ID. */
  async getContact(contactId: string): Promise<ApiResponse<{ Contacts: XeroContact[] }>> {
    return this.get<{ Contacts: XeroContact[] }>(`/Contacts/${contactId}`);
  }

  /** Create or update contacts. */
  async upsertContacts(
    contacts: XeroContact[]
  ): Promise<ApiResponse<{ Contacts: XeroContact[] }>> {
    return this.post<{ Contacts: XeroContact[] }>("/Contacts", { Contacts: contacts });
  }

  /** Archive a contact. */
  async archiveContact(
    contactId: string
  ): Promise<ApiResponse<{ Contacts: XeroContact[] }>> {
    return this.post<{ Contacts: XeroContact[] }>(`/Contacts/${contactId}`, {
      ContactStatus: "ARCHIVED",
    });
  }

  // ==================== Invoices ====================

  /** List invoices with optional filtering. */
  async listInvoices(
    params?: XeroPaginationParams
  ): Promise<ApiResponse<{ Invoices: XeroInvoice[] }>> {
    return this.get<{ Invoices: XeroInvoice[] }>("/Invoices", this.buildParams(params));
  }

  /** Get an invoice by ID. */
  async getInvoice(invoiceId: string): Promise<ApiResponse<{ Invoices: XeroInvoice[] }>> {
    return this.get<{ Invoices: XeroInvoice[] }>(`/Invoices/${invoiceId}`);
  }

  /** Create or update invoices. */
  async upsertInvoices(
    invoices: XeroInvoice[]
  ): Promise<ApiResponse<{ Invoices: XeroInvoice[] }>> {
    return this.post<{ Invoices: XeroInvoice[] }>("/Invoices", { Invoices: invoices });
  }

  /** Void an invoice. */
  async voidInvoice(
    invoiceId: string
  ): Promise<ApiResponse<{ Invoices: XeroInvoice[] }>> {
    return this.post<{ Invoices: XeroInvoice[] }>(`/Invoices/${invoiceId}`, {
      InvoiceID: invoiceId,
      Status: "VOIDED",
    });
  }

  /** Email an invoice. */
  async emailInvoice(invoiceId: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/Invoices/${invoiceId}/Email`);
  }

  /** Get invoice as PDF. Returns raw bytes in base64 via Accept header override. */
  async getInvoicePdf(invoiceId: string): Promise<ApiResponse<unknown>> {
    return this.request<unknown>({
      method: "GET",
      path: `/Invoices/${invoiceId}`,
      headers: { Accept: "application/pdf" },
    });
  }

  // ==================== Bank Transactions ====================

  /** List bank transactions. */
  async listBankTransactions(
    params?: XeroPaginationParams
  ): Promise<ApiResponse<{ BankTransactions: XeroBankTransaction[] }>> {
    return this.get<{ BankTransactions: XeroBankTransaction[] }>(
      "/BankTransactions",
      this.buildParams(params)
    );
  }

  /** Get a bank transaction by ID. */
  async getBankTransaction(
    transactionId: string
  ): Promise<ApiResponse<{ BankTransactions: XeroBankTransaction[] }>> {
    return this.get<{ BankTransactions: XeroBankTransaction[] }>(
      `/BankTransactions/${transactionId}`
    );
  }

  /** Create bank transactions. */
  async createBankTransactions(
    transactions: XeroBankTransaction[]
  ): Promise<ApiResponse<{ BankTransactions: XeroBankTransaction[] }>> {
    return this.put<{ BankTransactions: XeroBankTransaction[] }>(
      "/BankTransactions",
      { BankTransactions: transactions }
    );
  }

  // ==================== Manual Journals ====================

  /** List manual journals. */
  async listManualJournals(
    params?: XeroPaginationParams
  ): Promise<ApiResponse<{ ManualJournals: XeroManualJournal[] }>> {
    return this.get<{ ManualJournals: XeroManualJournal[] }>(
      "/ManualJournals",
      this.buildParams(params)
    );
  }

  /** Get a manual journal by ID. */
  async getManualJournal(
    journalId: string
  ): Promise<ApiResponse<{ ManualJournals: XeroManualJournal[] }>> {
    return this.get<{ ManualJournals: XeroManualJournal[] }>(
      `/ManualJournals/${journalId}`
    );
  }

  /** Create or update manual journals. */
  async upsertManualJournals(
    journals: XeroManualJournal[]
  ): Promise<ApiResponse<{ ManualJournals: XeroManualJournal[] }>> {
    return this.post<{ ManualJournals: XeroManualJournal[] }>(
      "/ManualJournals",
      { ManualJournals: journals }
    );
  }

  // ==================== Accounts ====================

  /** List all accounts. */
  async listAccounts(
    params?: XeroPaginationParams
  ): Promise<ApiResponse<{ Accounts: XeroAccount[] }>> {
    return this.get<{ Accounts: XeroAccount[] }>("/Accounts", this.buildParams(params));
  }

  /** Get an account by ID. */
  async getAccount(accountId: string): Promise<ApiResponse<{ Accounts: XeroAccount[] }>> {
    return this.get<{ Accounts: XeroAccount[] }>(`/Accounts/${accountId}`);
  }

  /** Create an account. */
  async createAccount(
    account: XeroAccount
  ): Promise<ApiResponse<{ Accounts: XeroAccount[] }>> {
    return this.put<{ Accounts: XeroAccount[] }>("/Accounts", account);
  }

  /** Update an account. */
  async updateAccount(
    accountId: string,
    account: Partial<XeroAccount>
  ): Promise<ApiResponse<{ Accounts: XeroAccount[] }>> {
    return this.post<{ Accounts: XeroAccount[] }>(`/Accounts/${accountId}`, account);
  }

  /** Delete an account. */
  async deleteAccount(accountId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/Accounts/${accountId}`);
  }

  // ==================== Payments ====================

  /** List payments. */
  async listPayments(
    params?: XeroPaginationParams
  ): Promise<ApiResponse<{ Payments: XeroPayment[] }>> {
    return this.get<{ Payments: XeroPayment[] }>("/Payments", this.buildParams(params));
  }

  /** Get a payment by ID. */
  async getPayment(paymentId: string): Promise<ApiResponse<{ Payments: XeroPayment[] }>> {
    return this.get<{ Payments: XeroPayment[] }>(`/Payments/${paymentId}`);
  }

  /** Create a payment. */
  async createPayment(
    payment: XeroPayment
  ): Promise<ApiResponse<{ Payments: XeroPayment[] }>> {
    return this.put<{ Payments: XeroPayment[] }>("/Payments", payment);
  }
}
