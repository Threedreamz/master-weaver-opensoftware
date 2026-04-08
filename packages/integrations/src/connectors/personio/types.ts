// ==================== Personio API Types ====================
// OAuth2 client credentials authentication
// https://developer.personio.de/reference

// ==================== Config ====================

export interface PersonioClientConfig {
  /** OAuth2 client ID */
  clientId: string;
  /** OAuth2 client secret */
  clientSecret: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Common ====================

export interface PersonioPaginationParams {
  limit?: number;
  offset?: number;
}

export interface PersonioListResponse<T> {
  success: boolean;
  metadata: {
    current_page: number;
    total_pages: number;
    total_elements: number;
  };
  data: T[];
}

export interface PersonioSingleResponse<T> {
  success: boolean;
  data: T;
}

export interface PersonioTokenResponse {
  success: boolean;
  data: {
    token: string;
  };
}

// ==================== Employees ====================

export interface PersonioEmployeeAttribute {
  label: string;
  value: unknown;
  type: string;
  universal_id: string;
}

export interface PersonioEmployee {
  type: "Employee";
  attributes: {
    id: PersonioEmployeeAttribute;
    first_name: PersonioEmployeeAttribute;
    last_name: PersonioEmployeeAttribute;
    email: PersonioEmployeeAttribute;
    gender: PersonioEmployeeAttribute;
    status: PersonioEmployeeAttribute;
    position: PersonioEmployeeAttribute;
    department: PersonioEmployeeAttribute;
    office: PersonioEmployeeAttribute;
    hire_date: PersonioEmployeeAttribute;
    contract_end_date: PersonioEmployeeAttribute;
    termination_date: PersonioEmployeeAttribute;
    supervisor: PersonioEmployeeAttribute;
    employment_type: PersonioEmployeeAttribute;
    weekly_working_hours: PersonioEmployeeAttribute;
    [key: string]: PersonioEmployeeAttribute;
  };
}

export interface PersonioCreateEmployeeData {
  employee: {
    email: string;
    first_name: string;
    last_name: string;
    gender?: string;
    position?: string;
    department?: string;
    office?: string;
    hire_date?: string;
    weekly_working_hours?: number;
    [key: string]: unknown;
  };
}

// ==================== Attendances ====================

export interface PersonioAttendance {
  id: number;
  employee_id: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  break: number; // minutes
  comment?: string;
  project_id?: number;
  is_holiday: boolean;
  is_on_time_off: boolean;
  updated_at: string;
  created_at: string;
}

export interface PersonioCreateAttendanceData {
  employee_id: number;
  date: string;
  start_time: string;
  end_time: string;
  break: number;
  comment?: string;
  project_id?: number;
}

// ==================== Absences ====================

export interface PersonioAbsence {
  id: number;
  type: "Absence";
  attributes: {
    id: PersonioEmployeeAttribute;
    employee_id: PersonioEmployeeAttribute;
    start_date: PersonioEmployeeAttribute;
    end_date: PersonioEmployeeAttribute;
    days_count: PersonioEmployeeAttribute;
    half_day_start: PersonioEmployeeAttribute;
    half_day_end: PersonioEmployeeAttribute;
    status: PersonioEmployeeAttribute;
    time_off_type: PersonioEmployeeAttribute;
    comment: PersonioEmployeeAttribute;
    certificate?: PersonioEmployeeAttribute;
    created_at: PersonioEmployeeAttribute;
    updated_at: PersonioEmployeeAttribute;
  };
}

export interface PersonioCreateAbsenceData {
  employee_id: number;
  time_off_type_id: number;
  start_date: string;
  end_date: string;
  half_day_start?: boolean;
  half_day_end?: boolean;
  comment?: string;
}

export interface PersonioAbsenceType {
  type: "TimeOffType";
  attributes: {
    id: number;
    name: string;
    category: string;
  };
}

// ==================== Documents ====================

export interface PersonioDocument {
  id: string;
  status: string;
  title: string;
  category: {
    id: number;
    name: string;
  };
  employee: {
    id: number;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface PersonioDocumentCategory {
  id: number;
  name: string;
}

export interface PersonioUploadDocumentData {
  employee_id: number;
  category_id: number;
  title: string;
  /** Base64-encoded file content */
  file: string;
  filename: string;
  comment?: string;
}

// ==================== Projects ====================

export interface PersonioProject {
  id: number;
  type: "Project";
  attributes: {
    id: PersonioEmployeeAttribute;
    name: PersonioEmployeeAttribute;
    active: PersonioEmployeeAttribute;
    created_at: PersonioEmployeeAttribute;
    updated_at: PersonioEmployeeAttribute;
  };
}

export interface PersonioCreateProjectData {
  name: string;
  active?: boolean;
}

// ==================== Webhooks ====================

export interface PersonioWebhookEvent {
  event: PersonioWebhookEventType;
  triggered_at: string;
  data: Record<string, unknown>;
}

export type PersonioWebhookEventType =
  | "employee_created"
  | "employee_updated"
  | "employee_deleted"
  | "absence_created"
  | "absence_updated"
  | "absence_deleted"
  | "attendance_created"
  | "attendance_updated"
  | "attendance_deleted";

export interface PersonioWebhookRegistration {
  id: number;
  url: string;
  active: boolean;
  event_types: PersonioWebhookEventType[];
  created_at: string;
}
