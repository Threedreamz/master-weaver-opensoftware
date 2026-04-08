import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  ZohoContact,
  ZohoInvoice,
  ZohoBill,
  ZohoExpense,
  ZohoBankTransaction,
  ZohoJournal,
  ZohoListParams,
  ZohoListResponse,
  ZohoSingleResponse,
  ZohoClientConfig,
} from "./types.js";

const ZOHO_BASE_URLS: Record<string, string> = {
  us: "https://www.zohoapis.com/books/v3",
  eu: "https://www.zohoapis.eu/books/v3",
  in: "https://www.zohoapis.in/books/v3",
  au: "https://www.zohoapis.com.au/books/v3",
  jp: "https://www.zohoapis.jp/books/v3",
};

/**
 * Zoho Books API client.
 *
 * Cloud accounting platform with contacts, invoices, bills, expenses,
 * banking, journals, and webhook support.
 *
 * Uses OAuth2 authentication via Bearer token. Requires organization ID
 * as a query parameter on every request.
 */
export class ZohoBooksClient extends BaseIntegrationClient {
  private organizationId: string;

  constructor(config: ZohoClientConfig) {
    const baseUrl = ZOHO_BASE_URLS[config.region ?? "us"];
    super({
      baseUrl,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 100 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });
    this.organizationId = config.organizationId;
  }

  private buildParams(params?: ZohoListParams): Record<string, string> {
    const result: Record<string, string> = {
      organization_id: this.organizationId,
    };
    if (params?.page != null) result.page = String(params.page);
    if (params?.per_page != null) result.per_page = String(params.per_page);
    if (params?.sort_column) result.sort_column = params.sort_column;
    if (params?.sort_order) result.sort_order = params.sort_order;
    if (params?.search_text) result.search_text = params.search_text;
    if (params?.filter_by) result.filter_by = params.filter_by;
    return result;
  }

  private orgParams(): Record<string, string> {
    return { organization_id: this.organizationId };
  }

  // ==================== Contacts ====================

  /** List contacts. */
  async listContacts(
    params?: ZohoListParams
  ): Promise<ApiResponse<ZohoListResponse<ZohoContact>>> {
    return this.get<ZohoListResponse<ZohoContact>>("/contacts", this.buildParams(params));
  }

  /** Get a contact by ID. */
  async getContact(contactId: string): Promise<ApiResponse<ZohoSingleResponse<ZohoContact>>> {
    return this.get<ZohoSingleResponse<ZohoContact>>(`/contacts/${contactId}`, this.orgParams());
  }

  /** Create a contact. */
  async createContact(contact: ZohoContact): Promise<ApiResponse<ZohoSingleResponse<ZohoContact>>> {
    return this.request<ZohoSingleResponse<ZohoContact>>({
      method: "POST",
      path: "/contacts",
      body: contact,
      params: this.orgParams(),
    });
  }

  /** Update a contact. */
  async updateContact(
    contactId: string,
    contact: Partial<ZohoContact>
  ): Promise<ApiResponse<ZohoSingleResponse<ZohoContact>>> {
    return this.request<ZohoSingleResponse<ZohoContact>>({
      method: "PUT",
      path: `/contacts/${contactId}`,
      body: contact,
      params: this.orgParams(),
    });
  }

