import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  ScopevisioContact,
  ScopevisioInvoice,
  ScopevisioBooking,
  ScopevisioDocument,
  ScopevisioListParams,
  ScopevisioListResponse,
  ScopevisioClientConfig,
} from "./types.js";

const SCOPEVISIO_BASE_URL = "https://appload.scopevisio.com/rest";

/**
 * Scopevisio API client.
 *
 * German cloud business platform with contacts, invoices, bookings,
 * and document management.
 *
 * Uses OAuth2 authentication via Bearer token.
 */
export class ScopevisioClient extends BaseIntegrationClient {
  constructor(config: ScopevisioClientConfig) {
    const defaultHeaders: Record<string, string> = {
      Accept: "application/json",
    };
    if (config.organisationId) {
      defaultHeaders["X-Scopevisio-Organisation"] = config.organisationId;
    }

    super({
      baseUrl: SCOPEVISIO_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
      defaultHeaders,
    });
  }

  private buildListParams(params?: ScopevisioListParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page != null) result.page = String(params.page);
    if (params?.pageSize != null) result.pageSize = String(params.pageSize);
    if (params?.orderBy) result.orderBy = params.orderBy;
    if (params?.filter) result.filter = params.filter;
    if (params?.search) result.search = params.search;
    return result;
  }

  // ==================== Contacts ====================

  /** List contacts. */
  async listContacts(
    params?: ScopevisioListParams
  ): Promise<ApiResponse<ScopevisioListResponse<ScopevisioContact>>> {
    return this.get<ScopevisioListResponse<ScopevisioContact>>(
      "/contacts",
      this.buildListParams(params)
    );
  }

  /** Get a contact by ID. */
  async getContact(contactId: number): Promise<ApiResponse<ScopevisioContact>> {
    return this.get<ScopevisioContact>(`/contacts/${contactId}`);
  }

  /** Create a contact. */
  async createContact(
    contact: ScopevisioContact
  ): Promise<ApiResponse<ScopevisioContact>> {
    return this.post<ScopevisioContact>("/contacts", contact);
  }

  /** Update a contact. */
  async updateContact(
    contactId: number,
    contact: Partial<ScopevisioContact>
  ): Promise<ApiResponse<ScopevisioContact>> {
    return this.put<ScopevisioContact>(`/contacts/${contactId}`, contact);
  }

  /** Delete a contact. */
  async deleteContact(contactId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/contacts/${contactId}`);
  }

  // ==================== Invoices ====================

  /** List invoices. */
  async listInvoices(
    params?: ScopevisioListParams
  ): Promise<ApiResponse<ScopevisioListResponse<ScopevisioInvoice>>> {
    return this.get<ScopevisioListResponse<ScopevisioInvoice>>(
      "/invoices",
      this.buildListParams(params)
    );
  }

  /** Get an invoice by ID. */
  async getInvoice(invoiceId: number): Promise<ApiResponse<ScopevisioInvoice>> {
    return this.get<ScopevisioInvoice>(`/invoices/${invoiceId}`);
  }

  /** Create an invoice. */
  async createInvoice(
    invoice: ScopevisioInvoice
  ): Promise<ApiResponse<ScopevisioInvoice>> {
    return this.post<ScopevisioInvoice>("/invoices", invoice);
  }

  /** Update an invoice. */
  async updateInvoice(
    invoiceId: number,
    invoice: Partial<ScopevisioInvoice>
  ): Promise<ApiResponse<ScopevisioInvoice>> {
    return this.put<ScopevisioInvoice>(`/invoices/${invoiceId}`, invoice);
  }

  /** Delete an invoice. */
  async deleteInvoice(invoiceId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/invoices/${invoiceId}`);
  }

  /** Finalize an invoice (transition from draft to open). */
  async finalizeInvoice(invoiceId: number): Promise<ApiResponse<ScopevisioInvoice>> {
    return this.post<ScopevisioInvoice>(`/invoices/${invoiceId}/finalize`);
  }

  /** Send an invoice by email. */
  async sendInvoice(
    invoiceId: number,
    email: string,
    subject?: string,
    message?: string
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/invoices/${invoiceId}/send`, {
      email,
      subject,
      message,
    });
  }

  // ==================== Bookings ====================

  /** List bookings. */
  async listBookings(
    params?: ScopevisioListParams
  ): Promise<ApiResponse<ScopevisioListResponse<ScopevisioBooking>>> {
    return this.get<ScopevisioListResponse<ScopevisioBooking>>(
      "/bookings",
      this.buildListParams(params)
    );
  }

  /** Get a booking by ID. */
  async getBooking(bookingId: number): Promise<ApiResponse<ScopevisioBooking>> {
    return this.get<ScopevisioBooking>(`/bookings/${bookingId}`);
  }

  /** Create a booking. */
  async createBooking(
    booking: ScopevisioBooking
  ): Promise<ApiResponse<ScopevisioBooking>> {
    return this.post<ScopevisioBooking>("/bookings", booking);
  }

  /** Update a booking. */
  async updateBooking(
    bookingId: number,
    booking: Partial<ScopevisioBooking>
  ): Promise<ApiResponse<ScopevisioBooking>> {
    return this.put<ScopevisioBooking>(`/bookings/${bookingId}`, booking);
  }

  /** Delete a booking. */
  async deleteBooking(bookingId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/bookings/${bookingId}`);
  }

  /** Post a booking (finalize). */
  async postBooking(bookingId: number): Promise<ApiResponse<ScopevisioBooking>> {
    return this.post<ScopevisioBooking>(`/bookings/${bookingId}/post`);
  }

  // ==================== Documents ====================

  /** List documents. */
  async listDocuments(
    params?: ScopevisioListParams
  ): Promise<ApiResponse<ScopevisioListResponse<ScopevisioDocument>>> {
    return this.get<ScopevisioListResponse<ScopevisioDocument>>(
      "/documents",
      this.buildListParams(params)
    );
  }

  /** Get a document by ID. */
  async getDocument(documentId: number): Promise<ApiResponse<ScopevisioDocument>> {
    return this.get<ScopevisioDocument>(`/documents/${documentId}`);
  }

  /** Upload a document. */
  async uploadDocument(
    document: ScopevisioDocument,
    content?: string // base64 encoded
  ): Promise<ApiResponse<ScopevisioDocument>> {
    return this.post<ScopevisioDocument>("/documents", {
      ...document,
      content,
    });
  }

  /** Delete a document. */
  async deleteDocument(documentId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/documents/${documentId}`);
  }

  /** Download a document content. Returns base64-encoded file content. */
  async downloadDocument(
    documentId: number
  ): Promise<ApiResponse<{ content: string; mimeType: string; fileName: string }>> {
    return this.get<{ content: string; mimeType: string; fileName: string }>(
      `/documents/${documentId}/content`
    );
  }
}
