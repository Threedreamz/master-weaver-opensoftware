// ==================== BambooHR API Types ====================
// API key (basic auth) — key as username, "x" as password
// https://documentation.bamboohr.com/reference

// ==================== Config ====================

export interface BambooHRClientConfig {
  /** BambooHR API key */
  apiKey: string;
  /** Company subdomain (e.g. "acme" for acme.bamboohr.com) */
  subdomain: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Common ====================

export interface BambooHRPaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  perPage?: number;
}

// ==================== Employees ====================

export interface BambooHREmployee {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  gender?: string;
  jobTitle?: string;
  workPhone?: string;
  mobilePhone?: string;
  workEmail?: string;
  department?: string;
  location?: string;
  division?: string;
  linkedIn?: string;
  workPhoneExtension?: string;
  supervisor?: string;
  photoUrl?: string;
  hireDate?: string;
  terminationDate?: string;
  status?: string;
  employeeNumber?: string;
  /** Additional fields returned by fieldset or custom field IDs */
  [key: string]: unknown;
}

export interface BambooHREmployeeDirectory {
  fields: BambooHRFieldDefinition[];
  employees: BambooHREmployee[];
}

export interface BambooHRFieldDefinition {
  id: string;
  type: string;
  name: string;
}

export interface BambooHRCreateEmployeeData {
  firstName: string;
  lastName: string;
  [key: string]: unknown;
}

// ==================== Time Off ====================

export interface BambooHRTimeOffRequest {
  id: string;
  employeeId: string;
  status: {
    lastChanged: string;
    lastChangedByUserId: string;
    status: "approved" | "denied" | "superseded" | "requested" | "canceled";
  };
  name: string;
  start: string;
  end: string;
  created: string;
  type: {
    id: string;
    name: string;
    icon: string;
  };
  amount: {
    unit: "hours" | "days";
    amount: string;
  };
  notes?: {
    employee?: string;
    manager?: string;
  };
  dates: Record<string, string>;
}

export interface BambooHRCreateTimeOffData {
  employeeId: string;
  timeOffTypeId: string;
  start: string;
  end: string;
  amount: number;
  notes?: string;
  status?: "approved" | "requested";
  previousRequest?: string;
}

export interface BambooHRTimeOffType {
  id: string;
  name: string;
  units: "hours" | "days";
  color?: string;
  icon?: string;
}

export interface BambooHRTimeOffBalance {
  employeeId: string;
  timeOffTypeId: string;
  balance: number;
  units: "hours" | "days";
}

// ==================== Reports ====================

export interface BambooHRReportField {
  id: string;
  type: string;
  name: string;
}

export interface BambooHRReport {
  title: string;
  fields: BambooHRReportField[];
  employees: Record<string, unknown>[];
}

export interface BambooHRCustomReportRequest {
  title?: string;
  /** List of field IDs or aliases to include */
  fields: string[];
  /** Optional OData-style filter */
  filters?: Record<string, { value: string | string[] }>;
}

// ==================== Tables ====================

export interface BambooHRTableRow {
  id: string;
  employeeId: string;
  [key: string]: unknown;
}

// ==================== Files ====================

export interface BambooHRFile {
  id: string;
  name: string;
  originalFileName: string;
  size: number;
  dateCreated: string;
  createdBy: string;
  shareWithEmployee: boolean;
}

export interface BambooHRFileCategory {
  id: string;
  name: string;
  files: BambooHRFile[];
}

export interface BambooHRUploadFileData {
  employeeId: string;
  categoryId: string;
  fileName: string;
  /** Base64-encoded file content */
  content: string;
  shareWithEmployee?: boolean;
}

// ==================== Webhooks ====================

export interface BambooHRWebhookEvent {
  /** Unique event ID */
  id: string;
  /** Webhook ID */
  webhookId: string;
  /** Employee ID affected */
  employeeId: string;
  /** Event type */
  type: BambooHRWebhookEventType;
  /** Changed fields (field name → { old, new }) */
  changedFields: Record<string, { old: unknown; new: unknown }>;
  /** ISO 8601 timestamp */
  timestamp: string;
}

export type BambooHRWebhookEventType =
  | "employee.created"
  | "employee.updated"
  | "employee.deleted"
  | "timeOff.created"
  | "timeOff.updated"
  | "timeOff.deleted"
  | "timeOff.approved"
  | "timeOff.denied"
  | "timeTracking.created"
  | "timeTracking.updated";

export interface BambooHRWebhookRegistration {
  id: string;
  name: string;
  url: string;
  format: "json";
  /** Which fields to monitor */
  monitorFields: string[];
  /** Limit to specific employees (empty = all) */
  postFields: Record<string, string>;
  includeCompanyDomain: boolean;
  enabled: boolean;
  created: string;
  lastSent?: string;
}

export interface BambooHRCreateWebhookData {
  name: string;
  url: string;
  monitorFields: string[];
  postFields?: Record<string, string>;
  format?: "json";
  includeCompanyDomain?: boolean;
}
