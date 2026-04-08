import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  QBCustomer,
  QBInvoice,
  QBPayment,
  QBAccount,
  QBVendor,
  QBBill,
  QBQueryResponse,
  QBClientConfig,
} from "./types.js";

const QB_PRODUCTION_URL = "https://quickbooks.api.intuit.com/v3";
const QB_SANDBOX_URL = "https://sandbox-quickbooks.api.intuit.com/v3";

/**
 * QuickBooks Online API client.
 *
 * Cloud accounting platform with customers, invoices, payments, accounts,
 * vendors, bills, and webhook support.
 *
 * Uses OAuth2 authentication via Bearer token. All entity endpoints
 * are scoped to a company (realm) ID.
 */
export class QuickBooksClient extends BaseIntegrationClient {
  private realmId: string;

  constructor(config: QBClientConfig) {
    const baseUrl = config.sandbox ? QB_SANDBOX_URL : QB_PRODUCTION_URL;
    super({
      baseUrl,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 500 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });
    this.realmId = config.realmId;
  }

  private companyPath(path: string): string {
    return `/company/${this.realmId}${path}`;
  }

  /** Execute a SQL-like query against QBO entities. */
  async query<T = unknown>(
    queryString: string,
    minorversion = "65"
  ): Promise<ApiResponse<QBQueryResponse<T>>> {
    return this.get<QBQueryResponse<T>>(this.companyPath("/query"), {
      query: queryString,
      minorversion,
    });
  }

  // ==================== Customers ====================

  /** Get a customer by ID. */
  async getCustomer(customerId: string): Promise<ApiResponse<{ Customer: QBCustomer }>> {
    return this.get<{ Customer: QBCustomer }>(
      this.companyPath(`/customer/${customerId}`)
    );
  }

  /** Create a customer. */
  async createCustomer(
    customer: QBCustomer
  ): Promise<ApiResponse<{ Customer: QBCustomer }>> {
    return this.post<{ Customer: QBCustomer }>(
      this.companyPath("/customer"),
      customer
    );
  }

  /** Update a customer (sparse update). */
  async updateCustomer(
    customer: QBCustomer & { Id: string; SyncToken: string }
  ): Promise<ApiResponse<{ Customer: QBCustomer }>> {
    return this.post<{ Customer: QBCustomer }>(
      this.companyPath("/customer"),
      { ...customer, sparse: true }
    );
  }

  /** Query customers. */
  async listCustomers(
    maxResults = 100,
    startPosition = 1
  ): Promise<ApiResponse<QBQueryResponse<QBCustomer>>> {
    return this.query<QBCustomer>(
      `SELECT * FROM Customer MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`
    );
  }

  // ==================== Invoices ====================

  /** Get an invoice by ID. */
  async getInvoice(invoiceId: string): Promise<ApiResponse<{ Invoice: QBInvoice }>> {
    return this.get<{ Invoice: QBInvoice }>(
      this.companyPath(`/invoice/${invoiceId}`)
    );
  }

  /** Create an invoice. */
  async createInvoice(
    invoice: QBInvoice
  ): Promise<ApiResponse<{ Invoice: QBInvoice }>> {
    return this.post<{ Invoice: QBInvoice }>(
      this.companyPath("/invoice"),
      invoice
    );
  }

  /** Update an invoice (sparse update). */
  async updateInvoice(
    invoice: QBInvoice & { Id: string; SyncToken: string }
  ): Promise<ApiResponse<{ Invoice: QBInvoice }>> {
    return this.post<{ Invoice: QBInvoice }>(
      this.companyPath("/invoice"),
      { ...invoice, sparse: true }
    );
  }

  /** Delete an invoice. */
  async deleteInvoice(
    invoiceId: string,
    syncToken: string
  ): Promise<ApiResponse<{ Invoice: QBInvoice }>> {
    return this.post<{ Invoice: QBInvoice }>(
      this.companyPath("/invoice"),
      { Id: invoiceId, SyncToken: syncToken },
    );
  }

  /** Send an invoice by email. */
  async sendInvoice(
    invoiceId: string,
    email?: string
  ): Promise<ApiResponse<{ Invoice: QBInvoice }>> {
    const params: Record<string, string> = {};
    if (email) params.sendTo = email;
    return this.request<{ Invoice: QBInvoice }>({
      method: "POST",
      path: this.companyPath(`/invoice/${invoiceId}/send`),
      params,
    });
  }

  /** Query invoices. */
  async listInvoices(
    maxResults = 100,
    startPosition = 1
  ): Promise<ApiResponse<QBQueryResponse<QBInvoice>>> {
    return this.query<QBInvoice>(
      `SELECT * FROM Invoice MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`
    );
  }

  // ==================== Payments ====================

