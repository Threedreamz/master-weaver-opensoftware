import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SevdeskContact,
  SevdeskContactAddress,
  SevdeskInvoice,
  SevdeskInvoicePosition,
  SevdeskVoucher,
  SevdeskVoucherPosition,
  SevdeskTransaction,
  SevdeskCheckAccount,
  SevdeskListParams,
  SevdeskListResponse,
  SevdeskSingleResponse,
  SevdeskClientConfig,
} from "./types.js";

const SEVDESK_BASE_URL = "https://my.sevdesk.de/api/v1";

/**
 * sevDesk API client.
 *
 * German cloud accounting platform with contacts, invoices, vouchers,
 * bank transactions, and check accounts.
 *
 * Uses API token authentication via Authorization header.
 */
export class SevdeskClient extends BaseIntegrationClient {
  constructor(config: SevdeskClientConfig) {
    super({
      baseUrl: SEVDESK_BASE_URL,
      authType: "api_key",
      credentials: { apiKey: config.apiToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 100 },
    });
  }

  private buildListParams(params?: SevdeskListParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.limit != null) result.limit = String(params.limit);
    if (params?.offset != null) result.offset = String(params.offset);
    if (params?.countAll) result.countAll = "true";
    if (params?.embed?.length) result.embed = params.embed.join(",");
    return result;
  }

  // ==================== Contacts ====================

  /** List all contacts. */
  async listContacts(
    params?: SevdeskListParams
  ): Promise<ApiResponse<SevdeskListResponse<SevdeskContact>>> {
    return this.get<SevdeskListResponse<SevdeskContact>>(
      "/Contact",
      this.buildListParams(params)
    );
  }

  /** Get a contact by ID. */
  async getContact(
    contactId: number
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskContact>>> {
    return this.get<SevdeskSingleResponse<SevdeskContact>>(
      `/Contact/${contactId}`
    );
  }

  /** Create a new contact. */
  async createContact(
    contact: SevdeskContact
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskContact>>> {
    return this.post<SevdeskSingleResponse<SevdeskContact>>("/Contact", contact);
  }

  /** Update an existing contact. */
  async updateContact(
    contactId: number,
    contact: Partial<SevdeskContact>
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskContact>>> {
    return this.put<SevdeskSingleResponse<SevdeskContact>>(
      `/Contact/${contactId}`,
      contact
    );
  }

  /** Delete a contact. */
  async deleteContact(contactId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/Contact/${contactId}`);
  }

  /** Create a contact address. */
  async createContactAddress(
    address: SevdeskContactAddress
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskContactAddress>>> {
    return this.post<SevdeskSingleResponse<SevdeskContactAddress>>(
      "/ContactAddress",
      address
    );
  }

  // ==================== Invoices ====================

  /** List all invoices. */
  async listInvoices(
    params?: SevdeskListParams & { status?: number; contactId?: number }
  ): Promise<ApiResponse<SevdeskListResponse<SevdeskInvoice>>> {
    const queryParams = this.buildListParams(params);
    if (params?.status != null) queryParams["status"] = String(params.status);
    if (params?.contactId != null)
      queryParams["contact[id]"] = String(params.contactId);

    return this.get<SevdeskListResponse<SevdeskInvoice>>(
      "/Invoice",
      queryParams
    );
  }

  /** Get an invoice by ID. */
  async getInvoice(
    invoiceId: number
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskInvoice>>> {
    return this.get<SevdeskSingleResponse<SevdeskInvoice>>(
      `/Invoice/${invoiceId}`
    );
  }

  /** Create a new invoice with positions. */
  async createInvoice(
    invoice: SevdeskInvoice,
    positions: SevdeskInvoicePosition[]
  ): Promise<
    ApiResponse<{
      objects: { invoice: SevdeskInvoice; invoicePos: SevdeskInvoicePosition[] };
    }>
  > {
    return this.post<{
      objects: { invoice: SevdeskInvoice; invoicePos: SevdeskInvoicePosition[] };
    }>("/Invoice/Factory/saveInvoice", {
      invoice,
      invoicePosSave: positions,
      invoicePosDelete: null,
      discountSave: null,
      discountDelete: null,
    });
  }

  /** Send an invoice via email. */
  async sendInvoiceByEmail(
    invoiceId: number,
    email: string,
    subject: string,
    text: string
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskInvoice>>> {
    return this.post<SevdeskSingleResponse<SevdeskInvoice>>(
      `/Invoice/${invoiceId}/sendViaEmail`,
      { toEmail: email, subject, text }
    );
  }

  /** Mark an invoice as sent. */
  async markInvoiceSent(
    invoiceId: number
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskInvoice>>> {
    return this.put<SevdeskSingleResponse<SevdeskInvoice>>(
      `/Invoice/${invoiceId}/changeStatus`,
      { value: 200 }
    );
  }

  /** Mark an invoice as paid. */
  async markInvoicePaid(
    invoiceId: number,
    payDate: string,
    paymentMethodId?: number
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskInvoice>>> {
    const body: Record<string, unknown> = {
      amount: null, // null = pay full amount
      date: payDate,
    };
    if (paymentMethodId != null) {
      body.checkAccount = { id: paymentMethodId, objectName: "CheckAccount" };
    }
    return this.put<SevdeskSingleResponse<SevdeskInvoice>>(
      `/Invoice/${invoiceId}/bookAmount`,
      body
    );
  }

  /** Download invoice PDF. Returns the PDF document object. */
  async getInvoicePdf(
    invoiceId: number
  ): Promise<ApiResponse<{ objects: { filename: string; base64: string } }>> {
    return this.get<{ objects: { filename: string; base64: string } }>(
      `/Invoice/${invoiceId}/getPdf`
    );
  }

  // ==================== Vouchers ====================

  /** List all vouchers (Belege). */
  async listVouchers(
    params?: SevdeskListParams & { status?: number }
  ): Promise<ApiResponse<SevdeskListResponse<SevdeskVoucher>>> {
    const queryParams = this.buildListParams(params);
    if (params?.status != null) queryParams["status"] = String(params.status);

    return this.get<SevdeskListResponse<SevdeskVoucher>>(
      "/Voucher",
      queryParams
    );
  }

  /** Get a voucher by ID. */
  async getVoucher(
    voucherId: number
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskVoucher>>> {
    return this.get<SevdeskSingleResponse<SevdeskVoucher>>(
      `/Voucher/${voucherId}`
    );
  }

  /** Create a voucher with positions. */
  async createVoucher(
    voucher: SevdeskVoucher,
    positions: SevdeskVoucherPosition[],
    filename?: string
  ): Promise<
    ApiResponse<{
      objects: { voucher: SevdeskVoucher; voucherPos: SevdeskVoucherPosition[] };
    }>
  > {
    const body: Record<string, unknown> = {
      voucher,
      voucherPosSave: positions,
      voucherPosDelete: null,
    };
    if (filename) body.filename = filename;

    return this.post<{
      objects: { voucher: SevdeskVoucher; voucherPos: SevdeskVoucherPosition[] };
    }>("/Voucher/Factory/saveVoucher", body);
  }

  /** Book a voucher amount (mark as paid). */
  async bookVoucher(
    voucherId: number,
    amount: number,
    date: string,
    checkAccountId: number
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskVoucher>>> {
    return this.put<SevdeskSingleResponse<SevdeskVoucher>>(
      `/Voucher/${voucherId}/bookAmount`,
      {
        amount,
        date,
        type: "N",
        checkAccount: { id: checkAccountId, objectName: "CheckAccount" },
      }
    );
  }

  // ==================== Transactions ====================

  /** List transactions for a check account. */
  async listTransactions(
    checkAccountId: number,
    params?: SevdeskListParams
  ): Promise<ApiResponse<SevdeskListResponse<SevdeskTransaction>>> {
    const queryParams = this.buildListParams(params);
    queryParams["checkAccount[id]"] = String(checkAccountId);
    queryParams["checkAccount[objectName]"] = "CheckAccount";

    return this.get<SevdeskListResponse<SevdeskTransaction>>(
      "/CheckAccountTransaction",
      queryParams
    );
  }

  /** Get a single transaction by ID. */
  async getTransaction(
    transactionId: number
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskTransaction>>> {
    return this.get<SevdeskSingleResponse<SevdeskTransaction>>(
      `/CheckAccountTransaction/${transactionId}`
    );
  }

  /** Create a manual transaction. */
  async createTransaction(
    transaction: SevdeskTransaction
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskTransaction>>> {
    return this.post<SevdeskSingleResponse<SevdeskTransaction>>(
      "/CheckAccountTransaction",
      transaction
    );
  }

  // ==================== Check Accounts (Bank Accounts) ====================

  /** List all check accounts. */
  async listCheckAccounts(
    params?: SevdeskListParams
  ): Promise<ApiResponse<SevdeskListResponse<SevdeskCheckAccount>>> {
    return this.get<SevdeskListResponse<SevdeskCheckAccount>>(
      "/CheckAccount",
      this.buildListParams(params)
    );
  }

  /** Get a check account by ID. */
  async getCheckAccount(
    accountId: number
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskCheckAccount>>> {
    return this.get<SevdeskSingleResponse<SevdeskCheckAccount>>(
      `/CheckAccount/${accountId}`
    );
  }

  /** Create a new check account. */
  async createCheckAccount(
    account: SevdeskCheckAccount
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskCheckAccount>>> {
    return this.post<SevdeskSingleResponse<SevdeskCheckAccount>>(
      "/CheckAccount",
      account
    );
  }

  /** Update a check account. */
  async updateCheckAccount(
    accountId: number,
    account: Partial<SevdeskCheckAccount>
  ): Promise<ApiResponse<SevdeskSingleResponse<SevdeskCheckAccount>>> {
    return this.put<SevdeskSingleResponse<SevdeskCheckAccount>>(
      `/CheckAccount/${accountId}`,
      account
    );
  }

  /** Get the current balance of a check account. */
  async getCheckAccountBalance(
    accountId: number
  ): Promise<ApiResponse<{ objects: number }>> {
    return this.get<{ objects: number }>(
      `/CheckAccount/${accountId}/getBalance`
    );
  }
}
