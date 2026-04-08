import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  BillomatClient,
  BillomatInvoice,
  BillomatInvoiceItem,
  BillomatCreditNote,
  BillomatCreditNoteItem,
  BillomatReminder,
  BillomatPayment,
  BillomatListParams,
  BillomatClientConfig,
} from "./types.js";

/**
 * Billomat API client.
 *
 * German invoicing platform with clients, invoices, credit notes,
 * reminders (Mahnungen), and payments.
 *
 * Uses API key authentication via X-BillomatApiKey header.
 * Each account uses a custom subdomain: {subdomain}.billomat.net
 */
export class BillomatApiClient extends BaseIntegrationClient {
  constructor(config: BillomatClientConfig) {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-BillomatApiKey": config.apiKey,
    };
    if (config.appId) headers["X-AppId"] = config.appId;
    if (config.appSecret) headers["X-AppSecret"] = config.appSecret;

    super({
      baseUrl: `https://${config.subdomain}.billomat.net/api`,
      authType: "custom",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 150 },
      defaultHeaders: headers,
    });
  }

  private buildListParams(params?: BillomatListParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page != null) result.page = String(params.page);
    if (params?.per_page != null) result.per_page = String(params.per_page);
    if (params?.order_by) result.order_by = params.order_by;
    return result;
  }

  // ==================== Clients ====================

  /** List all clients. */
  async listClients(
    params?: BillomatListParams
  ): Promise<ApiResponse<{ clients: { client: BillomatClient[] } }>> {
    return this.get<{ clients: { client: BillomatClient[] } }>(
      "/clients",
      this.buildListParams(params)
    );
  }

  /** Get a client by ID. */
  async getClient(
    clientId: number
  ): Promise<ApiResponse<{ client: BillomatClient }>> {
    return this.get<{ client: BillomatClient }>(`/clients/${clientId}`);
  }

  /** Create a new client. */
  async createClient(
    client: BillomatClient
  ): Promise<ApiResponse<{ client: BillomatClient }>> {
    return this.post<{ client: BillomatClient }>("/clients", { client });
  }

  /** Update an existing client. */
  async updateClient(
    clientId: number,
    client: Partial<BillomatClient>
  ): Promise<ApiResponse<{ client: BillomatClient }>> {
    return this.put<{ client: BillomatClient }>(`/clients/${clientId}`, {
      client,
    });
  }

  /** Delete a client. */
  async deleteClient(clientId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/clients/${clientId}`);
  }

  // ==================== Invoices ====================

  /** List all invoices. */
  async listInvoices(
    params?: BillomatListParams & {
      client_id?: number;
      status?: string;
      from?: string;
      to?: string;
    }
  ): Promise<ApiResponse<{ invoices: { invoice: BillomatInvoice[] } }>> {
    const queryParams = this.buildListParams(params);
    if (params?.client_id != null)
      queryParams.client_id = String(params.client_id);
    if (params?.status) queryParams.status = params.status;
    if (params?.from) queryParams.from = params.from;
    if (params?.to) queryParams.to = params.to;

    return this.get<{ invoices: { invoice: BillomatInvoice[] } }>(
      "/invoices",
      queryParams
    );
  }

  /** Get an invoice by ID. */
  async getInvoice(
    invoiceId: number
  ): Promise<ApiResponse<{ invoice: BillomatInvoice }>> {
    return this.get<{ invoice: BillomatInvoice }>(`/invoices/${invoiceId}`);
  }

  /** Create a new invoice. */
  async createInvoice(
    invoice: BillomatInvoice
  ): Promise<ApiResponse<{ invoice: BillomatInvoice }>> {
    return this.post<{ invoice: BillomatInvoice }>("/invoices", { invoice });
  }

  /** Update an invoice. */
  async updateInvoice(
    invoiceId: number,
    invoice: Partial<BillomatInvoice>
  ): Promise<ApiResponse<{ invoice: BillomatInvoice }>> {
    return this.put<{ invoice: BillomatInvoice }>(`/invoices/${invoiceId}`, {
      invoice,
    });
  }

  /** Delete a draft invoice. */
  async deleteInvoice(invoiceId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/invoices/${invoiceId}`);
  }

  /** Complete (finalize) an invoice. Transitions from DRAFT to OPEN. */
  async completeInvoice(
    invoiceId: number,
    templateId?: number
  ): Promise<ApiResponse<void>> {
    const body: Record<string, unknown> = {};
    if (templateId != null) body.template_id = templateId;
    return this.put<void>(`/invoices/${invoiceId}/complete`, { complete: body });
  }

  /** Send an invoice by email. */
  async sendInvoice(
    invoiceId: number,
    recipients: { to: string; cc?: string; bcc?: string; subject?: string; body?: string }
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/invoices/${invoiceId}/email`, { email: recipients });
  }

  /** Cancel an invoice. */
  async cancelInvoice(invoiceId: number): Promise<ApiResponse<void>> {
    return this.put<void>(`/invoices/${invoiceId}/cancel`, {});
  }

  /** Get the PDF for an invoice. Returns the download URL. */
  async getInvoicePdf(
    invoiceId: number
  ): Promise<ApiResponse<{ pdf: { id: number; url: string } }>> {
    return this.get<{ pdf: { id: number; url: string } }>(
      `/invoices/${invoiceId}/pdf`
    );
  }

  // ==================== Invoice Items ====================

  /** List items for an invoice. */
  async listInvoiceItems(
    invoiceId: number
  ): Promise<
    ApiResponse<{ "invoice-items": { "invoice-item": BillomatInvoiceItem[] } }>
  > {
    return this.get<{
      "invoice-items": { "invoice-item": BillomatInvoiceItem[] };
    }>("/invoice-items", { invoice_id: String(invoiceId) });
  }

  /** Create an invoice item. */
  async createInvoiceItem(
    item: BillomatInvoiceItem
  ): Promise<ApiResponse<{ "invoice-item": BillomatInvoiceItem }>> {
    return this.post<{ "invoice-item": BillomatInvoiceItem }>(
      "/invoice-items",
      { "invoice-item": item }
    );
  }

  /** Update an invoice item. */
  async updateInvoiceItem(
    itemId: number,
    item: Partial<BillomatInvoiceItem>
  ): Promise<ApiResponse<{ "invoice-item": BillomatInvoiceItem }>> {
    return this.put<{ "invoice-item": BillomatInvoiceItem }>(
      `/invoice-items/${itemId}`,
      { "invoice-item": item }
    );
  }

  /** Delete an invoice item. */
  async deleteInvoiceItem(itemId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/invoice-items/${itemId}`);
  }

  // ==================== Credit Notes ====================

  /** List all credit notes. */
  async listCreditNotes(
    params?: BillomatListParams & { client_id?: number; status?: string }
  ): Promise<
    ApiResponse<{ "credit-notes": { "credit-note": BillomatCreditNote[] } }>
  > {
    const queryParams = this.buildListParams(params);
    if (params?.client_id != null)
      queryParams.client_id = String(params.client_id);
    if (params?.status) queryParams.status = params.status;

    return this.get<{
      "credit-notes": { "credit-note": BillomatCreditNote[] };
    }>("/credit-notes", queryParams);
  }

  /** Get a credit note by ID. */
  async getCreditNote(
    creditNoteId: number
  ): Promise<ApiResponse<{ "credit-note": BillomatCreditNote }>> {
    return this.get<{ "credit-note": BillomatCreditNote }>(
      `/credit-notes/${creditNoteId}`
    );
  }

  /** Create a new credit note. */
  async createCreditNote(
    creditNote: BillomatCreditNote
  ): Promise<ApiResponse<{ "credit-note": BillomatCreditNote }>> {
    return this.post<{ "credit-note": BillomatCreditNote }>("/credit-notes", {
      "credit-note": creditNote,
    });
  }

  /** Complete (finalize) a credit note. */
  async completeCreditNote(creditNoteId: number): Promise<ApiResponse<void>> {
    return this.put<void>(`/credit-notes/${creditNoteId}/complete`, {
      complete: {},
    });
  }

  /** Create a credit note item. */
  async createCreditNoteItem(
    item: BillomatCreditNoteItem
  ): Promise<ApiResponse<{ "credit-note-item": BillomatCreditNoteItem }>> {
    return this.post<{ "credit-note-item": BillomatCreditNoteItem }>(
      "/credit-note-items",
      { "credit-note-item": item }
    );
  }

  // ==================== Reminders (Mahnungen) ====================

  /** List all reminders. */
  async listReminders(
    params?: BillomatListParams & { invoice_id?: number }
  ): Promise<ApiResponse<{ reminders: { reminder: BillomatReminder[] } }>> {
    const queryParams = this.buildListParams(params);
    if (params?.invoice_id != null)
      queryParams.invoice_id = String(params.invoice_id);

    return this.get<{ reminders: { reminder: BillomatReminder[] } }>(
      "/reminders",
      queryParams
    );
  }

  /** Get a reminder by ID. */
  async getReminder(
    reminderId: number
  ): Promise<ApiResponse<{ reminder: BillomatReminder }>> {
    return this.get<{ reminder: BillomatReminder }>(
      `/reminders/${reminderId}`
    );
  }

  /** Create a new reminder for an invoice. */
  async createReminder(
    reminder: BillomatReminder
  ): Promise<ApiResponse<{ reminder: BillomatReminder }>> {
    return this.post<{ reminder: BillomatReminder }>("/reminders", {
      reminder,
    });
  }

  /** Complete a reminder and send it. */
  async completeReminder(reminderId: number): Promise<ApiResponse<void>> {
    return this.put<void>(`/reminders/${reminderId}/complete`, {
      complete: {},
    });
  }

  /** Send a reminder by email. */
  async sendReminder(
    reminderId: number,
    recipients: { to: string; subject?: string; body?: string }
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/reminders/${reminderId}/email`, {
      email: recipients,
    });
  }

  // ==================== Payments ====================

  /** List payments for an invoice. */
  async listPayments(
    invoiceId: number
  ): Promise<ApiResponse<{ payments: { payment: BillomatPayment[] } }>> {
    return this.get<{ payments: { payment: BillomatPayment[] } }>(
      "/payments",
      { invoice_id: String(invoiceId) }
    );
  }

  /** Get a payment by ID. */
  async getPayment(
    paymentId: number
  ): Promise<ApiResponse<{ payment: BillomatPayment }>> {
    return this.get<{ payment: BillomatPayment }>(`/payments/${paymentId}`);
  }

  /** Create a payment for an invoice. */
  async createPayment(
    payment: BillomatPayment
  ): Promise<ApiResponse<{ payment: BillomatPayment }>> {
    return this.post<{ payment: BillomatPayment }>("/payments", { payment });
  }

  /** Delete a payment. */
  async deletePayment(paymentId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/payments/${paymentId}`);
  }
}