  /** Get a payment by ID. */
  async getPayment(paymentId: string): Promise<ApiResponse<{ Payment: QBPayment }>> {
    return this.get<{ Payment: QBPayment }>(
      this.companyPath(`/payment/${paymentId}`)
    );
  }

  /** Create a payment. */
  async createPayment(
    payment: QBPayment
  ): Promise<ApiResponse<{ Payment: QBPayment }>> {
    return this.post<{ Payment: QBPayment }>(
      this.companyPath("/payment"),
      payment
    );
  }

  /** Update a payment. */
  async updatePayment(
    payment: QBPayment & { Id: string; SyncToken: string }
  ): Promise<ApiResponse<{ Payment: QBPayment }>> {
    return this.post<{ Payment: QBPayment }>(
      this.companyPath("/payment"),
      { ...payment, sparse: true }
    );
  }

  /** Query payments. */
  async listPayments(
    maxResults = 100,
    startPosition = 1
  ): Promise<ApiResponse<QBQueryResponse<QBPayment>>> {
    return this.query<QBPayment>(
      `SELECT * FROM Payment MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`
    );
  }

  // ==================== Accounts ====================

  /** Get an account by ID. */
  async getAccount(accountId: string): Promise<ApiResponse<{ Account: QBAccount }>> {
    return this.get<{ Account: QBAccount }>(
      this.companyPath(`/account/${accountId}`)
    );
  }

  /** Create an account. */
  async createAccount(
    account: QBAccount
  ): Promise<ApiResponse<{ Account: QBAccount }>> {
    return this.post<{ Account: QBAccount }>(
      this.companyPath("/account"),
      account
    );
  }

  /** Update an account. */
  async updateAccount(
    account: QBAccount & { Id: string; SyncToken: string }
  ): Promise<ApiResponse<{ Account: QBAccount }>> {
    return this.post<{ Account: QBAccount }>(
      this.companyPath("/account"),
      { ...account, sparse: true }
    );
  }

  /** Query accounts. */
  async listAccounts(
    maxResults = 100,
    startPosition = 1
  ): Promise<ApiResponse<QBQueryResponse<QBAccount>>> {
    return this.query<QBAccount>(
      `SELECT * FROM Account MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`
    );
  }

  // ==================== Vendors ====================

  /** Get a vendor by ID. */
  async getVendor(vendorId: string): Promise<ApiResponse<{ Vendor: QBVendor }>> {
    return this.get<{ Vendor: QBVendor }>(
      this.companyPath(`/vendor/${vendorId}`)
    );
  }

  /** Create a vendor. */
  async createVendor(
    vendor: QBVendor
  ): Promise<ApiResponse<{ Vendor: QBVendor }>> {
    return this.post<{ Vendor: QBVendor }>(
      this.companyPath("/vendor"),
      vendor
    );
  }

  /** Update a vendor. */
  async updateVendor(
    vendor: QBVendor & { Id: string; SyncToken: string }
  ): Promise<ApiResponse<{ Vendor: QBVendor }>> {
    return this.post<{ Vendor: QBVendor }>(
      this.companyPath("/vendor"),
      { ...vendor, sparse: true }
    );
  }

  /** Query vendors. */
  async listVendors(
    maxResults = 100,
    startPosition = 1
  ): Promise<ApiResponse<QBQueryResponse<QBVendor>>> {
    return this.query<QBVendor>(
      `SELECT * FROM Vendor MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`
    );
  }

  // ==================== Bills ====================

  /** Get a bill by ID. */
  async getBill(billId: string): Promise<ApiResponse<{ Bill: QBBill }>> {
    return this.get<{ Bill: QBBill }>(
      this.companyPath(`/bill/${billId}`)
    );
  }

  /** Create a bill. */
  async createBill(
    bill: QBBill
  ): Promise<ApiResponse<{ Bill: QBBill }>> {
    return this.post<{ Bill: QBBill }>(
      this.companyPath("/bill"),
      bill
    );
  }

  /** Update a bill. */
  async updateBill(
    bill: QBBill & { Id: string; SyncToken: string }
  ): Promise<ApiResponse<{ Bill: QBBill }>> {
    return this.post<{ Bill: QBBill }>(
      this.companyPath("/bill"),
      { ...bill, sparse: true }
    );
  }

  /** Delete a bill. */
  async deleteBill(
    billId: string,
    syncToken: string
  ): Promise<ApiResponse<{ Bill: QBBill }>> {
    return this.post<{ Bill: QBBill }>(
      this.companyPath("/bill"),
      { Id: billId, SyncToken: syncToken }
    );
  }

  /** Query bills. */
  async listBills(
    maxResults = 100,
    startPosition = 1
  ): Promise<ApiResponse<QBQueryResponse<QBBill>>> {
    return this.query<QBBill>(
      `SELECT * FROM Bill MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`
    );
  }
}
