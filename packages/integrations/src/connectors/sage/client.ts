import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SageContact,
  SageSalesInvoice,
  SagePurchaseInvoice,
  SageLedgerAccount,
  SagePayment,
  SageListParams,
  SageListResponse,
  SageWebhookSubscription,
  SageClientConfig,
} from "./types.js";

const SAGE_BASE_URL = "https://api.accounting.sage.com/v3.1";

/**
 * Sage Business Cloud Accounting API client.
 *
 * Cloud accounting platform with contacts, sales invoices, purchase invoices,
 * ledger accounts, payments, and webhook support.
 *
 * Uses OAuth2 authentication via Bearer token.
 */
export class SageClient extends BaseIntegrationClient {
  constructor(config: SageClientConfig) {
    super({
      baseUrl: SAGE_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 300 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });
  }

  private buildListParams(params?: SageListParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page != null) result.page = String(params.page);
    if (params?.items_per_page != null) result.items_per_page = String(params.items_per_page);
    if (params?.search) result.search = params.search;
    if (params?.from_date) result.from_date = params.from_date;
    if (params?.to_date) result.to_date = params.to_date;
    if (params?.updated_or_created_since) result.updated_or_created_since = params.updated_or_created_since;
    if (params?.attributes) result.attributes = params.attributes;
    return result;
  }

  // ==================== Contacts ====================

  /** List contacts. */
  async listContacts(
    params?: SageListParams
  ): Promise<ApiResponse<SageListResponse<SageContact>>> {
    return this.get<SageListResponse<SageContact>>(
      "/contacts",
      this.buildListParams(params)
    );
  }

  /** Get a contact by ID. */
  async getContact(contactId: string): Promise<ApiResponse<SageContact>> {
    return this.get<SageContact>(`/contacts/${contactId}`);
  }

  /** Create a contact. */
  async createContact(
    contact: SageContact
  ): Promise<ApiResponse<SageContact>> {
    return this.post<SageContact>("/contacts", { contact });
  }

  /** Update a contact. */
  async updateContact(
    contactId: string,
    contact: Partial<SageContact>
  ): Promise<ApiResponse<SageContact>> {
    return this.put<SageContact>(`/contacts/${contactId}`, { contact });
  }

  /** Delete a contact. */
  async deleteContact(contactId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/contacts/${contactId}`);
  }

  // ==================== Sales Invoices ====================

  /** List sales invoices. */
  async listSalesInvoices(
    params?: SageListParams
  ): Promise<ApiResponse<SageListResponse<SageSalesInvoice>>> {
    return this.get<SageListResponse<SageSalesInvoice>>(
      "/sales_invoices",
      this.buildListParams(params)
    );
  }

  /** Get a sales invoice by ID. */
  async getSalesInvoice(
    invoiceId: string
  ): Promise<ApiResponse<SageSalesInvoice>> {
    return this.get<SageSalesInvoice>(`/sales_invoices/${invoiceId}`);
  }

  /** Create a sales invoice. */
  async createSalesInvoice(
    invoice: SageSalesInvoice
  ): Promise<ApiResponse<SageSalesInvoice>> {
    return this.post<SageSalesInvoice>("/sales_invoices", { sales_invoice: invoice });
  }

  /** Update a sales invoice. */
  async updateSalesInvoice(
    invoiceId: string,
    invoice: Partial<SageSalesInvoice>
  ): Promise<ApiResponse<SageSalesInvoice>> {
    return this.put<SageSalesInvoice>(`/sales_invoices/${invoiceId}`, { sales_invoice: invoice });
  }

  /** Delete a sales invoice. */
  async deleteSalesInvoice(invoiceId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/sales_invoices/${invoiceId}`);
  }

  /** Void a sales invoice. */
  async voidSalesInvoice(
    invoiceId: string,
    voidReason?: string
  ): Promise<ApiResponse<SageSalesInvoice>> {
    return this.post<SageSalesInvoice>(`/sales_invoices/${invoiceId}/void`, {
      void_reason: voidReason,
    });
  }

  // ==================== Purchase Invoices ====================

  /** List purchase invoices. */
  async listPurchaseInvoices(
    params?: SageListParams
  ): Promise<ApiResponse<SageListResponse<SagePurchaseInvoice>>> {
    return this.get<SageListResponse<SagePurchaseInvoice>>(
      "/purchase_invoices",
      this.buildListParams(params)
    );
  }

  /** Get a purchase invoice by ID. */
  async getPurchaseInvoice(
    invoiceId: string
  ): Promise<ApiResponse<SagePurchaseInvoice>> {
    return this.get<SagePurchaseInvoice>(`/purchase_invoices/${invoiceId}`);
  }

  /** Create a purchase invoice. */
  async createPurchaseInvoice(
    invoice: SagePurchaseInvoice
  ): Promise<ApiResponse<SagePurchaseInvoice>> {
    return this.post<SagePurchaseInvoice>("/purchase_invoices", { purchase_invoice: invoice });
  }

  /** Update a purchase invoice. */
  async updatePurchaseInvoice(
    invoiceId: string,
    invoice: Partial<SagePurchaseInvoice>
  ): Promise<ApiResponse<SagePurchaseInvoice>> {
    return this.put<SagePurchaseInvoice>(`/purchase_invoices/${invoiceId}`, { purchase_invoice: invoice });
  }

  /** Delete a purchase invoice. */
  async deletePurchaseInvoice(invoiceId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/purchase_invoices/${invoiceId}`);
  }

  // ==================== Ledger Accounts ====================

  /** List ledger accounts. */
  async listLedgerAccounts(
    params?: SageListParams
  ): Promise<ApiResponse<SageListResponse<SageLedgerAccount>>> {
    return this.get<SageListResponse<SageLedgerAccount>>(
      "/ledger_accounts",
      this.buildListParams(params)
    );
  }

  /** Get a ledger account by ID. */
  async getLedgerAccount(
    accountId: string
  ): Promise<ApiResponse<SageLedgerAccount>> {
    return this.get<SageLedgerAccount>(`/ledger_accounts/${accountId}`);
  }

  /** Create a ledger account. */
  async createLedgerAccount(
    account: SageLedgerAccount
  ): Promise<ApiResponse<SageLedgerAccount>> {
    return this.post<SageLedgerAccount>("/ledger_accounts", { ledger_account: account });
  }

  /** Update a ledger account. */
  async updateLedgerAccount(
    accountId: string,
    account: Partial<SageLedgerAccount>
  ): Promise<ApiResponse<SageLedgerAccount>> {
    return this.put<SageLedgerAccount>(`/ledger_accounts/${accountId}`, { ledger_account: account });
  }

  // ==================== Payments ====================

  /** List contact payments. */
  async listPayments(
    params?: SageListParams
  ): Promise<ApiResponse<SageListResponse<SagePayment>>> {
    return this.get<SageListResponse<SagePayment>>(
      "/contact_payments",
      this.buildListParams(params)
    );
  }

  /** Get a payment by ID. */
  async getPayment(paymentId: string): Promise<ApiResponse<SagePayment>> {
    return this.get<SagePayment>(`/contact_payments/${paymentId}`);
  }

  /** Create a payment. */
  async createPayment(
    payment: SagePayment
  ): Promise<ApiResponse<SagePayment>> {
    return this.post<SagePayment>("/contact_payments", { contact_payment: payment });
  }

  /** Update a payment. */
  async updatePayment(
    paymentId: string,
    payment: Partial<SagePayment>
  ): Promise<ApiResponse<SagePayment>> {
    return this.put<SagePayment>(`/contact_payments/${paymentId}`, { contact_payment: payment });
  }

  /** Delete a payment. */
  async deletePayment(paymentId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/contact_payments/${paymentId}`);
  }

  // ==================== Webhooks ====================

  /** List webhook subscriptions. */
  async listWebhooks(): Promise<ApiResponse<SageWebhookSubscription[]>> {
    return this.get<SageWebhookSubscription[]>("/webhooks/subscriptions");
  }

  /** Create a webhook subscription. */
  async createWebhook(
    subscription: SageWebhookSubscription
  ): Promise<ApiResponse<SageWebhookSubscription>> {
    return this.post<SageWebhookSubscription>("/webhooks/subscriptions", subscription);
  }

  /** Delete a webhook subscription. */
  async deleteWebhook(subscriptionId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/webhooks/subscriptions/${subscriptionId}`);
  }
}
