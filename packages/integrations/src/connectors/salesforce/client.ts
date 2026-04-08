import { BaseIntegrationClient } from "../../core/base-client.js";
import type { ApiResponse } from "../../core/types.js";
import type {
  SalesforceClientConfig,
  SalesforceRecord,
  SalesforceLead,
  SalesforceContact,
  SalesforceWriteResult,
  SalesforceQueryResult,
  SalesforceObjectDescribe,
  OpenFlowFormSubmission,
} from "./types.js";

const DEFAULT_API_VERSION = "v59.0";

/**
 * Salesforce REST API client for OpenFlow form integrations.
 *
 * Creates/updates Leads, Contacts, and custom objects from form submissions.
 * Uses OAuth2 authentication. Supports SOQL queries for lookups and dedup.
 */
export class SalesforceClient extends BaseIntegrationClient {
  private apiVersion: string;

  constructor(config: SalesforceClientConfig) {
    const apiVersion = config.apiVersion ?? DEFAULT_API_VERSION;

    super({
      baseUrl: `${config.instanceUrl.replace(/\/$/, "")}/services/data/${apiVersion}`,
      authType: "oauth2",
      credentials: { accessToken: config.accessToken },
      timeout: config.timeout ?? 30_000,
      rateLimit: { requestsPerMinute: 100 },
    });

    this.apiVersion = apiVersion;
  }

  // ==================== SOQL Queries ====================

  /** Execute a SOQL query and return typed results. */
  async query<T extends SalesforceRecord = SalesforceRecord>(
    soql: string
  ): Promise<ApiResponse<SalesforceQueryResult<T>>> {
    return this.get<SalesforceQueryResult<T>>("/query", {
      q: soql,
    });
  }

  /** Fetch the next page of a query result using the nextRecordsUrl. */
  async queryMore<T extends SalesforceRecord = SalesforceRecord>(
    nextRecordsUrl: string
  ): Promise<ApiResponse<SalesforceQueryResult<T>>> {
    // nextRecordsUrl is a relative path like /services/data/v59.0/query/01gxx...
    // We need to strip the base path prefix since BaseIntegrationClient prepends baseUrl.
    const path = nextRecordsUrl.replace(
      `/services/data/${this.apiVersion}`,
      ""
    );
    return this.get<SalesforceQueryResult<T>>(path);
  }

  // ==================== Generic SObject CRUD ====================

