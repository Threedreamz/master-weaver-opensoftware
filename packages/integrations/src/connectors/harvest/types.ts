// ==================== Harvest API Types ====================
// Time tracking + invoicing — time entries, projects, clients, invoices, expenses
// OAuth2 authentication + webhooks

/** Harvest client configuration */
export interface HarvestClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** Harvest account ID */
  accountId: string;
  /** Webhook signing secret */
  webhookSecret?: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ==================== Time Entries ====================

export interface HarvestTimeEntry {
  id: number;
  spent_date: string;
  user: HarvestRef;
  client: HarvestRef;
  project: HarvestRef;
  task: HarvestRef;
  user_assignment: HarvestUserAssignmentRef;
  task_assignment: HarvestTaskAssignmentRef;
  hours: number;
  hours_without_timer: number;
  rounded_hours: number;
  notes?: string;
  is_locked: boolean;
  locked_reason?: string;
  is_closed: boolean;
  is_billed: boolean;
  timer_started_at?: string;
  started_time?: string;
  ended_time?: string;
  is_running: boolean;
  billable: boolean;
  budgeted: boolean;
  billable_rate?: number;
  cost_rate?: number;
  created_at: string;
  updated_at: string;
  external_reference?: HarvestExternalReference;
}

export interface HarvestRef {
  id: number;
  name: string;
}

export interface HarvestUserAssignmentRef {
  id: number;
  is_project_manager: boolean;
}

export interface HarvestTaskAssignmentRef {
  id: number;
  billable: boolean;
}

export interface HarvestExternalReference {
  id: string;
  group_id: string;
  account_id: string;
  permalink: string;
}

export interface HarvestCreateTimeEntryRequest {
  project_id: number;
  task_id: number;
  spent_date: string;
  user_id?: number;
  hours?: number;
  notes?: string;
  started_time?: string;
  ended_time?: string;
  external_reference?: HarvestExternalReference;
}

export interface HarvestUpdateTimeEntryRequest {
  project_id?: number;
  task_id?: number;
  spent_date?: string;
  hours?: number;
  notes?: string;
  started_time?: string;
  ended_time?: string;
  external_reference?: HarvestExternalReference;
}

export interface HarvestTimeEntryListParams {
  user_id?: number;
  client_id?: number;
  project_id?: number;
  task_id?: number;
  is_billed?: boolean;
  is_running?: boolean;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
  updated_since?: string;
}

// ==================== Projects ====================

export interface HarvestProject {
  id: number;
  client: HarvestRef;
  name: string;
  code?: string;
  is_active: boolean;
  is_billable: boolean;
  is_fixed_fee: boolean;
  bill_by: "none" | "People" | "Project" | "Tasks";
  budget?: number;
  budget_by: "none" | "project" | "project_cost" | "task" | "task_fees" | "person";
  budget_is_monthly: boolean;
  notify_when_over_budget: boolean;
  over_budget_notification_percentage?: number;
  show_budget_to_all: boolean;
  cost_budget?: number;
  cost_budget_include_expenses: boolean;
  hourly_rate?: number;
  fee?: number;
  notes?: string;
  starts_on?: string;
  ends_on?: string;
  created_at: string;
  updated_at: string;
}

export interface HarvestCreateProjectRequest {
  client_id: number;
  name: string;
  code?: string;
  is_active?: boolean;
  is_billable?: boolean;
  is_fixed_fee?: boolean;
  bill_by?: string;
  budget?: number;
  budget_by?: string;
  hourly_rate?: number;
  fee?: number;
  notes?: string;
  starts_on?: string;
  ends_on?: string;
}

// ==================== Clients ====================

