import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  FreshBooksClient,
  FreshBooksInvoice,
  FreshBooksExpense,
  FreshBooksPayment,
  FreshBooksTimeEntry,
  FreshBooksListParams,
  FreshBooksListResponse,
  FreshBooksSingleResponse,
  FreshBooksWebhookCallback,
  FreshBooksClientConfig,
} from "./types.js";

const FRESHBOOKS_BASE_URL = "https://api.freshbooks.com";

/**
 * FreshBooks API client.
 *
 * Cloud accounting platform with clients, invoices, expenses, payments,
 * time entries, and webhook support.
 *
 * Uses OAuth2 authentication via Bearer token. Endpoints are scoped
 * to an account ID.
 */
export class FreshBooksApiClient extends BaseIntegrationClient {
  private accountId: string;

  constructor(config: FreshBooksClientConfig) {
    super({
      baseUrl: FRESHBOOKS_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });
    this.accountId = config.accountId;
  }

  private accountPath(path: string): string {
    return `/accounting/account/${this.accountId}${path}`;
  }

  private buildListParams(params?: FreshBooksListParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page != null) result.page = String(params.page);
    if (params?.per_page != null) result.per_page = String(params.per_page);
    if (params?.sort) result.sort = params.sort;
    if (params?.search) {
      for (const [key, value] of Object.entries(params.search)) {
        result[`search[${key}]`] = value;
      }
    }
    return result;
  }

  // ==================== Clients ====================

  /** List all clients. */
  async listClients(
    params?: FreshBooksListParams
  ): Promise<ApiResponse<FreshBooksListResponse<FreshBooksClient>>> {
    return this.get<FreshBooksListResponse<FreshBooksClient>>(
      this.accountPath("/users/clients"),
      this.buildListParams(params)
    );
  }

  /** Get a client by ID. */
  async getClient(
    clientId: number
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksClient>>> {
    return this.get<FreshBooksSingleResponse<FreshBooksClient>>(
      this.accountPath(`/users/clients/${clientId}`)
    );
  }

  /** Create a new client. */
  async createClient(
    client: FreshBooksClient
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksClient>>> {
    return this.post<FreshBooksSingleResponse<FreshBooksClient>>(
      this.accountPath("/users/clients"),
      { client }
    );
  }

  /** Update a client. */
  async updateClient(
    clientId: number,
    client: Partial<FreshBooksClient>
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksClient>>> {
    return this.put<FreshBooksSingleResponse<FreshBooksClient>>(
      this.accountPath(`/users/clients/${clientId}`),
      { client }
    );
  }

  /** Delete (archive) a client. */
  async deleteClient(
    clientId: number
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksClient>>> {
    return this.put<FreshBooksSingleResponse<FreshBooksClient>>(
      this.accountPath(`/users/clients/${clientId}`),
      { client: { vis_state: 1 } }
    );
  }

  // ==================== Invoices ====================

  /** List all invoices. */
  async listInvoices(
    params?: FreshBooksListParams
  ): Promise<ApiResponse<FreshBooksListResponse<FreshBooksInvoice>>> {
    return this.get<FreshBooksListResponse<FreshBooksInvoice>>(
      this.accountPath("/invoices/invoices"),
      this.buildListParams(params)
    );
  }

  /** Get an invoice by ID. */
  async getInvoice(
    invoiceId: number
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksInvoice>>> {
    return this.get<FreshBooksSingleResponse<FreshBooksInvoice>>(
      this.accountPath(`/invoices/invoices/${invoiceId}`)
    );
  }

  /** Create a new invoice. */
  async createInvoice(
    invoice: FreshBooksInvoice
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksInvoice>>> {
    return this.post<FreshBooksSingleResponse<FreshBooksInvoice>>(
      this.accountPath("/invoices/invoices"),
      { invoice }
    );
  }

  /** Update an invoice. */
  async updateInvoice(
    invoiceId: number,
    invoice: Partial<FreshBooksInvoice>
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksInvoice>>> {
    return this.put<FreshBooksSingleResponse<FreshBooksInvoice>>(
      this.accountPath(`/invoices/invoices/${invoiceId}`),
      { invoice }
    );
  }

  /** Delete an invoice. */
  async deleteInvoice(
    invoiceId: number
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksInvoice>>> {
    return this.put<FreshBooksSingleResponse<FreshBooksInvoice>>(
      this.accountPath(`/invoices/invoices/${invoiceId}`),
      { invoice: { vis_state: 1 } }
    );
  }

  /** Send an invoice by email. */
  async sendInvoice(
    invoiceId: number,
    recipients: string[],
    subject?: string,
    body?: string
  ): Promise<ApiResponse<void>> {
    return this.put<void>(
      this.accountPath(`/invoices/invoices/${invoiceId}`),
      {
        invoice: { action_email: true, email_recipients: recipients, email_subject: subject, email_body: body },
      }
    );
  }

  // ==================== Expenses ====================

  /** List all expenses. */
  async listExpenses(
    params?: FreshBooksListParams
  ): Promise<ApiResponse<FreshBooksListResponse<FreshBooksExpense>>> {
    return this.get<FreshBooksListResponse<FreshBooksExpense>>(
      this.accountPath("/expenses/expenses"),
      this.buildListParams(params)
    );
  }

  /** Get an expense by ID. */
  async getExpense(
    expenseId: number
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksExpense>>> {
    return this.get<FreshBooksSingleResponse<FreshBooksExpense>>(
      this.accountPath(`/expenses/expenses/${expenseId}`)
    );
  }

  /** Create an expense. */
  async createExpense(
    expense: FreshBooksExpense
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksExpense>>> {
    return this.post<FreshBooksSingleResponse<FreshBooksExpense>>(
      this.accountPath("/expenses/expenses"),
      { expense }
    );
  }

  /** Update an expense. */
  async updateExpense(
    expenseId: number,
    expense: Partial<FreshBooksExpense>
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksExpense>>> {
    return this.put<FreshBooksSingleResponse<FreshBooksExpense>>(
      this.accountPath(`/expenses/expenses/${expenseId}`),
      { expense }
    );
  }

  /** Delete an expense. */
  async deleteExpense(
    expenseId: number
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksExpense>>> {
    return this.put<FreshBooksSingleResponse<FreshBooksExpense>>(
      this.accountPath(`/expenses/expenses/${expenseId}`),
      { expense: { vis_state: 1 } }
    );
  }

  // ==================== Payments ====================

  /** List payments for an invoice. */
  async listPayments(
    params?: FreshBooksListParams
  ): Promise<ApiResponse<FreshBooksListResponse<FreshBooksPayment>>> {
    return this.get<FreshBooksListResponse<FreshBooksPayment>>(
      this.accountPath("/payments/payments"),
      this.buildListParams(params)
    );
  }

  /** Get a payment by ID. */
  async getPayment(
    paymentId: number
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksPayment>>> {
    return this.get<FreshBooksSingleResponse<FreshBooksPayment>>(
      this.accountPath(`/payments/payments/${paymentId}`)
    );
  }

  /** Create a payment. */
  async createPayment(
    payment: FreshBooksPayment
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksPayment>>> {
    return this.post<FreshBooksSingleResponse<FreshBooksPayment>>(
      this.accountPath("/payments/payments"),
      { payment }
    );
  }

  /** Update a payment. */
  async updatePayment(
    paymentId: number,
    payment: Partial<FreshBooksPayment>
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksPayment>>> {
    return this.put<FreshBooksSingleResponse<FreshBooksPayment>>(
      this.accountPath(`/payments/payments/${paymentId}`),
      { payment }
    );
  }

  /** Delete a payment. */
  async deletePayment(paymentId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(this.accountPath(`/payments/payments/${paymentId}`));
  }

  // ==================== Time Entries ====================

  /** List all time entries. */
  async listTimeEntries(
    params?: FreshBooksListParams
  ): Promise<ApiResponse<FreshBooksListResponse<FreshBooksTimeEntry>>> {
    return this.get<FreshBooksListResponse<FreshBooksTimeEntry>>(
      this.accountPath("/timetracking/time_entries"),
      this.buildListParams(params)
    );
  }

  /** Get a time entry by ID. */
  async getTimeEntry(
    entryId: number
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksTimeEntry>>> {
    return this.get<FreshBooksSingleResponse<FreshBooksTimeEntry>>(
      this.accountPath(`/timetracking/time_entries/${entryId}`)
    );
  }

  /** Create a time entry. */
  async createTimeEntry(
    entry: FreshBooksTimeEntry
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksTimeEntry>>> {
    return this.post<FreshBooksSingleResponse<FreshBooksTimeEntry>>(
      this.accountPath("/timetracking/time_entries"),
      { time_entry: entry }
    );
  }

  /** Update a time entry. */
  async updateTimeEntry(
    entryId: number,
    entry: Partial<FreshBooksTimeEntry>
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksTimeEntry>>> {
    return this.put<FreshBooksSingleResponse<FreshBooksTimeEntry>>(
      this.accountPath(`/timetracking/time_entries/${entryId}`),
      { time_entry: entry }
    );
  }

  /** Delete a time entry. */
  async deleteTimeEntry(entryId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(this.accountPath(`/timetracking/time_entries/${entryId}`));
  }

  // ==================== Webhooks ====================

  /** List all webhook callbacks. */
  async listWebhooks(): Promise<ApiResponse<FreshBooksListResponse<FreshBooksWebhookCallback>>> {
    return this.get<FreshBooksListResponse<FreshBooksWebhookCallback>>(
      this.accountPath("/events/callbacks")
    );
  }

  /** Create a webhook callback. */
  async createWebhook(
    callback: FreshBooksWebhookCallback
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksWebhookCallback>>> {
    return this.post<FreshBooksSingleResponse<FreshBooksWebhookCallback>>(
      this.accountPath("/events/callbacks"),
      { callback }
    );
  }

  /** Update a webhook callback. */
  async updateWebhook(
    callbackId: number,
    callback: Partial<FreshBooksWebhookCallback>
  ): Promise<ApiResponse<FreshBooksSingleResponse<FreshBooksWebhookCallback>>> {
    return this.put<FreshBooksSingleResponse<FreshBooksWebhookCallback>>(
      this.accountPath(`/events/callbacks/${callbackId}`),
      { callback }
    );
  }

  /** Delete a webhook callback. */
  async deleteWebhook(callbackId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(this.accountPath(`/events/callbacks/${callbackId}`));
  }
}
