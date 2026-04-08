import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  PapierkramInvoice,
  PapierkramExpense,
  PapierkramProject,
  PapierkramBankTransaction,
  PapierkramBankConnection,
  PapierkramListParams,
  PapierkramListResponse,
  PapierkramClientConfig,
} from "./types.js";

/**
 * Papierkram API client.
 *
 * German cloud accounting for freelancers and small businesses with
 * invoices, expenses, projects, and banking.
 *
 * Uses API key authentication via Bearer token.
 */
export class PapierkramClient extends BaseIntegrationClient {
  constructor(config: PapierkramClientConfig) {
    super({
      baseUrl: `https://${config.subdomain}.papierkram.de/api/v1`,
      authType: "api_key",
      credentials: { apiKey: config.apiKey },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });
  }

  private buildListParams(params?: PapierkramListParams): Record<string, string> {
    const result: Record<string, string> = {};
    if (params?.page != null) result.page = String(params.page);
    if (params?.per_page != null) result.per_page = String(params.per_page);
    if (params?.order_by) result.order_by = params.order_by;
    if (params?.order_direction) result.order_direction = params.order_direction;
    return result;
  }

  // ==================== Invoices ====================

  /** List income invoices. */
  async listInvoices(
    params?: PapierkramListParams
  ): Promise<ApiResponse<PapierkramListResponse<PapierkramInvoice>>> {
    return this.get<PapierkramListResponse<PapierkramInvoice>>(
      "/income/invoices",
      this.buildListParams(params)
    );
  }

  /** Get an invoice by ID. */
  async getInvoice(invoiceId: number): Promise<ApiResponse<PapierkramInvoice>> {
    return this.get<PapierkramInvoice>(`/income/invoices/${invoiceId}`);
  }

  /** Create an invoice. */
  async createInvoice(
    invoice: PapierkramInvoice
  ): Promise<ApiResponse<PapierkramInvoice>> {
    return this.post<PapierkramInvoice>("/income/invoices", invoice);
  }

  /** Update an invoice. */
  async updateInvoice(
    invoiceId: number,
    invoice: Partial<PapierkramInvoice>
  ): Promise<ApiResponse<PapierkramInvoice>> {
    return this.put<PapierkramInvoice>(`/income/invoices/${invoiceId}`, invoice);
  }

  /** Delete an invoice. */
  async deleteInvoice(invoiceId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/income/invoices/${invoiceId}`);
  }

  /** Send an invoice by email. */
  async sendInvoice(
    invoiceId: number,
    email: string
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/income/invoices/${invoiceId}/deliver`, { email });
  }

  /** Cancel an invoice. */
  async cancelInvoice(invoiceId: number): Promise<ApiResponse<PapierkramInvoice>> {
    return this.post<PapierkramInvoice>(`/income/invoices/${invoiceId}/cancel`);
  }

  // ==================== Expenses ====================

  /** List expenses. */
  async listExpenses(
    params?: PapierkramListParams
  ): Promise<ApiResponse<PapierkramListResponse<PapierkramExpense>>> {
    return this.get<PapierkramListResponse<PapierkramExpense>>(
      "/expense/vouchers",
      this.buildListParams(params)
    );
  }

  /** Get an expense by ID. */
  async getExpense(expenseId: number): Promise<ApiResponse<PapierkramExpense>> {
    return this.get<PapierkramExpense>(`/expense/vouchers/${expenseId}`);
  }

  /** Create an expense. */
  async createExpense(
    expense: PapierkramExpense
  ): Promise<ApiResponse<PapierkramExpense>> {
    return this.post<PapierkramExpense>("/expense/vouchers", expense);
  }

  /** Update an expense. */
  async updateExpense(
    expenseId: number,
    expense: Partial<PapierkramExpense>
  ): Promise<ApiResponse<PapierkramExpense>> {
    return this.put<PapierkramExpense>(`/expense/vouchers/${expenseId}`, expense);
  }

  /** Delete an expense. */
  async deleteExpense(expenseId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/expense/vouchers/${expenseId}`);
  }

  // ==================== Projects ====================

  /** List projects. */
  async listProjects(
    params?: PapierkramListParams
  ): Promise<ApiResponse<PapierkramListResponse<PapierkramProject>>> {
    return this.get<PapierkramListResponse<PapierkramProject>>(
      "/projects",
      this.buildListParams(params)
    );
  }

  /** Get a project by ID. */
  async getProject(projectId: number): Promise<ApiResponse<PapierkramProject>> {
    return this.get<PapierkramProject>(`/projects/${projectId}`);
  }

  /** Create a project. */
  async createProject(
    project: PapierkramProject
  ): Promise<ApiResponse<PapierkramProject>> {
    return this.post<PapierkramProject>("/projects", project);
  }

  /** Update a project. */
  async updateProject(
    projectId: number,
    project: Partial<PapierkramProject>
  ): Promise<ApiResponse<PapierkramProject>> {
    return this.put<PapierkramProject>(`/projects/${projectId}`, project);
  }

  /** Delete a project. */
  async deleteProject(projectId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/projects/${projectId}`);
  }

  /** Archive a project. */
  async archiveProject(projectId: number): Promise<ApiResponse<PapierkramProject>> {
    return this.post<PapierkramProject>(`/projects/${projectId}/archive`);
  }

  // ==================== Banking ====================

  /** List bank connections. */
  async listBankConnections(): Promise<ApiResponse<PapierkramBankConnection[]>> {
    return this.get<PapierkramBankConnection[]>("/banking/bank_connections");
  }

  /** Get a bank connection by ID. */
  async getBankConnection(
    connectionId: number
  ): Promise<ApiResponse<PapierkramBankConnection>> {
    return this.get<PapierkramBankConnection>(`/banking/bank_connections/${connectionId}`);
  }

  /** List bank transactions. */
  async listBankTransactions(
    params?: PapierkramListParams
  ): Promise<ApiResponse<PapierkramListResponse<PapierkramBankTransaction>>> {
    return this.get<PapierkramListResponse<PapierkramBankTransaction>>(
      "/banking/transactions",
      this.buildListParams(params)
    );
  }

  /** Get a bank transaction by ID. */
  async getBankTransaction(
    transactionId: number
  ): Promise<ApiResponse<PapierkramBankTransaction>> {
    return this.get<PapierkramBankTransaction>(`/banking/transactions/${transactionId}`);
  }
}
