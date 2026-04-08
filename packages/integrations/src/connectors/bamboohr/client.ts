import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  BambooHRClientConfig,
  BambooHREmployee,
  BambooHREmployeeDirectory,
  BambooHRCreateEmployeeData,
  BambooHRTimeOffRequest,
  BambooHRCreateTimeOffData,
  BambooHRTimeOffType,
  BambooHRTimeOffBalance,
  BambooHRReport,
  BambooHRCustomReportRequest,
  BambooHRTableRow,
  BambooHRFileCategory,
  BambooHRUploadFileData,
  BambooHRWebhookRegistration,
  BambooHRCreateWebhookData,
} from "./types.js";

/**
 * BambooHR API client.
 *
 * Uses API key authentication via HTTP Basic Auth
 * (API key as username, "x" as password).
 *
 * Covers: Employees, Time Off, Reports, Tables, Files, Webhooks.
 */
export class BambooHRClient extends BaseIntegrationClient {
  private subdomain: string;

  constructor(config: BambooHRClientConfig) {
    super({
      baseUrl: `https://api.bamboohr.com/api/gateway.php/${config.subdomain}/v1`,
      authType: "basic_auth",
      credentials: {
        username: config.apiKey,
        password: "x",
      },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
      defaultHeaders: {
        Accept: "application/json",
      },
    });

    this.subdomain = config.subdomain;
  }

  // ==================== Employees ====================

  /** Get the employee directory (all employees with standard fields). */
  async getDirectory(): Promise<ApiResponse<BambooHREmployeeDirectory>> {
    return this.get<BambooHREmployeeDirectory>("/employees/directory");
  }

  /**
   * Get a single employee by ID.
   * @param fields - Comma-separated field IDs or "all" for every field.
   */
  async getEmployee(
    employeeId: string,
    fields: string = "all",
  ): Promise<ApiResponse<BambooHREmployee>> {
    return this.get<BambooHREmployee>(`/employees/${employeeId}`, {
      fields,
    });
  }

  /** Create a new employee. Returns the new employee record. */
  async createEmployee(
    data: BambooHRCreateEmployeeData,
  ): Promise<ApiResponse<BambooHREmployee>> {
    return this.post<BambooHREmployee>("/employees/", data);
  }

  /** Update an existing employee's fields. */
  async updateEmployee(
    employeeId: string,
    data: Partial<BambooHRCreateEmployeeData>,
  ): Promise<ApiResponse<void>> {
    return this.post<void>(`/employees/${employeeId}`, data);
  }

  // ==================== Time Off ====================

  /**
   * List time-off requests.
   * @param startDate - YYYY-MM-DD
   * @param endDate - YYYY-MM-DD
   */
  async listTimeOffRequests(
    startDate: string,
    endDate: string,
    employeeId?: string,
    status?: string,
  ): Promise<ApiResponse<BambooHRTimeOffRequest[]>> {
    const params: Record<string, string> = {
      start: startDate,
      end: endDate,
    };
    if (employeeId) params["employeeId"] = employeeId;
    if (status) params["status"] = status;

    return this.get<BambooHRTimeOffRequest[]>("/time_off/requests/", params);
  }

  /** Create a time-off request. */
  async createTimeOffRequest(
    data: BambooHRCreateTimeOffData,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.put<{ id: string }>(
      `/employees/${data.employeeId}/time_off/request/`,
      data,
    );
  }

  /** Update the status of a time-off request (approve/deny/cancel). */
  async updateTimeOffRequestStatus(
    requestId: string,
    status: "approved" | "denied" | "canceled",
    note?: string,
  ): Promise<ApiResponse<void>> {
    return this.put<void>(`/time_off/requests/${requestId}/status/`, {
      status,
      note: note ?? "",
    });
  }

  /** List available time-off types. */
  async listTimeOffTypes(): Promise<ApiResponse<BambooHRTimeOffType[]>> {
    return this.get<BambooHRTimeOffType[]>("/meta/time_off/types/");
  }

  /**
   * Get time-off balances for an employee.
   * Returns balances for all time-off types as of the given date.
   */
  async getTimeOffBalances(
    employeeId: string,
    asOfDate?: string,
  ): Promise<ApiResponse<BambooHRTimeOffBalance[]>> {
    const params: Record<string, string> = {};
    if (asOfDate) params["end"] = asOfDate;

    return this.get<BambooHRTimeOffBalance[]>(
      `/employees/${employeeId}/time_off/calculator/`,
      params,
    );
  }

