import { BaseIntegrationClient, IntegrationError } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  PersonioClientConfig,
  PersonioEmployee,
  PersonioCreateEmployeeData,
  PersonioAttendance,
  PersonioCreateAttendanceData,
  PersonioAbsence,
  PersonioCreateAbsenceData,
  PersonioAbsenceType,
  PersonioDocument,
  PersonioDocumentCategory,
  PersonioUploadDocumentData,
  PersonioProject,
  PersonioCreateProjectData,
  PersonioListResponse,
  PersonioSingleResponse,
  PersonioPaginationParams,
  PersonioTokenResponse,
} from "./types.js";

const PERSONIO_BASE_URL = "https://api.personio.de/v1";
const PERSONIO_AUTH_URL = "https://api.personio.de/v1/auth";

/**
 * Personio API client.
 *
 * Uses OAuth2 client credentials flow. The client automatically acquires
 * and refreshes the access token before making API calls.
 *
 * Covers: Employees, Attendances, Absences, Documents, Projects.
 */
export class PersonioClient extends BaseIntegrationClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: PersonioClientConfig) {
    super({
      baseUrl: PERSONIO_BASE_URL,
      authType: "oauth2",
      credentials: { accessToken: "" },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 200 },
    });

    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  // ==================== Token Management ====================

  /**
   * Acquire a fresh access token using client credentials.
   * Personio tokens are valid for 24 hours.
   */
  private async authenticate(): Promise<void> {
    const response = await fetch(`${PERSONIO_AUTH_URL}?client_id=${encodeURIComponent(this.clientId)}&client_secret=${encodeURIComponent(this.clientSecret)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new IntegrationError(
        "AUTH_ERROR",
        `Personio authentication failed: ${response.status}`,
        response.status,
      );
    }

    const body = (await response.json()) as PersonioTokenResponse;
    if (!body.success || !body.data?.token) {
      throw new IntegrationError("AUTH_ERROR", "Personio authentication returned no token");
    }

    this.accessToken = body.data.token;
    // Personio tokens last 24 h; refresh 30 min early
    this.tokenExpiresAt = Date.now() + 23.5 * 60 * 60 * 1000;
    this.credentials.accessToken = this.accessToken;
  }

  /** Ensure we have a valid token before every request. */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.authenticate();
    }
  }

  /** Override request to inject auto-authentication. */
  override async request<T = unknown>(
    config: import("../../core/types.js").RequestConfig,
  ): Promise<ApiResponse<T>> {
    await this.ensureAuthenticated();
    return super.request<T>(config);
  }

  // ==================== Employees ====================

  /** List employees with optional pagination and field filtering. */
  async listEmployees(
    pagination?: PersonioPaginationParams,
    emails?: string[],
  ): Promise<ApiResponse<PersonioListResponse<PersonioEmployee>>> {
    const params: Record<string, string> = {};
    if (pagination?.limit != null) params["limit"] = String(pagination.limit);
    if (pagination?.offset != null) params["offset"] = String(pagination.offset);
    if (emails?.length) params["email"] = emails.join(",");

    return this.get<PersonioListResponse<PersonioEmployee>>("/company/employees", params);
  }

  /** Get a single employee by ID. */
  async getEmployee(employeeId: number): Promise<ApiResponse<PersonioSingleResponse<PersonioEmployee>>> {
    return this.get<PersonioSingleResponse<PersonioEmployee>>(`/company/employees/${employeeId}`);
  }

  /** Create a new employee. */
  async createEmployee(
    data: PersonioCreateEmployeeData,
  ): Promise<ApiResponse<PersonioSingleResponse<PersonioEmployee>>> {
    return this.post<PersonioSingleResponse<PersonioEmployee>>("/company/employees", data);
  }

  /** Update an existing employee's attributes. */
  async updateEmployee(
    employeeId: number,
    data: Partial<PersonioCreateEmployeeData["employee"]>,
  ): Promise<ApiResponse<PersonioSingleResponse<PersonioEmployee>>> {
    return this.patch<PersonioSingleResponse<PersonioEmployee>>(
      `/company/employees/${employeeId}`,
      { employee: data },
    );
  }

  // ==================== Attendances ====================

  /** List attendances for employees in a date range. */
  async listAttendances(
    startDate: string,
    endDate: string,
    employeeIds?: number[],
    pagination?: PersonioPaginationParams,
  ): Promise<ApiResponse<PersonioListResponse<PersonioAttendance>>> {
    const params: Record<string, string> = {
      start_date: startDate,
      end_date: endDate,
    };
    if (employeeIds?.length) params["employees[]"] = employeeIds.join(",");
    if (pagination?.limit != null) params["limit"] = String(pagination.limit);
    if (pagination?.offset != null) params["offset"] = String(pagination.offset);

    return this.get<PersonioListResponse<PersonioAttendance>>("/company/attendances", params);
  }

  /** Create one or more attendance records. */
  async createAttendances(
    records: PersonioCreateAttendanceData[],
  ): Promise<ApiResponse<PersonioSingleResponse<{ id: number }[]>>> {
    return this.post<PersonioSingleResponse<{ id: number }[]>>(
      "/company/attendances",
      { attendances: records },
    );
  }

  /** Delete an attendance record. */
  async deleteAttendance(attendanceId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/company/attendances/${attendanceId}`);
  }

  // ==================== Absences ====================

  /** List absences with optional filters. */
  async listAbsences(
    startDate?: string,
    endDate?: string,
    employeeIds?: number[],
    pagination?: PersonioPaginationParams,
  ): Promise<ApiResponse<PersonioListResponse<PersonioAbsence>>> {
    const params: Record<string, string> = {};
    if (startDate) params["start_date"] = startDate;
    if (endDate) params["end_date"] = endDate;
    if (employeeIds?.length) params["employees[]"] = employeeIds.join(",");
    if (pagination?.limit != null) params["limit"] = String(pagination.limit);
    if (pagination?.offset != null) params["offset"] = String(pagination.offset);

    return this.get<PersonioListResponse<PersonioAbsence>>("/company/time-offs", params);
  }

  /** Get a single absence by ID. */
  async getAbsence(absenceId: number): Promise<ApiResponse<PersonioSingleResponse<PersonioAbsence>>> {
    return this.get<PersonioSingleResponse<PersonioAbsence>>(`/company/time-offs/${absenceId}`);
  }

  /** Create a new absence request. */
  async createAbsence(
    data: PersonioCreateAbsenceData,
  ): Promise<ApiResponse<PersonioSingleResponse<PersonioAbsence>>> {
    return this.post<PersonioSingleResponse<PersonioAbsence>>("/company/time-offs", data);
  }

  /** Delete an absence. */
  async deleteAbsence(absenceId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/company/time-offs/${absenceId}`);
  }

  /** List available absence / time-off types. */
  async listAbsenceTypes(): Promise<ApiResponse<PersonioListResponse<PersonioAbsenceType>>> {
    return this.get<PersonioListResponse<PersonioAbsenceType>>("/company/time-off-types");
  }

  // ==================== Documents ====================

  /** List documents for an employee. */
  async listDocuments(
    employeeId: number,
    categoryId?: number,
  ): Promise<ApiResponse<PersonioListResponse<PersonioDocument>>> {
    const params: Record<string, string> = {};
    if (categoryId != null) params["category_id"] = String(categoryId);

    return this.get<PersonioListResponse<PersonioDocument>>(
      `/company/employees/${employeeId}/documents`,
      params,
    );
  }

  /** Upload a document to an employee's profile. */
  async uploadDocument(
    data: PersonioUploadDocumentData,
  ): Promise<ApiResponse<PersonioSingleResponse<PersonioDocument>>> {
    return this.post<PersonioSingleResponse<PersonioDocument>>(
      `/company/employees/${data.employee_id}/documents`,
      {
        category_id: data.category_id,
        title: data.title,
        file: data.file,
        filename: data.filename,
        comment: data.comment,
      },
    );
  }

  /** List document categories. */
  async listDocumentCategories(): Promise<ApiResponse<PersonioListResponse<PersonioDocumentCategory>>> {
    return this.get<PersonioListResponse<PersonioDocumentCategory>>("/company/document-categories");
  }

  // ==================== Projects ====================

  /** List all projects. */
  async listProjects(
    pagination?: PersonioPaginationParams,
  ): Promise<ApiResponse<PersonioListResponse<PersonioProject>>> {
    const params: Record<string, string> = {};
    if (pagination?.limit != null) params["limit"] = String(pagination.limit);
    if (pagination?.offset != null) params["offset"] = String(pagination.offset);

    return this.get<PersonioListResponse<PersonioProject>>("/company/attendances/projects", params);
  }

  /** Create a new project. */
  async createProject(
    data: PersonioCreateProjectData,
  ): Promise<ApiResponse<PersonioSingleResponse<PersonioProject>>> {
    return this.post<PersonioSingleResponse<PersonioProject>>("/company/attendances/projects", data);
  }

  /** Update a project. */
  async updateProject(
    projectId: number,
    data: Partial<PersonioCreateProjectData>,
  ): Promise<ApiResponse<PersonioSingleResponse<PersonioProject>>> {
    return this.patch<PersonioSingleResponse<PersonioProject>>(
      `/company/attendances/projects/${projectId}`,
      data,
    );
  }

  /** Delete a project. */
  async deleteProject(projectId: number): Promise<ApiResponse<void>> {
    return this.delete<void>(`/company/attendances/projects/${projectId}`);
  }

  // ==================== Connection Test ====================

  /** Test the connection by attempting authentication and fetching employees. */
  async testConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      await this.listEmployees({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
