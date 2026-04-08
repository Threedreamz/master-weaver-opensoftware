import { createHmac } from "node:crypto";
import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse, RequestConfig } from "../../core/types.js";
import type {
  HRworksClientConfig,
  HRworksPerson,
  HRworksCreatePersonData,
  HRworksAbsence,
  HRworksAbsenceType,
  HRworksCreateAbsenceData,
  HRworksAbsenceBalance,
  HRworksWorkingTime,
  HRworksCreateWorkingTimeData,
  HRworksWorkingTimeModel,
  HRworksOrganizationUnit,
  HRworksCostCenter,
  HRworksHolidayCalendar,
  HRworksProject,
  HRworksListResponse,
  HRworksPaginationParams,
} from "./types.js";

const HRWORKS_BASE_URL = "https://api.hrworks.de/v2";

/**
 * HRworks API client.
 *
 * Uses HMAC-SHA256 signed requests for authentication. Each request
 * is signed with the secret key using the access key, timestamp, and
 * request path as the signature payload.
 *
 * Covers: Persons, Absences, Working Times, Master Data.
 */
export class HRworksClient extends BaseIntegrationClient {
  private accessKey: string;
  private secretKey: string;

  constructor(config: HRworksClientConfig) {
    super({
      baseUrl: HRWORKS_BASE_URL,
      authType: "custom",
      credentials: {},
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 60 },
    });

    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
  }

  // ==================== HMAC Auth ====================

  /**
   * Generate HMAC-SHA256 authentication headers.
   *
   * The signature is computed over: `{accessKey}\n{timestamp}\n{method}\n{path}`
   */
  private getHmacHeaders(method: string, path: string): Record<string, string> {
    const timestamp = new Date().toISOString();
    const signaturePayload = `${this.accessKey}\n${timestamp}\n${method.toUpperCase()}\n${path}`;
    const signature = createHmac("sha256", this.secretKey)
      .update(signaturePayload)
      .digest("hex");

    return {
      "X-HRworks-AccessKey": this.accessKey,
      "X-HRworks-Timestamp": timestamp,
      "X-HRworks-Signature": signature,
    };
  }

  /** Override request to inject HMAC authentication headers. */
  override async request<T = unknown>(config: RequestConfig): Promise<ApiResponse<T>> {
    const hmacHeaders = this.getHmacHeaders(config.method, config.path);
    return super.request<T>({
      ...config,
      headers: {
        ...hmacHeaders,
        ...config.headers,
      },
    });
  }

  // ==================== Persons ====================

  /** List all persons (employees). */
  async listPersons(
    pagination?: HRworksPaginationParams,
    status?: "active" | "inactive",
  ): Promise<ApiResponse<HRworksListResponse<HRworksPerson>>> {
    const params: Record<string, string> = {};
    if (pagination?.page != null) params["page"] = String(pagination.page);
    if (pagination?.pageSize != null) params["pageSize"] = String(pagination.pageSize);
    if (status) params["status"] = status;

    return this.get<HRworksListResponse<HRworksPerson>>("/persons", params);
  }

  /** Get a single person by personnel number. */
  async getPerson(personnelNumber: string): Promise<ApiResponse<HRworksPerson>> {
    return this.get<HRworksPerson>(`/persons/${personnelNumber}`);
  }

  /** Create a new person. */
  async createPerson(data: HRworksCreatePersonData): Promise<ApiResponse<HRworksPerson>> {
    return this.post<HRworksPerson>("/persons", data);
  }

  /** Update an existing person. */
  async updatePerson(
    personnelNumber: string,
    data: Partial<HRworksCreatePersonData>,
  ): Promise<ApiResponse<HRworksPerson>> {
    return this.patch<HRworksPerson>(`/persons/${personnelNumber}`, data);
  }

  // ==================== Absences ====================

  /** List absences with optional filters. */
  async listAbsences(
    startDate?: string,
    endDate?: string,
    personnelNumber?: string,
    pagination?: HRworksPaginationParams,
  ): Promise<ApiResponse<HRworksListResponse<HRworksAbsence>>> {
    const params: Record<string, string> = {};
    if (startDate) params["startDate"] = startDate;
    if (endDate) params["endDate"] = endDate;
    if (personnelNumber) params["personnelNumber"] = personnelNumber;
    if (pagination?.page != null) params["page"] = String(pagination.page);
    if (pagination?.pageSize != null) params["pageSize"] = String(pagination.pageSize);

    return this.get<HRworksListResponse<HRworksAbsence>>("/absences", params);
  }

  /** Get a single absence by ID. */
  async getAbsence(absenceId: string): Promise<ApiResponse<HRworksAbsence>> {
    return this.get<HRworksAbsence>(`/absences/${absenceId}`);
  }

  /** Create a new absence request. */
  async createAbsence(data: HRworksCreateAbsenceData): Promise<ApiResponse<HRworksAbsence>> {
    return this.post<HRworksAbsence>("/absences", data);
  }

  /** Cancel an absence. */
  async cancelAbsence(absenceId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/absences/${absenceId}`);
  }

  /** List available absence types. */
  async listAbsenceTypes(): Promise<ApiResponse<HRworksAbsenceType[]>> {
    return this.get<HRworksAbsenceType[]>("/absences/types");
  }

  /**
   * Get absence balances for a person.
   * @param year - Calendar year for the balances.
   */
  async getAbsenceBalances(
    personnelNumber: string,
    year?: number,
  ): Promise<ApiResponse<HRworksAbsenceBalance[]>> {
    const params: Record<string, string> = {};
    if (year != null) params["year"] = String(year);

    return this.get<HRworksAbsenceBalance[]>(
      `/persons/${personnelNumber}/absence-balances`,
      params,
    );
  }

  // ==================== Working Times ====================

  /** List working time entries with optional filters. */
  async listWorkingTimes(
    startDate?: string,
    endDate?: string,
    personnelNumber?: string,
    pagination?: HRworksPaginationParams,
  ): Promise<ApiResponse<HRworksListResponse<HRworksWorkingTime>>> {
    const params: Record<string, string> = {};
    if (startDate) params["startDate"] = startDate;
    if (endDate) params["endDate"] = endDate;
    if (personnelNumber) params["personnelNumber"] = personnelNumber;
    if (pagination?.page != null) params["page"] = String(pagination.page);
    if (pagination?.pageSize != null) params["pageSize"] = String(pagination.pageSize);

    return this.get<HRworksListResponse<HRworksWorkingTime>>("/working-times", params);
  }

  /** Get a single working time entry. */
  async getWorkingTime(workingTimeId: string): Promise<ApiResponse<HRworksWorkingTime>> {
    return this.get<HRworksWorkingTime>(`/working-times/${workingTimeId}`);
  }

  /** Create a new working time entry. */
  async createWorkingTime(data: HRworksCreateWorkingTimeData): Promise<ApiResponse<HRworksWorkingTime>> {
    return this.post<HRworksWorkingTime>("/working-times", data);
  }

  /** Update an existing working time entry. */
  async updateWorkingTime(
    workingTimeId: string,
    data: Partial<HRworksCreateWorkingTimeData>,
  ): Promise<ApiResponse<HRworksWorkingTime>> {
    return this.patch<HRworksWorkingTime>(`/working-times/${workingTimeId}`, data);
  }

  /** Delete a working time entry. */
  async deleteWorkingTime(workingTimeId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/working-times/${workingTimeId}`);
  }

  /** List working time models. */
  async listWorkingTimeModels(): Promise<ApiResponse<HRworksWorkingTimeModel[]>> {
    return this.get<HRworksWorkingTimeModel[]>("/working-time-models");
  }

  // ==================== Master Data ====================

  /** List organization units. */
  async listOrganizationUnits(): Promise<ApiResponse<HRworksOrganizationUnit[]>> {
    return this.get<HRworksOrganizationUnit[]>("/organization-units");
  }

  /** Get a single organization unit. */
  async getOrganizationUnit(unitId: string): Promise<ApiResponse<HRworksOrganizationUnit>> {
    return this.get<HRworksOrganizationUnit>(`/organization-units/${unitId}`);
  }

  /** List cost centers. */
  async listCostCenters(): Promise<ApiResponse<HRworksCostCenter[]>> {
    return this.get<HRworksCostCenter[]>("/cost-centers");
  }

  /** List holiday calendars. */
  async listHolidayCalendars(
    year?: number,
  ): Promise<ApiResponse<HRworksHolidayCalendar[]>> {
    const params: Record<string, string> = {};
    if (year != null) params["year"] = String(year);

    return this.get<HRworksHolidayCalendar[]>("/holiday-calendars", params);
  }

  /** List projects. */
  async listProjects(
    active?: boolean,
  ): Promise<ApiResponse<HRworksProject[]>> {
    const params: Record<string, string> = {};
    if (active != null) params["active"] = String(active);

    return this.get<HRworksProject[]>("/projects", params);
  }

  /** Get a single project. */
  async getProject(projectId: string): Promise<ApiResponse<HRworksProject>> {
    return this.get<HRworksProject>(`/projects/${projectId}`);
  }

  // ==================== Connection Test ====================

  /** Test the connection by listing persons. */
  async testConnection(): Promise<boolean> {
    try {
      await this.listPersons({ page: 1, pageSize: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
