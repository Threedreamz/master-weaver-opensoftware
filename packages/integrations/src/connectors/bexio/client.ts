import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  BexioContact,
  BexioInvoice,
  BexioOrder,
  BexioPayment,
  BexioBankAccount,
  BexioListParams,
  BexioWebhookSubscription,
  BexioClientConfig,
} from "./types.js";

const BEXIO_BASE_URL = "https://api.bexio.com/2.0";

/**
 * bexio API client.
 *
 * Swiss cloud accounting platform with contacts, invoices, orders,
 * banking, and webhook support.
 *
 * Uses OAuth2 authentication via Bearer token.
 */
export class BexioClient extends BaseIntegrationClient {
  constructor(config: BexioClientConfig) {
    super({
      baseUrl: BEXIO_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 300 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });
  }

  private buildListParams(params?: BexioListParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.offset != null) result.offset = String(params.offset);
    if (params?.limit != null) result.limit = String(params.limit);
    if (params?.order_by) result.order_by = params.order_by;
    return result;
  }

  // ==================== Contacts ====================

  /** List all contacts. */
  async listContacts(
    params?: BexioListParams
  ): Promise<ApiResponse<BexioContact[]>> {
    return this.get<BexioContact[]>("/contact", this.buildListParams(params));
  }

  /** Get a contact by ID. */
  async getContact(contactId: number): Promise<ApiResponse<BexioContact>> {
    return this.get<BexioContact>(`/contact/${contactId}`);
  }

  /** Create a new contact. */
  async createContact(
    contact: BexioContact
  ): Promise<ApiResponse<BexioContact>> {
    return this.post<BexioContact>("/contact", contact);
  }

  /** Update an existing contact. */
  async updateContact(
    contactId: number,
    contact: Partial<BexioContact>
  ): Promise<ApiResponse<BexioContact>> {
    return this.post<BexioContact>(`/contact/${contactId}`, contact);
  }

  /** Delete a contact. */
  async deleteContact(contactId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/contact/${contactId}`);
  }

  // ==================== Invoices ====================

  /** List all invoices. */
  async listInvoices(
    params?: BexioListParams
  ): Promise<ApiResponse<BexioInvoice[]>> {
    return this.get<BexioInvoice[]>(
      "/kb_invoice",
      this.buildListParams(params)
    );
  }

  /** Get an invoice by ID. */
  async getInvoice(invoiceId: number): Promise<ApiResponse<BexioInvoice>> {
    return this.get<BexioInvoice>(`/kb_invoice/${invoiceId}`);
  }

  /** Create a new invoice. */
  async createInvoice(
    invoice: BexioInvoice
  ): Promise<ApiResponse<BexioInvoice>> {
    return this.post<BexioInvoice>("/kb_invoice", invoice);
  }

  /** Update an existing invoice. */
  async updateInvoice(
    invoiceId: number,
    invoice: Partial<BexioInvoice>
  ): Promise<ApiResponse<BexioInvoice>> {
    return this.post<BexioInvoice>(`/kb_invoice/${invoiceId}`, invoice);
  }

  /** Delete an invoice. */
  async deleteInvoice(invoiceId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/kb_invoice/${invoiceId}`);
  }

  /** Send an invoice by email. */
  async sendInvoiceByEmail(
    invoiceId: number,
    recipientEmail: string,
    subject: string,
    message: string
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/kb_invoice/${invoiceId}/send`, {
      recipient_email: recipientEmail,
      subject,
      message,
    });
  }

  /** Get invoice PDF. */
  async getInvoicePdf(
    invoiceId: number
  ): Promise<ApiResponse<{ name: string; size: number; mime: string; content: string }>> {
    return this.get<{ name: string; size: number; mime: string; content: string }>(
      `/kb_invoice/${invoiceId}/pdf`
    );
  }

  // ==================== Orders ====================

  /** List all orders. */
  async listOrders(
    params?: BexioListParams
  ): Promise<ApiResponse<BexioOrder[]>> {
    return this.get<BexioOrder[]>(
      "/kb_order",
      this.buildListParams(params)
    );
  }

  /** Get an order by ID. */
  async getOrder(orderId: number): Promise<ApiResponse<BexioOrder>> {
    return this.get<BexioOrder>(`/kb_order/${orderId}`);
  }

  /** Create a new order. */
  async createOrder(order: BexioOrder): Promise<ApiResponse<BexioOrder>> {
    return this.post<BexioOrder>("/kb_order", order);
  }

  /** Update an existing order. */
  async updateOrder(
    orderId: number,
    order: Partial<BexioOrder>
  ): Promise<ApiResponse<BexioOrder>> {
    return this.post<BexioOrder>(`/kb_order/${orderId}`, order);
  }

  /** Delete an order. */
  async deleteOrder(orderId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/kb_order/${orderId}`);
  }

  // ==================== Banking ====================

  /** List all bank accounts. */
  async listBankAccounts(): Promise<ApiResponse<BexioBankAccount[]>> {
    return this.get<BexioBankAccount[]>("/banking/accounts");
  }

  /** Get a bank account by ID. */
  async getBankAccount(
    accountId: number
  ): Promise<ApiResponse<BexioBankAccount>> {
    return this.get<BexioBankAccount>(`/banking/accounts/${accountId}`);
  }

  /** List payments. */
  async listPayments(
    params?: BexioListParams
  ): Promise<ApiResponse<BexioPayment[]>> {
    return this.get<BexioPayment[]>(
      "/kb_payment",
      this.buildListParams(params)
    );
  }

  /** Get a payment by ID. */
  async getPayment(paymentId: number): Promise<ApiResponse<BexioPayment>> {
    return this.get<BexioPayment>(`/kb_payment/${paymentId}`);
  }

  /** Create a new payment. */
  async createPayment(
    payment: BexioPayment
  ): Promise<ApiResponse<BexioPayment>> {
    return this.post<BexioPayment>("/kb_payment", payment);
  }

  // ==================== Webhooks ====================

  /** List all webhook subscriptions. */
  async listWebhooks(): Promise<ApiResponse<BexioWebhookSubscription[]>> {
    return this.get<BexioWebhookSubscription[]>("/webhooks");
  }

  /** Create a webhook subscription. */
  async createWebhook(
    subscription: BexioWebhookSubscription
  ): Promise<ApiResponse<BexioWebhookSubscription>> {
    return this.post<BexioWebhookSubscription>("/webhooks", subscription);
  }

  /** Delete a webhook subscription. */
  async deleteWebhook(webhookId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/webhooks/${webhookId}`);
  }
}