  // ==================== Reports ====================

  /**
   * Run a custom report.
   * Fields can be standard field IDs or aliases.
   */
  async runCustomReport(
    reportRequest: BambooHRCustomReportRequest,
  ): Promise<ApiResponse<BambooHRReport>> {
    return this.post<BambooHRReport>("/reports/custom", {
      title: reportRequest.title ?? "Custom Report",
      fields: reportRequest.fields,
      filters: reportRequest.filters ?? {},
    });
  }

  /**
   * Run a saved (company) report by ID.
   */
  async runSavedReport(
    reportId: string,
    format: "JSON" | "CSV" = "JSON",
  ): Promise<ApiResponse<BambooHRReport>> {
    return this.get<BambooHRReport>(`/reports/${reportId}`, {
      format,
      fd: "yes",
    });
  }

  // ==================== Tables ====================

  /**
   * Get rows from a BambooHR table for an employee.
   * Common table names: "jobInfo", "employmentStatus", "compensation",
   * "dependents", "contacts", "education".
   */
  async getTableRows(
    employeeId: string,
    tableName: string,
  ): Promise<ApiResponse<BambooHRTableRow[]>> {
    return this.get<BambooHRTableRow[]>(
      `/employees/${employeeId}/tables/${tableName}`,
    );
  }

  /** Add a row to a table for an employee. */
  async addTableRow(
    employeeId: string,
    tableName: string,
    data: Record<string, unknown>,
  ): Promise<ApiResponse<BambooHRTableRow>> {
    return this.post<BambooHRTableRow>(
      `/employees/${employeeId}/tables/${tableName}`,
      data,
    );
  }

  /** Update a table row. */
  async updateTableRow(
    employeeId: string,
    tableName: string,
    rowId: string,
    data: Record<string, unknown>,
  ): Promise<ApiResponse<void>> {
    return this.post<void>(
      `/employees/${employeeId}/tables/${tableName}/${rowId}`,
      data,
    );
  }

  // ==================== Files ====================

  /**
   * List all file categories and files for an employee.
   */
  async listFiles(
    employeeId: string,
  ): Promise<ApiResponse<{ categories: BambooHRFileCategory[] }>> {
    return this.get<{ categories: BambooHRFileCategory[] }>(
      `/employees/${employeeId}/files/view/`,
    );
  }

  /**
   * Upload a file to an employee's profile.
   */
  async uploadFile(
    data: BambooHRUploadFileData,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.post<{ id: string }>(
      `/employees/${data.employeeId}/files/`,
      {
        category: data.categoryId,
        fileName: data.fileName,
        file: data.content,
        share: data.shareWithEmployee ? "yes" : "no",
      },
    );
  }

  /** Delete an employee file. */
  async deleteFile(
    employeeId: string,
    fileId: string,
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(
      `/employees/${employeeId}/files/${fileId}/`,
    );
  }

  // ==================== Webhooks ====================

  /** List all registered webhooks. */
  async listWebhooks(): Promise<ApiResponse<BambooHRWebhookRegistration[]>> {
    return this.get<BambooHRWebhookRegistration[]>("/webhooks/");
  }

  /** Get a single webhook by ID. */
  async getWebhook(
    webhookId: string,
  ): Promise<ApiResponse<BambooHRWebhookRegistration>> {
    return this.get<BambooHRWebhookRegistration>(`/webhooks/${webhookId}`);
  }

  /** Register a new webhook. */
  async createWebhook(
    data: BambooHRCreateWebhookData,
  ): Promise<ApiResponse<BambooHRWebhookRegistration>> {
    return this.post<BambooHRWebhookRegistration>("/webhooks/", {
      name: data.name,
      monitorFields: data.monitorFields,
      postFields: data.postFields ?? {},
      url: data.url,
      format: data.format ?? "json",
      includeCompanyDomain: data.includeCompanyDomain ?? true,
    });
  }

  /** Update an existing webhook. */
  async updateWebhook(
    webhookId: string,
    data: Partial<BambooHRCreateWebhookData>,
  ): Promise<ApiResponse<void>> {
    return this.put<void>(`/webhooks/${webhookId}`, data);
  }

  /** Delete a webhook. */
  async deleteWebhook(webhookId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/webhooks/${webhookId}`);
  }

  // ==================== Connection Test ====================

  /** Test the connection by fetching the employee directory. */
  async testConnection(): Promise<boolean> {
    try {
      await this.getDirectory();
      return true;
    } catch {
      return false;
    }
  }
}
