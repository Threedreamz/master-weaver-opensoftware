// ==================== Clockodo API Types ====================
// German time tracking — time entries, projects, customers, services, reports
// API key authentication (email + API key) + webhooks

/** Clockodo client configuration */
export interface ClockodoClientConfig {
  /** Clockodo account email */
  email: string;
  /** Clockodo API key */
  apiKey: string;
  /** Webhook signing secret */
  webhookSecret?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Time Entries ====================

export interface ClockodoTimeEntry {
  id: number;
  customersId: number;
  projectsId?: number;
  servicesId?: number;
  usersId: number;
  billable: boolean;
  timeSince: string;
  timeUntil?: string;
  duration?: number;
  offset?: number;
  clocked: boolean;
  description?: string;
  hourlyRate?: number;
  lumpSum?: number;
  budgetIsHours: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClockodoCreateTimeEntryRequest {
  customersId: number;
  projectsId?: number;
  servicesId?: number;
  billable?: boolean;
  timeSince: string;
  timeUntil?: string;
  description?: string;
  hourlyRate?: number;
  lumpSum?: number;
}

export interface ClockodoUpdateTimeEntryRequest {
  customersId?: number;
  projectsId?: number;
  servicesId?: number;
  billable?: boolean;
  timeSince?: string;
  timeUntil?: string;
  description?: string;
  hourlyRate?: number;
}

export interface ClockodoTimeEntryListParams {
  timeSince: string;
  timeUntil: string;
  usersId?: number;
  customersId?: number;
  projectsId?: number;
  servicesId?: number;
  billable?: boolean;
  page?: number;
}

// ==================== Customers ====================

export interface ClockodoCustomer {
  id: number;
  name: string;
  number?: string;
  active: boolean;
  billableDefault: boolean;
  note?: string;
  color?: string;
}

export interface ClockodoCreateCustomerRequest {
  name: string;
  number?: string;
  active?: boolean;
  billableDefault?: boolean;
  note?: string;
  color?: string;
}

// ==================== Projects ====================

export interface ClockodoProject {
  id: number;
  customersId: number;
  name: string;
  number?: string;
  active: boolean;
  billableDefault: boolean;
  budget?: number;
  budgetIsHours: boolean;
  budgetIsNotStrict: boolean;
  note?: string;
  completed: boolean;
}

export interface ClockodoCreateProjectRequest {
  customersId: number;
  name: string;
  number?: string;
  active?: boolean;
  billableDefault?: boolean;
  budget?: number;
  budgetIsHours?: boolean;
  note?: string;
}

// ==================== Services ====================

export interface ClockodoService {
  id: number;
  name: string;
  number?: string;
  active: boolean;
  note?: string;
}

export interface ClockodoCreateServiceRequest {
  name: string;
  number?: string;
  active?: boolean;
  note?: string;
}

// ==================== Users ====================

export interface ClockodoUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  language?: string;
  timezone?: string;
}

// ==================== Reports ====================

export interface ClockodoUserReport {
  usersId: number;
  userName: string;
  duration: number;
  durationBillable: number;
  revenue: number;
  entryCount: number;
}

export interface ClockodoProjectReport {
  projectsId: number;
  projectName: string;
  customersId: number;
  customerName: string;
  duration: number;
  durationBillable: number;
  revenue: number;
  budget?: number;
  budgetUsed?: number;
}

export interface ClockodoReportParams {
  year: number;
  month?: number;
  usersId?: number;
  customersId?: number;
  projectsId?: number;
}

// ==================== Clock (Running Timer) ====================

export interface ClockodoClock {
  running?: ClockodoTimeEntry;
}

export interface ClockodoStartClockRequest {
  customersId: number;
  projectsId?: number;
  servicesId?: number;
  billable?: boolean;
  description?: string;
}

// ==================== Webhook Types ====================

export type ClockodoWebhookEventType =
  | "timeEntry.created"
  | "timeEntry.updated"
  | "timeEntry.deleted"
  | "customer.created"
  | "customer.updated"
  | "customer.deleted"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "absence.created"
  | "absence.updated"
  | "absence.deleted";

export interface ClockodoWebhookPayload {
  event: ClockodoWebhookEventType;
  resourceId: number;
  resourceType: string;
  data: Record<string, unknown>;
  triggeredAt: string;
}

// ==================== Responses ====================

export interface ClockodoListResponse<T> {
  paging?: {
    itemsPerPage: number;
    currentPage: number;
    countPages: number;
    countItems: number;
  };
  [key: string]: T[] | unknown;
}