  /** Delete a contact. */
  async deleteContact(contactId: string): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: "DELETE",
      path: `/contacts/${contactId}`,
      params: this.orgParams(),
    });
  }

  // ==================== Invoices ====================

  /** List invoices. */
  async listInvoices(
    params?: ZohoListParams
  ): Promise<ApiResponse<ZohoListResponse<ZohoInvoice>>> {
    return this.get<ZohoListResponse<ZohoInvoice>>("/invoices", this.buildParams(params));
  }

  /** Get an invoice by ID. */
  async getInvoice(invoiceId: string): Promise<ApiResponse<ZohoSingleResponse<ZohoInvoice>>> {
    return this.get<ZohoSingleResponse<ZohoInvoice>>(`/invoices/${invoiceId}`, this.orgParams());
  }

  /** Create an invoice. */
  async createInvoice(invoice: ZohoInvoice): Promise<ApiResponse<ZohoSingleResponse<ZohoInvoice>>> {
    return this.request<ZohoSingleResponse<ZohoInvoice>>({
      method: "POST",
      path: "/invoices",
      body: invoice,
      params: this.orgParams(),
    });
  }

  /** Update an invoice. */
  async updateInvoice(
    invoiceId: string,
    invoice: Partial<ZohoInvoice>
  ): Promise<ApiResponse<ZohoSingleResponse<ZohoInvoice>>> {
    return this.request<ZohoSingleResponse<ZohoInvoice>>({
      method: "PUT",
      path: `/invoices/${invoiceId}`,
      body: invoice,
      params: this.orgParams(),
    });
  }

  /** Delete an invoice. */
  async deleteInvoice(invoiceId: string): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: "DELETE",
      path: `/invoices/${invoiceId}`,
      params: this.orgParams(),
    });
  }

  /** Send an invoice by email. */
  async emailInvoice(
    invoiceId: string,
    toEmails: string[],
    subject?: string,
    body?: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: "POST",
      path: `/invoices/${invoiceId}/email`,
      body: { to_mail_ids: toEmails, subject, body },
      params: this.orgParams(),
    });
  }

  // ==================== Bills ====================

  /** List bills. */
  async listBills(
    params?: ZohoListParams
  ): Promise<ApiResponse<ZohoListResponse<ZohoBill>>> {
    return this.get<ZohoListResponse<ZohoBill>>("/bills", this.buildParams(params));
  }

  /** Get a bill by ID. */
  async getBill(billId: string): Promise<ApiResponse<ZohoSingleResponse<ZohoBill>>> {
    return this.get<ZohoSingleResponse<ZohoBill>>(`/bills/${billId}`, this.orgParams());
  }

  /** Create a bill. */
  async createBill(bill: ZohoBill): Promise<ApiResponse<ZohoSingleResponse<ZohoBill>>> {
    return this.request<ZohoSingleResponse<ZohoBill>>({
      method: "POST",
      path: "/bills",
      body: bill,
      params: this.orgParams(),
    });
  }

  /** Update a bill. */
  async updateBill(billId: string, bill: Partial<ZohoBill>): Promise<ApiResponse<ZohoSingleResponse<ZohoBill>>> {
    return this.request<ZohoSingleResponse<ZohoBill>>({
      method: "PUT",
      path: `/bills/${billId}`,
      body: bill,
      params: this.orgParams(),
    });
  }

  /** Delete a bill. */
  async deleteBill(billId: string): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: "DELETE",
      path: `/bills/${billId}`,
      params: this.orgParams(),
    });
  }

  // ==================== Expenses ====================

  /** List expenses. */
  async listExpenses(
    params?: ZohoListParams
  ): Promise<ApiResponse<ZohoListResponse<ZohoExpense>>> {
    return this.get<ZohoListResponse<ZohoExpense>>("/expenses", this.buildParams(params));
  }

  /** Get an expense by ID. */
  async getExpense(expenseId: string): Promise<ApiResponse<ZohoSingleResponse<ZohoExpense>>> {
    return this.get<ZohoSingleResponse<ZohoExpense>>(`/expenses/${expenseId}`, this.orgParams());
  }

  /** Create an expense. */
  async createExpense(expense: ZohoExpense): Promise<ApiResponse<ZohoSingleResponse<ZohoExpense>>> {
    return this.request<ZohoSingleResponse<ZohoExpense>>({
      method: "POST",
      path: "/expenses",
      body: expense,
      params: this.orgParams(),
    });
  }

  /** Delete an expense. */
  async deleteExpense(expenseId: string): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: "DELETE",
      path: `/expenses/${expenseId}`,
      params: this.orgParams(),
    });
  }

  // ==================== Banking ====================

  /** List bank transactions. */
  async listBankTransactions(
    params?: ZohoListParams
  ): Promise<ApiResponse<ZohoListResponse<ZohoBankTransaction>>> {
    return this.get<ZohoListResponse<ZohoBankTransaction>>(
      "/banktransactions",
      this.buildParams(params)
    );
  }

  /** Get a bank transaction by ID. */
  async getBankTransaction(
    transactionId: string
  ): Promise<ApiResponse<ZohoSingleResponse<ZohoBankTransaction>>> {
    return this.get<ZohoSingleResponse<ZohoBankTransaction>>(
      `/banktransactions/${transactionId}`,
      this.orgParams()
    );
  }

  // ==================== Journals ====================

  /** List journals. */
  async listJournals(
    params?: ZohoListParams
  ): Promise<ApiResponse<ZohoListResponse<ZohoJournal>>> {
    return this.get<ZohoListResponse<ZohoJournal>>("/journals", this.buildParams(params));
  }

  /** Get a journal by ID. */
  async getJournal(journalId: string): Promise<ApiResponse<ZohoSingleResponse<ZohoJournal>>> {
    return this.get<ZohoSingleResponse<ZohoJournal>>(`/journals/${journalId}`, this.orgParams());
  }

  /** Create a journal. */
  async createJournal(journal: ZohoJournal): Promise<ApiResponse<ZohoSingleResponse<ZohoJournal>>> {
    return this.request<ZohoSingleResponse<ZohoJournal>>({
      method: "POST",
      path: "/journals",
      body: journal,
      params: this.orgParams(),
    });
  }

  /** Update a journal. */
  async updateJournal(
    journalId: string,
    journal: Partial<ZohoJournal>
  ): Promise<ApiResponse<ZohoSingleResponse<ZohoJournal>>> {
    return this.request<ZohoSingleResponse<ZohoJournal>>({
      method: "PUT",
      path: `/journals/${journalId}`,
      body: journal,
      params: this.orgParams(),
    });
  }

  /** Delete a journal. */
  async deleteJournal(journalId: string): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: "DELETE",
      path: `/journals/${journalId}`,
      params: this.orgParams(),
    });
  }
}