  /** Create a record of any SObject type. */
  async createRecord(
    objectType: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<SalesforceWriteResult>> {
    return this.post<SalesforceWriteResult>(
      `/sobjects/${objectType}`,
      data
    );
  }

  /** Update an existing SObject record by ID. */
  async updateRecord(
    objectType: string,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<void>> {
    return this.patch<void>(
      `/sobjects/${objectType}/${recordId}`,
      data
    );
  }

  /** Get a single SObject record by ID. */
  async getRecord<T extends SalesforceRecord = SalesforceRecord>(
    objectType: string,
    recordId: string,
    fields?: string[]
  ): Promise<ApiResponse<T>> {
    const params: Record<string, string> = {};
    if (fields?.length) {
      params.fields = fields.join(",");
    }
    return this.get<T>(`/sobjects/${objectType}/${recordId}`, params);
  }

  /** Delete a record by ID. */
  async deleteRecord(
    objectType: string,
    recordId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/sobjects/${objectType}/${recordId}`);
  }

  /** Upsert a record using an external ID field. */
  async upsertRecord(
    objectType: string,
    externalIdField: string,
    externalIdValue: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<SalesforceWriteResult>> {
    return this.patch<SalesforceWriteResult>(
      `/sobjects/${objectType}/${externalIdField}/${externalIdValue}`,
      data
    );
  }

  // ==================== Object Metadata ====================

  /** Describe an SObject to get its fields and metadata. */
  async describeObject(
    objectType: string
  ): Promise<ApiResponse<SalesforceObjectDescribe>> {
    return this.get<SalesforceObjectDescribe>(
      `/sobjects/${objectType}/describe`
    );
  }

  // ==================== Lead Operations ====================

  /** Create a Salesforce Lead from form data. */
  async createLead(
    lead: Omit<SalesforceLead, "Id" | "attributes">
  ): Promise<ApiResponse<SalesforceWriteResult>> {
    return this.createRecord("Lead", lead);
  }

  /** Update an existing Lead by ID. */
  async updateLead(
    leadId: string,
    data: Partial<Omit<SalesforceLead, "Id" | "attributes">>
  ): Promise<ApiResponse<void>> {
    return this.updateRecord("Lead", leadId, data);
  }

  /** Find a Lead by email address. Returns null if not found. */
  async findLeadByEmail(
    email: string
  ): Promise<SalesforceLead | null> {
    const escaped = email.replace(/'/g, "\\'");
    const result = await this.query<SalesforceLead>(
      `SELECT Id, FirstName, LastName, Company, Email, Phone, Status FROM Lead WHERE Email = '${escaped}' LIMIT 1`
    );
    return result.data.records[0] ?? null;
  }

  // ==================== Contact Operations ====================

  /** Create a Salesforce Contact from form data. */
  async createContact(
    contact: Omit<SalesforceContact, "Id" | "attributes">
  ): Promise<ApiResponse<SalesforceWriteResult>> {
    return this.createRecord("Contact", contact);
  }

  /** Update an existing Contact by ID. */
  async updateContact(
    contactId: string,
    data: Partial<Omit<SalesforceContact, "Id" | "attributes">>
  ): Promise<ApiResponse<void>> {
    return this.updateRecord("Contact", contactId, data);
  }

  /** Find a Contact by email address. Returns null if not found. */
  async findContactByEmail(
    email: string
  ): Promise<SalesforceContact | null> {
    const escaped = email.replace(/'/g, "\\'");
    const result = await this.query<SalesforceContact>(
      `SELECT Id, FirstName, LastName, Email, Phone, AccountId FROM Contact WHERE Email = '${escaped}' LIMIT 1`
    );
    return result.data.records[0] ?? null;
  }

  // ==================== OpenFlow Submission Helpers ====================

  /**
   * Create or update a Lead from an OpenFlow form submission.
   * If a Lead with the same email exists, it is updated; otherwise a new one is created.
   */
  async upsertLeadFromSubmission(
    submission: OpenFlowFormSubmission,
    fieldMapping: Record<string, string>
  ): Promise<{ action: "created" | "updated"; id: string }> {
    const leadData = this.mapSubmissionFields(submission, fieldMapping);

    const email = leadData.Email as string | undefined;
    if (email) {
      const existing = await this.findLeadByEmail(email);
      if (existing?.Id) {
        await this.updateLead(existing.Id, leadData);
        return { action: "updated", id: existing.Id };
      }
    }

    const result = await this.createLead(
      leadData as Omit<SalesforceLead, "Id" | "attributes">
    );
    return { action: "created", id: result.data.id };
  }

  /**
   * Create or update a Contact from an OpenFlow form submission.
   * If a Contact with the same email exists, it is updated; otherwise a new one is created.
   */
  async upsertContactFromSubmission(
    submission: OpenFlowFormSubmission,
    fieldMapping: Record<string, string>
  ): Promise<{ action: "created" | "updated"; id: string }> {
    const contactData = this.mapSubmissionFields(submission, fieldMapping);

    const email = contactData.Email as string | undefined;
    if (email) {
      const existing = await this.findContactByEmail(email);
      if (existing?.Id) {
        await this.updateContact(existing.Id, contactData);
        return { action: "updated", id: existing.Id };
      }
    }

    const result = await this.createContact(
      contactData as Omit<SalesforceContact, "Id" | "attributes">
    );
    return { action: "created", id: result.data.id };
  }

  /**
   * Push a form submission to any custom SObject.
   * fieldMapping maps OpenFlow field keys → Salesforce field API names.
   */
  async pushSubmissionToObject(
    submission: OpenFlowFormSubmission,
    objectType: string,
    fieldMapping: Record<string, string>
  ): Promise<ApiResponse<SalesforceWriteResult>> {
    const data = this.mapSubmissionFields(submission, fieldMapping);
    return this.createRecord(objectType, data);
  }

  // ==================== Private Helpers ====================

  /**
   * Map OpenFlow form fields to Salesforce field names using a mapping object.
   * Keys are OpenFlow field IDs, values are Salesforce API field names.
   */
  private mapSubmissionFields(
    submission: OpenFlowFormSubmission,
    fieldMapping: Record<string, string>
  ): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};

    for (const [openFlowField, salesforceField] of Object.entries(fieldMapping)) {
      const value = submission.fields[openFlowField];
      if (value !== undefined && value !== null) {
        mapped[salesforceField] = value;
      }
    }

    return mapped;
  }
}
