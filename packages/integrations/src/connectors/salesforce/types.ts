// ==================== Salesforce REST API Types ====================
// OAuth2 authentication. SOQL queries. Lead/Contact/Custom object CRUD.

/** Salesforce object record with dynamic fields. */
export interface SalesforceRecord {
  Id?: string;
  attributes?: {
    type: string;
    url: string;
  };
  [field: string]: unknown;
}

/** Standard Salesforce Lead fields. */
export interface SalesforceLead extends SalesforceRecord {
  FirstName?: string;
  LastName: string;
  Company: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  Status?: string;
  LeadSource?: string;
  Description?: string;
  Street?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
  Website?: string;
}

/** Standard Salesforce Contact fields. */
export interface SalesforceContact extends SalesforceRecord {
  FirstName?: string;
  LastName: string;
  AccountId?: string;
  Email?: string;
  Phone?: string;
  Title?: string;
  Department?: string;
  MailingStreet?: string;
  MailingCity?: string;
  MailingState?: string;
  MailingPostalCode?: string;
  MailingCountry?: string;
  Description?: string;
}

/** Response from creating/updating a Salesforce record. */
export interface SalesforceWriteResult {
  id: string;
  success: boolean;
  errors: SalesforceError[];
}

/** Salesforce API error detail. */
export interface SalesforceError {
  statusCode: string;
  message: string;
  fields: string[];
}

/** SOQL query result. */
export interface SalesforceQueryResult<T extends SalesforceRecord = SalesforceRecord> {
  totalSize: number;
  done: boolean;
  nextRecordsUrl?: string;
  records: T[];
}

/** Salesforce object metadata (describe). */
export interface SalesforceObjectDescribe {
  name: string;
  label: string;
  labelPlural: string;
  fields: SalesforceFieldDescribe[];
  keyPrefix: string;
  custom: boolean;
  createable: boolean;
  updateable: boolean;
  deletable: boolean;
}

/** Salesforce field metadata. */
export interface SalesforceFieldDescribe {
  name: string;
  label: string;
  type: string;
  length: number;
  nillable: boolean;
  createable: boolean;
  updateable: boolean;
  defaultValue: unknown;
  picklistValues?: Array<{ value: string; label: string; active: boolean }>;
}

/** OpenFlow form submission mapped for Salesforce. */
export interface OpenFlowFormSubmission {
  /** OpenFlow flow ID. */
  flowId: string;
  /** OpenFlow submission ID. */
  submissionId: string;
  /** Key-value pairs from the form submission. */
  fields: Record<string, unknown>;
  /** Submission timestamp (ISO 8601). */
  submittedAt: string;
  /** Optional metadata. */
  metadata?: Record<string, unknown>;
}

/** Configuration for the Salesforce connector. */
export interface SalesforceClientConfig {
  /** OAuth2 access token. */
  accessToken: string;
  /** Salesforce instance URL (e.g., https://yourorg.my.salesforce.com). */
  instanceUrl: string;
  /** Salesforce API version (default: v59.0). */
  apiVersion?: string;
  /** Request timeout in ms. */
  timeout?: number;
}
