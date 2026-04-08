import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  DebitoorInvoice,
  DebitoorCustomer,
  DebitoorExpense,
  DebitoorProduct,
  DebitoorListParams,
  DebitoorListResponse,
  DebitoorClientConfig,
} from "./types.js";

const DEBITOOR_BASE_URL = "https://api.debitoor.com/api/v1.0";

/**
 * Debitoor/SumUp Invoices API client.
 *
 * Invoicing platform (formerly Debitoor, now SumUp Invoices) with
 * invoices, customers, expenses, and products.
 *
 * Uses OAuth2 authentication via Bearer token.
 */
export class DebitoorClient extends BaseIntegrationClient {
  constructor(config: DebitoorClientConfig) {
    super({
      baseUrl: DEBITOOR_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 120 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });
  }

  private buildListParams(params?: DebitoorListParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page != null) result.page = String(params.page);
    if (params?.pageSize != null) result.pageSize = String(params.pageSize);
    if (params?.sort) result.sort = params.sort;
    if (params?.order) result.order = params.order;
    if (params?.startDate) result.startDate = params.startDate;
    if (params?.endDate) result.endDate = params.endDate;
    return result;
  }

  // ==================== Invoices ====================

  /** List invoices. */
  async listInvoices(
    params?: DebitoorListParams
  ): Promise<ApiResponse<DebitoorListResponse<DebitoorInvoice>>> {
    return this.get<DebitoorListResponse<DebitoorInvoice>>(
      "/invoices",
      this.buildListParams(params)
    );
  }

  /** Get an invoice by ID. */
  async getInvoice(invoiceId: string): Promise<ApiResponse<DebitoorInvoice>> {
    return this.get<DebitoorInvoice>(`/invoices/${invoiceId}`);
  }

  /** Create an invoice. */
  async createInvoice(
    invoice: DebitoorInvoice
  ): Promise<ApiResponse<DebitoorInvoice>> {
    return this.post<DebitoorInvoice>("/invoices", invoice);
  }

  /** Update an invoice. */
  async updateInvoice(
    invoiceId: string,
    invoice: Partial<DebitoorInvoice>
  ): Promise<ApiResponse<DebitoorInvoice>> {
    return this.put<DebitoorInvoice>(`/invoices/${invoiceId}`, invoice);
  }

  /** Delete an invoice. */
  async deleteInvoice(invoiceId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/invoices/${invoiceId}`);
  }

  /** Send an invoice by email. */
  async sendInvoice(
    invoiceId: string,
    recipientEmail: string,
    subject?: string,
    message?: string
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/invoices/${invoiceId}/send`, {
      recipient: recipientEmail,
      subject,
      message,
    });
  }

  /** Mark an invoice as paid. */
  async markInvoicePaid(
    invoiceId: string,
    paidDate?: string,
    amount?: number
  ): Promise<ApiResponse<DebitoorInvoice>> {
    return this.post<DebitoorInvoice>(`/invoices/${invoiceId}/pay`, {
      paidDate: paidDate ?? new Date().toISOString().split("T")[0],
      amount,
    });
  }

  /** Get invoice PDF. */
  async getInvoicePdf(invoiceId: string): Promise<ApiResponse<{ url: string }>> {
    return this.get<{ url: string }>(`/invoices/${invoiceId}/pdf`);
  }

  // ==================== Customers ====================

  /** List customers. */
  async listCustomers(
    params?: DebitoorListParams
  ): Promise<ApiResponse<DebitoorListResponse<DebitoorCustomer>>> {
    return this.get<DebitoorListResponse<DebitoorCustomer>>(
      "/customers",
      this.buildListParams(params)
    );
  }

  /** Get a customer by ID. */
  async getCustomer(customerId: string): Promise<ApiResponse<DebitoorCustomer>> {
    return this.get<DebitoorCustomer>(`/customers/${customerId}`);
  }

  /** Create a customer. */
  async createCustomer(
    customer: DebitoorCustomer
  ): Promise<ApiResponse<DebitoorCustomer>> {
    return this.post<DebitoorCustomer>("/customers", customer);
  }

  /** Update a customer. */
  async updateCustomer(
    customerId: string,
    customer: Partial<DebitoorCustomer>
  ): Promise<ApiResponse<DebitoorCustomer>> {
    return this.put<DebitoorCustomer>(`/customers/${customerId}`, customer);
  }

  /** Delete a customer. */
  async deleteCustomer(customerId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/customers/${customerId}`);
  }

  // ==================== Expenses ====================

  /** List expenses. */
  async listExpenses(
    params?: DebitoorListParams
  ): Promise<ApiResponse<DebitoorListResponse<DebitoorExpense>>> {
    return this.get<DebitoorListResponse<DebitoorExpense>>(
      "/expenses",
      this.buildListParams(params)
    );
  }

  /** Get an expense by ID. */
  async getExpense(expenseId: string): Promise<ApiResponse<DebitoorExpense>> {
    return this.get<DebitoorExpense>(`/expenses/${expenseId}`);
  }

  /** Create an expense. */
  async createExpense(
    expense: DebitoorExpense
  ): Promise<ApiResponse<DebitoorExpense>> {
    return this.post<DebitoorExpense>("/expenses", expense);
  }

  /** Update an expense. */
  async updateExpense(
    expenseId: string,
    expense: Partial<DebitoorExpense>
  ): Promise<ApiResponse<DebitoorExpense>> {
    return this.put<DebitoorExpense>(`/expenses/${expenseId}`, expense);
  }

  /** Delete an expense. */
  async deleteExpense(expenseId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/expenses/${expenseId}`);
  }

  // ==================== Products ====================

  /** List products. */
  async listProducts(
    params?: DebitoorListParams
  ): Promise<ApiResponse<DebitoorListResponse<DebitoorProduct>>> {
    return this.get<DebitoorListResponse<DebitoorProduct>>(
      "/products",
      this.buildListParams(params)
    );
  }

  /** Get a product by ID. */
  async getProduct(productId: string): Promise<ApiResponse<DebitoorProduct>> {
    return this.get<DebitoorProduct>(`/products/${productId}`);
  }

  /** Create a product. */
  async createProduct(
    product: DebitoorProduct
  ): Promise<ApiResponse<DebitoorProduct>> {
    return this.post<DebitoorProduct>("/products", product);
  }

  /** Update a product. */
  async updateProduct(
    productId: string,
    product: Partial<DebitoorProduct>
  ): Promise<ApiResponse<DebitoorProduct>> {
    return this.put<DebitoorProduct>(`/products/${productId}`, product);
  }

  /** Delete a product. */
  async deleteProduct(productId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/products/${productId}`);
  }
}
