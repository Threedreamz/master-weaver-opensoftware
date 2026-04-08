import { BaseIntegrationClient } from "../../core/base-client.js";
import type {
  ExpensifyClientConfig,
  ExpensifyReport,
  ExpensifyExpense,
  ExpensifyPolicy,
  ExpensifyCreateExpenseParams,
  ExpensifyExportParams,
  ExpensifyExportResponse,
  ExpensifyApiResponse,
} from "./types.js";

export interface ExpensifyClientOptions {
  partnerUserId: string;
  partnerUserSecret: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Expensify API client for expense reports, receipts, policies, and reimbursements.
 *
 * Uses partner credentials (partnerUserID + partnerUserSecret) authentication.
 * All API calls go through a single endpoint with command-style requests.
 */
export class ExpensifyClient extends BaseIntegrationClient {
  private readonly partnerUserId: string;
  private readonly partnerUserSecret: string;

  constructor(config: ExpensifyClientOptions) {
    super({
      baseUrl: config.baseUrl ?? "https://integrations.expensify.com/Integration-Server",
      authType: "custom",
      credentials: {
        partnerUserId: config.partnerUserId,
        partnerUserSecret: config.partnerUserSecret,
      },
      timeout: config.timeout ?? 60_000,
      retry: config.retries
        ? { maxRetries: config.retries, baseDelayMs: 1000, maxDelayMs: 10_000 }
        : undefined,
      rateLimit: { requestsPerMinute: 30 },
    });
    this.partnerUserId = config.partnerUserId;
    this.partnerUserSecret = config.partnerUserSecret;
  }

  /** Execute an Expensify Integration Server command. */
  private async executeCommand<T = unknown>(
    commandType: string,
    inputSettings: Record<string, unknown>,
  ): Promise<ExpensifyApiResponse<T>> {
    const requestBody = {
      type: commandType,
      credentials: {
        partnerUserID: this.partnerUserId,
        partnerUserSecret: this.partnerUserSecret,
      },
      inputSettings,
    };

    const { data } = await this.post<ExpensifyApiResponse<T>>(
      "/ExpensifyIntegrations",
      requestBody,
    );
    return data;
  }

  // ── Reports ────────────────────────────────────────────────────────────

  /** Get expense reports with optional filters. */
  async getReports(params?: {
    policyID?: string;
    startDate?: string;
    endDate?: string;
    reportState?: string;
    limit?: number;
    offset?: number;
  }): Promise<ExpensifyReport[]> {
    const result = await this.executeCommand<ExpensifyReport[]>("get", {
      type: "reports",
      ...params,
    });
    return result.data ?? [];
  }

  /** Get a specific report by ID. */
  async getReport(reportId: string): Promise<ExpensifyReport | null> {
    const reports = await this.getReports();
    return reports.find((r) => r.reportID === reportId) ?? null;
  }

  // ── Expenses ───────────────────────────────────────────────────────────

  /** Create an expense. */
  async createExpense(
    params: ExpensifyCreateExpenseParams,
  ): Promise<ExpensifyExpense> {
    const result = await this.executeCommand<ExpensifyExpense>("create", {
      type: "expense",
      ...params,
    });
    return result.data!;
  }

  // ── Policies ───────────────────────────────────────────────────────────

  /** List all policies accessible to this integration. */
  async listPolicies(): Promise<ExpensifyPolicy[]> {
    const result = await this.executeCommand<ExpensifyPolicy[]>("get", {
      type: "policyList",
    });
    return result.data ?? [];
  }

  // ── Exports ────────────────────────────────────────────────────────────

  /** Export reports for a given policy and date range. */
  async exportReports(
    params: ExpensifyExportParams,
  ): Promise<ExpensifyExportResponse> {
    const result = await this.executeCommand<ExpensifyExportResponse>(
      "file",
      {
        type: "reportExport",
        ...params,
      },
    );
    return result.data!;
  }

  // ── Connection Test ────────────────────────────────────────────────────

  /** Test the connection by listing policies. */
  async testConnection(): Promise<boolean> {
    try {
      const policies = await this.listPolicies();
      return Array.isArray(policies);
    } catch {
      return false;
    }
  }
}
