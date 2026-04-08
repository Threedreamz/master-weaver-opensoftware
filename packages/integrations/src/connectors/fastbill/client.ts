import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  FastbillCustomer,
  FastbillInvoice,
  FastbillInvoiceItem,
  FastbillArticle,
  FastbillExpense,
  FastbillRevenue,
  FastbillFilter,
  FastbillApiResponse,
  FastbillClientConfig,
} from "./types.js";

const FASTBILL_BASE_URL = "https://my.fastbill.com/api/1.0";

/**
 * FastBill API client.
 *
 * German invoicing platform with customers, invoices, articles,
 * expenses, and revenues.
 *
 * Uses HTTP basic auth with email + API key. All requests are POST
 * to a single endpoint with a SERVICE identifier in the JSON body.
 */
export class FastbillClient extends BaseIntegrationClient {
  constructor(config: FastbillClientConfig) {
    super({
      baseUrl: FASTBILL_BASE_URL,
      authType: "basic_auth",
      credentials: {
        username: config.email,
        password: config.apiKey,
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });
  }

  /**
   * Execute a FastBill API call.
   * FastBill uses a single endpoint — all operations are differentiated
   * by the SERVICE field in the request body.
   */
  private async call<T>(
    service: string,
    filter?: FastbillFilter,
    data?: Record<string, unknown>,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<FastbillApiResponse<T>>> {
    const body: Record<string, unknown> = { SERVICE: service };
    if (filter) body.FILTER = filter;
    if (data) body.DATA = data;
    if (limit != null) body.LIMIT = limit;
    if (offset != null) body.OFFSET = offset;

    return this.post<FastbillApiResponse<T>>("/api.php", body);
  }

  // ==================== Customers ====================

  /** List customers with optional filters. */
  async listCustomers(
    filter?: FastbillFilter,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<FastbillApiResponse<{ CUSTOMERS: FastbillCustomer[] }>>> {
    return this.call<{ CUSTOMERS: FastbillCustomer[] }>(
      "customer.get",
      filter,
      undefined,
      limit,
      offset
    );
  }

  /** Get a single customer by ID. */
  async getCustomer(
    customerId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ CUSTOMERS: FastbillCustomer[] }>>> {
    return this.call<{ CUSTOMERS: FastbillCustomer[] }>("customer.get", {
      CUSTOMER_ID: customerId,
    });
  }

  /** Create a new customer. */
  async createCustomer(
    customer: FastbillCustomer
  ): Promise<ApiResponse<FastbillApiResponse<{ CUSTOMER_ID: number; STATUS: string }>>> {
    return this.call<{ CUSTOMER_ID: number; STATUS: string }>(
      "customer.create",
      undefined,
      customer as unknown as Record<string, unknown>
    );
  }

  /** Update an existing customer. */
  async updateCustomer(
    customerId: number,
    customer: Partial<FastbillCustomer>
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    return this.call<{ STATUS: string }>(
      "customer.update",
      undefined,
      { CUSTOMER_ID: customerId, ...customer } as unknown as Record<string, unknown>
    );
  }

  /** Delete a customer. */
  async deleteCustomer(
    customerId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    return this.call<{ STATUS: string }>("customer.delete", undefined, {
      CUSTOMER_ID: customerId,
    });
  }

  // ==================== Invoices ====================

  /** List invoices with optional filters. */
  async listInvoices(
    filter?: FastbillFilter,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<FastbillApiResponse<{ INVOICES: FastbillInvoice[] }>>> {
    return this.call<{ INVOICES: FastbillInvoice[] }>(
      "invoice.get",
      filter,
      undefined,
      limit,
      offset
    );
  }

  /** Get a single invoice by ID. */
  async getInvoice(
    invoiceId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ INVOICES: FastbillInvoice[] }>>> {
    return this.call<{ INVOICES: FastbillInvoice[] }>("invoice.get", {
      INVOICE_ID: invoiceId,
    });
  }

  /** Create a new invoice. */
  async createInvoice(
    invoice: FastbillInvoice
  ): Promise<ApiResponse<FastbillApiResponse<{ INVOICE_ID: number; STATUS: string }>>> {
    return this.call<{ INVOICE_ID: number; STATUS: string }>(
      "invoice.create",
      undefined,
      invoice as unknown as Record<string, unknown>
    );
  }

  /** Update an existing invoice. */
  async updateInvoice(
    invoiceId: number,
    invoice: Partial<FastbillInvoice>
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    return this.call<{ STATUS: string }>(
      "invoice.update",
      undefined,
      { INVOICE_ID: invoiceId, ...invoice } as unknown as Record<string, unknown>
    );
  }

  /** Delete a draft invoice. */
  async deleteInvoice(
    invoiceId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    return this.call<{ STATUS: string }>("invoice.delete", undefined, {
      INVOICE_ID: invoiceId,
    });
  }

  /** Finalize (complete) an invoice. Transitions from draft to sent. */
  async completeInvoice(
    invoiceId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ INVOICE_NUMBER: string; STATUS: string }>>> {
    return this.call<{ INVOICE_NUMBER: string; STATUS: string }>(
      "invoice.complete",
      undefined,
      { INVOICE_ID: invoiceId }
    );
  }

  /** Cancel an invoice. */
  async cancelInvoice(
    invoiceId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    return this.call<{ STATUS: string }>("invoice.cancel", undefined, {
      INVOICE_ID: invoiceId,
    });
  }

  /** Send an invoice via email. */
  async sendInvoice(
    invoiceId: number,
    recipient: { to: string; subject?: string; message?: string; cc?: string; bcc?: string }
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    return this.call<{ STATUS: string }>("invoice.sendbyemail", undefined, {
      INVOICE_ID: invoiceId,
      RECIPIENT: recipient,
    });
  }

  /** Set an invoice as paid. */
  async setInvoicePaid(
    invoiceId: number,
    paidDate?: string
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    const data: Record<string, unknown> = { INVOICE_ID: invoiceId };
    if (paidDate) data.PAID_DATE = paidDate;
    return this.call<{ STATUS: string }>("invoice.setpaid", undefined, data);
  }

  // ==================== Articles (Items / Products) ====================

  /** List articles with optional filters. */
  async listArticles(
    filter?: FastbillFilter,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<FastbillApiResponse<{ ARTICLES: FastbillArticle[] }>>> {
    return this.call<{ ARTICLES: FastbillArticle[] }>(
      "article.get",
      filter,
      undefined,
      limit,
      offset
    );
  }

  /** Get a single article by ID. */
  async getArticle(
    articleId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ ARTICLES: FastbillArticle[] }>>> {
    return this.call<{ ARTICLES: FastbillArticle[] }>("article.get", {
      ARTICLE_ID: articleId,
    });
  }

  /** Create a new article. */
  async createArticle(
    article: FastbillArticle
  ): Promise<ApiResponse<FastbillApiResponse<{ ARTICLE_ID: number; STATUS: string }>>> {
    return this.call<{ ARTICLE_ID: number; STATUS: string }>(
      "article.create",
      undefined,
      article as unknown as Record<string, unknown>
    );
  }

  /** Update an existing article. */
  async updateArticle(
    articleId: number,
    article: Partial<FastbillArticle>
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    return this.call<{ STATUS: string }>(
      "article.update",
      undefined,
      { ARTICLE_ID: articleId, ...article } as unknown as Record<string, unknown>
    );
  }

  /** Delete an article. */
  async deleteArticle(
    articleId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    return this.call<{ STATUS: string }>("article.delete", undefined, {
      ARTICLE_ID: articleId,
    });
  }

  // ==================== Expenses ====================

  /** List expenses with optional filters. */
  async listExpenses(
    filter?: FastbillFilter,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<FastbillApiResponse<{ EXPENSES: FastbillExpense[] }>>> {
    return this.call<{ EXPENSES: FastbillExpense[] }>(
      "expense.get",
      filter,
      undefined,
      limit,
      offset
    );
  }

  /** Get a single expense by ID. */
  async getExpense(
    expenseId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ EXPENSES: FastbillExpense[] }>>> {
    return this.call<{ EXPENSES: FastbillExpense[] }>("expense.get", {
      EXPENSE_ID: expenseId,
    });
  }

  /** Create a new expense. */
  async createExpense(
    expense: FastbillExpense
  ): Promise<ApiResponse<FastbillApiResponse<{ EXPENSE_ID: number; STATUS: string }>>> {
    return this.call<{ EXPENSE_ID: number; STATUS: string }>(
      "expense.create",
      undefined,
      expense as unknown as Record<string, unknown>
    );
  }

  /** Update an existing expense. */
  async updateExpense(
    expenseId: number,
    expense: Partial<FastbillExpense>
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    return this.call<{ STATUS: string }>(
      "expense.update",
      undefined,
      { EXPENSE_ID: expenseId, ...expense } as unknown as Record<string, unknown>
    );
  }

  /** Delete an expense. */
  async deleteExpense(
    expenseId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    return this.call<{ STATUS: string }>("expense.delete", undefined, {
      EXPENSE_ID: expenseId,
    });
  }

  // ==================== Revenues ====================

  /** List revenues with optional filters. */
  async listRevenues(
    filter?: FastbillFilter,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<FastbillApiResponse<{ REVENUES: FastbillRevenue[] }>>> {
    return this.call<{ REVENUES: FastbillRevenue[] }>(
      "revenue.get",
      filter,
      undefined,
      limit,
      offset
    );
  }

  /** Get a single revenue by ID. */
  async getRevenue(
    revenueId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ REVENUES: FastbillRevenue[] }>>> {
    return this.call<{ REVENUES: FastbillRevenue[] }>("revenue.get", {
      REVENUE_ID: revenueId,
    });
  }

  /** Create a new revenue. */
  async createRevenue(
    revenue: FastbillRevenue
  ): Promise<ApiResponse<FastbillApiResponse<{ REVENUE_ID: number; STATUS: string }>>> {
    return this.call<{ REVENUE_ID: number; STATUS: string }>(
      "revenue.create",
      undefined,
      revenue as unknown as Record<string, unknown>
    );
  }

  /** Delete a revenue. */
  async deleteRevenue(
    revenueId: number
  ): Promise<ApiResponse<FastbillApiResponse<{ STATUS: string }>>> {
    return this.call<{ STATUS: string }>("revenue.delete", undefined, {
      REVENUE_ID: revenueId,
    });
  }
}
