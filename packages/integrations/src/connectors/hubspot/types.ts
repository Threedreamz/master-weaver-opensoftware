// ==================== HubSpot CRM API Types ====================

// ==================== Shared / Generic ====================

/** HubSpot standard properties wrapper for CRM objects. */
export interface HubSpotCrmObject<T extends Record<string, unknown> = Record<string, string>> {
  id: string;
  properties: T;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  archivedAt?: string;
  associations?: Record<string, HubSpotAssociationResult>;
}

export interface HubSpotAssociationResult {
  results: Array<{
    id: string;
    type: string;
  }>;
}

export interface HubSpotPaginatedResponse<T> {
  results: T[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
}

export interface HubSpotBatchResponse<T> {
  status: "COMPLETE" | "PENDING";
  results: T[];
  numErrors?: number;
  errors?: Array<{
    status: string;
    category: string;
    message: string;
  }>;
}

export interface HubSpotSearchRequest {
  filterGroups: Array<{
    filters: Array<{
      propertyName: string;
      operator: HubSpotFilterOperator;
      value?: string;
      values?: string[];
    }>;
  }>;
  sorts?: Array<{
    propertyName: string;
    direction: "ASCENDING" | "DESCENDING";
  }>;
  properties?: string[];
  limit?: number;
  after?: string;
}

export type HubSpotFilterOperator =
  | "EQ"
  | "NEQ"
  | "LT"
  | "LTE"
  | "GT"
  | "GTE"
  | "HAS_PROPERTY"
  | "NOT_HAS_PROPERTY"
  | "CONTAINS_TOKEN"
  | "NOT_CONTAINS_TOKEN"
  | "IN"
  | "NOT_IN"
  | "BETWEEN";

// ==================== Contacts ====================

export interface HubSpotContactProperties {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  website?: string;
  jobtitle?: string;
  lifecyclestage?: string;
  hs_lead_status?: string;
  [key: string]: string | undefined;
}

export type HubSpotContact = HubSpotCrmObject<HubSpotContactProperties>;

export interface HubSpotCreateContactInput {
  properties: Partial<HubSpotContactProperties>;
  associations?: HubSpotAssociationInput[];
}

export interface HubSpotUpdateContactInput {
  properties: Partial<HubSpotContactProperties>;
}

// ==================== Companies ====================

export interface HubSpotCompanyProperties {
  name: string;
  domain?: string;
  description?: string;
  phone?: string;
  industry?: string;
  numberofemployees?: string;
  annualrevenue?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  website?: string;
  [key: string]: string | undefined;
}

export type HubSpotCompany = HubSpotCrmObject<HubSpotCompanyProperties>;

export interface HubSpotCreateCompanyInput {
  properties: Partial<HubSpotCompanyProperties>;
  associations?: HubSpotAssociationInput[];
}

export interface HubSpotUpdateCompanyInput {
  properties: Partial<HubSpotCompanyProperties>;
}

// ==================== Deals ====================

export interface HubSpotDealProperties {
  dealname: string;
  dealstage?: string;
  pipeline?: string;
  amount?: string;
  closedate?: string;
  hubspot_owner_id?: string;
  description?: string;
  hs_priority?: string;
  [key: string]: string | undefined;
}

export type HubSpotDeal = HubSpotCrmObject<HubSpotDealProperties>;

export interface HubSpotCreateDealInput {
  properties: Partial<HubSpotDealProperties>;
  associations?: HubSpotAssociationInput[];
}

export interface HubSpotUpdateDealInput {
  properties: Partial<HubSpotDealProperties>;
}

// ==================== Emails (Engagement) ====================

export interface HubSpotEmailProperties {
  hs_email_subject?: string;
  hs_email_text?: string;
  hs_email_html?: string;
  hs_email_status?: string;
  hs_email_direction?: "EMAIL" | "INCOMING_EMAIL" | "FORWARDED_EMAIL";
  hs_timestamp?: string;
  hubspot_owner_id?: string;
  hs_email_from_email?: string;
  hs_email_from_firstname?: string;
  hs_email_from_lastname?: string;
  hs_email_to_email?: string;
  [key: string]: string | undefined;
}

export type HubSpotEmail = HubSpotCrmObject<HubSpotEmailProperties>;

export interface HubSpotCreateEmailInput {
  properties: Partial<HubSpotEmailProperties>;
  associations?: HubSpotAssociationInput[];
}

// ==================== Lists ====================

export interface HubSpotList {
  listId: number;
  name: string;
  listType: "STATIC" | "DYNAMIC";
  createdAt: number;
  updatedAt: number;
  metaData: {
    size: number;
    processing: string;
    lastProcessingStateChangeAt: number;
    lastSizeChangeAt: number;
  };
  filters?: Array<Array<Record<string, unknown>>>;
  dynamic: boolean;
}

export interface HubSpotListsResponse {
  lists: HubSpotList[];
  offset: number;
  total: number;
  "has-more": boolean;
}

export interface HubSpotListMembersResponse {
  contacts: HubSpotContact[];
  "has-more": boolean;
  "vid-offset": number;
}

export interface HubSpotCreateListInput {
  name: string;
  dynamic: boolean;
  filters?: Array<Array<Record<string, unknown>>>;
}

// ==================== Associations ====================

export interface HubSpotAssociationInput {
  to: { id: string };
  types: Array<{
    associationCategory: "HUBSPOT_DEFINED" | "USER_DEFINED" | "INTEGRATOR_DEFINED";
    associationTypeId: number;
  }>;
}

// ==================== Webhooks ====================

export interface HubSpotWebhookEvent {
  eventId: number;
  subscriptionId: number;
  portalId: number;
  appId: number;
  occurredAt: number;
  subscriptionType: HubSpotWebhookSubscriptionType;
  attemptNumber: number;
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  changeSource?: string;
  sourceId?: string;
}

export type HubSpotWebhookSubscriptionType =
  | "contact.creation"
  | "contact.deletion"
  | "contact.propertyChange"
  | "contact.privacyDeletion"
  | "company.creation"
  | "company.deletion"
  | "company.propertyChange"
  | "deal.creation"
  | "deal.deletion"
  | "deal.propertyChange";

/** Pagination params for HubSpot CRM APIs. */
export interface HubSpotPaginationParams {
  limit?: number;
  after?: string;
  properties?: string[];
  associations?: string[];
}

/** Client configuration */
export interface HubSpotClientConfig {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  timeout?: number;
}
