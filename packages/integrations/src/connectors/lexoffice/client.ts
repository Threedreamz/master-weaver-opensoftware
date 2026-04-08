import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  LexofficeContact,
  LexofficeInvoice,
  LexofficeCreditNote,
  LexofficeVoucher,
  LexofficePayment,
  LexofficePaginationParams,
  LexofficePagedResponse,
  LexofficeCreateResponse,
  LexofficeClientConfig,
  LexofficeWebhookSubscription,
} from "./types.js";

const LEXOFFICE_BASE_URL = "https://api.lexoffice.io/v1";

/**
 * Lexoffice API client.
 *
 * German cloud accounting platform with contacts, invoices, credit notes,
 * vouchers, payments, and webhook support.
 *
 * Uses API key authentication via Authorization header.
 */
export class LexofficeClient extends BaseIntegrationClient {
  constructor(config: LexofficeClientConfig) {
    super({
      baseUrl: LEXOFFICE_BASE_URL,
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });
  }

  // ==================== Contacts ====================

  /** List contacts with optional pagination. */
  async listContacts(
    pagination?: LexofficePaginationParams
  ): Promise<ApiResponse<LexofficePagedResponse<LexofficeContact>>> {
    const params: Record<string, string> = {};
    if (pagination?.page != null) params.page = String(pagination.page);
    if (pagination?.size != null) params.size = String(pagination.size);
    if (pagination?.sort) params.sort = pagination.sort;

    return this.get<LexofficePagedResponse<LexofficeContact>>("/contacts", params);
  }

  /** Get a contact by ID. */
  async getContact(contactId: string): Promise<ApiResponse<LexofficeContact>> {
    return this.get<LexofficeContact>(`/contacts/${contactId}`);
  }

  /** Create a new contact. */
  async createContact(
    contact: LexofficeContact
  ): Promise<ApiResponse<LexofficeCreateResponse>> {
    return this.post<LexofficeCreateResponse>("/contacts", contact);
  }

  /** Update an existing contact. */
  async updateContact(
    contactId: string,
    contact: LexofficeContact
  ): Promise<ApiResponse<LexofficeCreateResponse>> {
    return this.put<LexofficeCreateResponse>(`/contacts/${contactId}`, contact);
  }

  /** Delete a contact by ID. */
  async deleteContact(contactId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/contacts/${contactId}`);
  }

  // ==================== Invoices ====================

  /** Get an invoice by ID. */
  async getInvoice(invoiceId: string): Promise<ApiResponse<LexofficeInvoice>> {
    return this.get<LexofficeInvoice>(`/invoices/${invoiceId}`);
  }

  /** Create a new invoice. */
  async createInvoice(
    invoice: LexofficeInvoice,
    finalize = false
  ): Promise<ApiResponse<LexofficeCreateResponse>> {
    const params: Record<string, string> = {};
    if (finalize) params.finalize = "true";
    return this.request<LexofficeCreateResponse>({
      method: "POST",
      path: "/invoices",
      body: invoice,
      params,
    });
  }

  /** Finalize a draft invoice (transition to open status). */
  async finalizeInvoice(
    invoiceId: string
  ): Promise<ApiResponse<LexofficeCreateResponse>> {
    return this.post<LexofficeCreateResponse>(`/invoices/${invoiceId}/finalize`);
  }

  /** Void an invoice. */
  async voidInvoice(invoiceId: string): Promise<ApiResponse<void>> {
    return this.post<void>(`/invoices/${invoiceId}/void`);
  }

  /**
   * Render an invoice as PDF.
   * Returns the document ID to download.
   */
  async renderInvoicePdf(
    invoiceId: string
  ): Promise<ApiResponse<{ documentFileId: string }>> {
    return this.get<{ documentFileId: string }>(`/invoices/${invoiceId}/document`);
  }

  // ==================== Credit Notes ====================

  /** Get a credit note by ID. */
  async getCreditNote(
    creditNoteId: string
  ): Promise<ApiResponse<LexofficeCreditNote>> {
    return this.get<LexofficeCreditNote>(`/credit-notes/${creditNoteId}`);
  }

  /** Create a new credit note. */
  async createCreditNote(
    creditNote: LexofficeCreditNote,
    finalize = false
  ): Promise<ApiResponse<LexofficeCreateResponse>> {
    const params: Record<string, string> = {};
    if (finalize) params.finalize = "true";
    return this.request<LexofficeCreateResponse>({
      method: "POST",
      path: "/credit-notes",
      body: creditNote,
      params,
    });
  }

  // ==================== Vouchers ====================

  /** List vouchers with filters. */
  async listVouchers(
    voucherStatus: string,
    pagination?: LexofficePaginationParams
  ): Promise<ApiResponse<LexofficePagedResponse<LexofficeVoucher>>> {
    const params: Record<string, string> = {
      voucherStatus,
    };
    if (pagination?.page != null) params.page = String(pagination.page);
    if (pagination?.size != null) params.size = String(pagination.size);
    if (pagination?.sort) params.sort = pagination.sort;

    return this.get<LexofficePagedResponse<LexofficeVoucher>>("/voucherlist", params);
  }

  // ==================== Payments ====================

  /** Get payment status for a voucher. */
  async getPayment(voucherId: string): Promise<ApiResponse<LexofficePayment>> {
    return this.get<LexofficePayment>(`/payments/${voucherId}`);
  }

  // ==================== Webhooks ====================

  /** List all webhook subscriptions. */
  async listWebhooks(): Promise<ApiResponse<LexofficeWebhookSubscription[]>> {
    return this.get<LexofficeWebhookSubscription[]>("/event-subscriptions");
  }

  /** Get a webhook subscription by ID. */
  async getWebhook(
    subscriptionId: string
  ): Promise<ApiResponse<LexofficeWebhookSubscription>> {
    return this.get<LexofficeWebhookSubscription>(
      `/event-subscriptions/${subscriptionId}`
    );
  }

  /** Create a webhook subscription. */
  async createWebhook(
    subscription: LexofficeWebhookSubscription
  ): Promise<ApiResponse<LexofficeWebhookSubscription>> {
    return this.post<LexofficeWebhookSubscription>(
      "/event-subscriptions",
      subscription
    );
  }

  /** Delete a webhook subscription. */
  async deleteWebhook(subscriptionId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/event-subscriptions/${subscriptionId}`);
  }
}