export interface HarvestClient {
  id: number;
  name: string;
  is_active: boolean;
  address?: string;
  statement_key?: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface HarvestCreateClientRequest {
  name: string;
  is_active?: boolean;
  address?: string;
  currency?: string;
}

// ==================== Invoices ====================

export interface HarvestInvoice {
  id: number;
  client: HarvestRef;
  number: string;
  purchase_order?: string;
  amount: number;
  due_amount: number;
  tax?: number;
  tax_amount: number;
  tax2?: number;
  tax2_amount: number;
  discount?: number;
  discount_amount: number;
  subject?: string;
  notes?: string;
  currency: string;
  state: HarvestInvoiceState;
  period_start?: string;
  period_end?: string;
  issue_date: string;
  due_date: string;
  payment_term?: string;
  sent_at?: string;
  paid_at?: string;
  paid_date?: string;
  closed_at?: string;
  recurring_invoice_id?: number;
  created_at: string;
  updated_at: string;
  line_items: HarvestInvoiceLineItem[];
}

export type HarvestInvoiceState = "draft" | "open" | "paid" | "closed";

export interface HarvestInvoiceLineItem {
  id: number;
  project?: HarvestRef;
  kind: "Service" | "Product" | "Other";
  description?: string;
  quantity: number;
  unit_price: number;
  amount: number;
  taxed: boolean;
  taxed2: boolean;
}

export interface HarvestCreateInvoiceRequest {
  client_id: number;
  number?: string;
  purchase_order?: string;
  tax?: number;
  tax2?: number;
  discount?: number;
  subject?: string;
  notes?: string;
  currency?: string;
  issue_date?: string;
  due_date?: string;
  payment_term?: string;
  line_items?: HarvestCreateInvoiceLineItem[];
}

export interface HarvestCreateInvoiceLineItem {
  project_id?: number;
  kind: "Service" | "Product" | "Other";
  description?: string;
  quantity: number;
  unit_price: number;
  taxed?: boolean;
  taxed2?: boolean;
}

// ==================== Expenses ====================

export interface HarvestExpense {
  id: number;
  client: HarvestRef;
  project: HarvestRef;
  expense_category: HarvestRef;
  user: HarvestRef;
  user_assignment: HarvestUserAssignmentRef;
  spent_date: string;
  notes?: string;
  billable: boolean;
  is_closed: boolean;
  is_locked: boolean;
  is_billed: boolean;
  locked_reason?: string;
  total_cost: number;
  units?: number;
  receipt?: { url: string; file_name: string; file_size: number; content_type: string };
  created_at: string;
  updated_at: string;
}

export interface HarvestCreateExpenseRequest {
  project_id: number;
  expense_category_id: number;
  spent_date: string;
  user_id?: number;
  total_cost?: number;
  units?: number;
  notes?: string;
  billable?: boolean;
}

// ==================== Pagination ====================

export interface HarvestPaginatedResponse<T> {
  [key: string]: T[] | HarvestPagination | unknown;
}

export interface HarvestPagination {
  per_page: number;
  total_pages: number;
  total_entries: number;
  next_page?: number;
  previous_page?: number;
  page: number;
  links: {
    first: string;
    last: string;
    next?: string;
    previous?: string;
  };
}

// ==================== Users ====================

export interface HarvestUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  telephone?: string;
  timezone: string;
  is_contractor: boolean;
  is_active: boolean;
  weekly_capacity?: number;
  default_hourly_rate?: number;
  cost_rate?: number;
  roles: string[];
  access_roles: string[];
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// ==================== Webhook Types ====================

export type HarvestWebhookEventType =
  | "TimeEntries.create"
  | "TimeEntries.update"
  | "TimeEntries.delete"
  | "Projects.create"
  | "Projects.update"
  | "Projects.delete"
  | "Invoices.create"
  | "Invoices.update"
  | "Invoices.delete"
  | "Expenses.create"
  | "Expenses.update"
  | "Expenses.delete"
  | "Clients.create"
  | "Clients.update"
  | "Clients.delete";

export interface HarvestWebhookPayload {
  webhook_id: number;
  event: HarvestWebhookEventType;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface HarvestWebhookSubscription {
  id: number;
  name: string;
  events: string[];
  webhook_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
