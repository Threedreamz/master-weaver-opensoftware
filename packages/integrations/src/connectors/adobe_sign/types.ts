// ==================== Adobe Sign (Acrobat Sign) REST API v6 Types ====================

/** Agreement status */
export type AdobeSignAgreementStatus =
  | "AUTHORING"
  | "DRAFT"
  | "IN_PROCESS"
  | "SIGNED"
  | "APPROVED"
  | "DELIVERED"
  | "ACCEPTED"
  | "FORM_FILLED"
  | "OUT_FOR_SIGNATURE"
  | "OUT_FOR_APPROVAL"
  | "OUT_FOR_DELIVERY"
  | "OUT_FOR_ACCEPTANCE"
  | "OUT_FOR_FORM_FILLING"
  | "EXPIRED"
  | "CANCELLED"
  | "RECALLED"
  | "WAITING_FOR_FAXIN"
  | "ARCHIVED"
  | "WIDGET"
  | "WAITING_FOR_VERIFICATION";

/** Participant role */
export type AdobeSignParticipantRole =
  | "SIGNER"
  | "APPROVER"
  | "ACCEPTOR"
  | "CERTIFIED_RECIPIENT"
  | "FORM_FILLER"
  | "DELEGATE_TO_SIGNER"
  | "DELEGATE_TO_APPROVER"
  | "SHARE";

/** Signing order type */
export type AdobeSignSignatureType = "ESIGN" | "WRITTEN";

/** File info source type */
export type AdobeSignFileInfoSourceType = "LIBRARY_DOCUMENT_ID" | "TRANSIENT_DOCUMENT_ID" | "URL";

/** Webhook scope */
export type AdobeSignWebhookScope = "ACCOUNT" | "GROUP" | "USER" | "RESOURCE";

/** Webhook resource type */
export type AdobeSignWebhookResourceType =
  | "AGREEMENT"
  | "WIDGET"
  | "MEGASIGN"
  | "LIBRARY_DOCUMENT";

// ==================== Client Configuration ====================

export interface AdobeSignClientConfig {
  /** OAuth2 client ID */
  clientId: string;
  /** OAuth2 client secret */
  clientSecret: string;
  /** OAuth2 access token */
  accessToken: string;
  /** OAuth2 refresh token */
  refreshToken?: string;
  /** Base URL — defaults to EU1 production */
  baseUrl?: string;
}

// ==================== Agreements ====================

export interface AdobeSignAgreement {
  id: string;
  name: string;
  status: AdobeSignAgreementStatus;
  createdDate: string;
  expirationTime?: string;
  lastEventDate?: string;
  type: string;
  parentId?: string;
  groupId?: string;
  senderEmail: string;
}

export interface AdobeSignAgreementDetails {
  id: string;
  name: string;
  status: AdobeSignAgreementStatus;
  createdDate: string;
  expirationTime?: string;
  locale: string;
  message?: string;
  senderEmail: string;
  signatureType: AdobeSignSignatureType;
  participantSetsInfo: AdobeSignParticipantSetInfo[];
  fileInfos: AdobeSignFileInfo[];
  ccs?: AdobeSignCc[];
  emailOption?: AdobeSignEmailOption;
  externalId?: AdobeSignExternalId;
  postSignOption?: AdobeSignPostSignOption;
  reminderInfo?: AdobeSignReminderInfo;
  securityOption?: AdobeSignSecurityOption;
  vaultingInfo?: AdobeSignVaultingInfo;
}

export interface AdobeSignParticipantSetInfo {
  memberInfos: AdobeSignParticipantMemberInfo[];
  order: number;
  role: AdobeSignParticipantRole;
  name?: string;
  privateMessage?: string;
}

export interface AdobeSignParticipantMemberInfo {
  email: string;
  name?: string;
  securityOption?: AdobeSignParticipantSecurityOption;
}

export interface AdobeSignParticipantSecurityOption {
  authenticationMethod: "NONE" | "PASSWORD" | "PHONE" | "KBA" | "WEB_IDENTITY";
  password?: string;
  phoneInfos?: Array<{
    phone: string;
    countryCode: string;
  }>;
}

export interface AdobeSignCc {
  email: string;
  label?: string;
  visiblePages?: string[];
}

export interface AdobeSignFileInfo {
  transientDocumentId?: string;
  libraryDocumentId?: string;
  urlFileInfo?: {
    url: string;
    name?: string;
    mimeType?: string;
  };
  label?: string;
}

export interface AdobeSignEmailOption {
  sendOptions?: {
    completionEmails: "ALL" | "NONE";
    inFlightEmails: "ALL" | "NONE";
    initEmails: "ALL" | "NONE";
  };
}

export interface AdobeSignExternalId {
  id: string;
}

export interface AdobeSignPostSignOption {
  redirectUrl: string;
  redirectDelay: number;
}

export interface AdobeSignReminderInfo {
  reminderFrequency: "DAILY_UNTIL_SIGNED" | "WEEKLY_UNTIL_SIGNED" | "EVERY_OTHER_DAY_UNTIL_SIGNED" | "EVERY_THIRD_DAY_UNTIL_SIGNED" | "EVERY_FIFTH_DAY_UNTIL_SIGNED";
  firstReminderDelay?: number;
}

export interface AdobeSignSecurityOption {
  openPassword?: string;
}

export interface AdobeSignVaultingInfo {
  enabled: boolean;
}

// ==================== Agreements List ====================

export interface AdobeSignAgreementsListResponse {
  userAgreementList: AdobeSignAgreement[];
  page: AdobeSignPageInfo;
}

export interface AdobeSignPageInfo {
  nextCursor?: string;
}

export interface AdobeSignAgreementsListParams {
  /** Cursor for pagination */
  cursor?: string;
  /** Page size (max 1000) */
  pageSize?: number;
  /** Filter by status */
  status?: AdobeSignAgreementStatus;
  /** External ID filter */
  externalId?: string;
  /** External group filter */
  externalGroup?: string;
  /** Show hidden agreements */
  showHiddenAgreements?: boolean;
}

// ==================== Create Agreement ====================

export interface AdobeSignCreateAgreementRequest {
  name: string;
  participantSetsInfo: AdobeSignParticipantSetInfo[];
  fileInfos: AdobeSignFileInfo[];
  signatureType: AdobeSignSignatureType;
  state: "IN_PROCESS" | "DRAFT" | "AUTHORING";
  message?: string;
  ccs?: AdobeSignCc[];
  emailOption?: AdobeSignEmailOption;
  externalId?: AdobeSignExternalId;
  postSignOption?: AdobeSignPostSignOption;
  reminderInfo?: AdobeSignReminderInfo;
  securityOption?: AdobeSignSecurityOption;
  expirationTime?: string;
  locale?: string;
}

export interface AdobeSignCreateAgreementResponse {
  id: string;
}

// ==================== Documents ====================

export interface AdobeSignAgreementDocument {
  id: string;
  label: string;
  numPages: number;
  mimeType: string;
  name: string;
}

export interface AdobeSignAgreementDocumentsResponse {
  documents: AdobeSignAgreementDocument[];
}

export interface AdobeSignTransientDocumentResponse {
  transientDocumentId: string;
}

// ==================== Signing URLs ====================

export interface AdobeSignSigningUrlSetInfo {
  signingUrlSetInfos: Array<{
    signingUrls: Array<{
      email: string;
      esignUrl: string;
    }>;
  }>;
}

// ==================== Templates (Library Documents) ====================

export interface AdobeSignLibraryDocument {
  id: string;
  name: string;
  createdDate: string;
  modifiedDate: string;
  sharingMode: "USER" | "GROUP" | "ACCOUNT";
  status: "AUTHORING" | "ACTIVE" | "REMOVED";
  templateTypes: Array<"DOCUMENT" | "FORM_FIELD_LAYER">;
}

export interface AdobeSignLibraryDocumentsResponse {
  libraryDocumentList: AdobeSignLibraryDocument[];
  page: AdobeSignPageInfo;
}

export interface AdobeSignLibraryDocumentDetails {
  id: string;
  name: string;
  createdDate: string;
  modifiedDate: string;
  sharingMode: "USER" | "GROUP" | "ACCOUNT";
  status: "AUTHORING" | "ACTIVE" | "REMOVED";
  templateTypes: Array<"DOCUMENT" | "FORM_FIELD_LAYER">;
  state: string;
}

// ==================== Webhooks ====================

export interface AdobeSignWebhookInfo {
  id: string;
  name: string;
  scope: AdobeSignWebhookScope;
  state: "ACTIVE" | "INACTIVE";
  webhookSubscriptionEvents: AdobeSignWebhookEventType[];
  webhookUrlInfo: {
    url: string;
  };
  applicationName?: string;
  applicationDisplayName?: string;
  created: string;
  lastModified: string;
  resourceId?: string;
  resourceType?: AdobeSignWebhookResourceType;
  status: string;
}

export type AdobeSignWebhookEventType =
  | "AGREEMENT_CREATED"
  | "AGREEMENT_ACTION_COMPLETED"
  | "AGREEMENT_ACTION_DELEGATED"
  | "AGREEMENT_ACTION_REQUESTED"
  | "AGREEMENT_AUTO_CANCELLED_CONVERSION_PROBLEM"
  | "AGREEMENT_DOCUMENTS_DELETED"
  | "AGREEMENT_EMAIL_BOUNCED"
  | "AGREEMENT_EMAIL_VIEWED"
  | "AGREEMENT_EXPIRED"
  | "AGREEMENT_KBA_AUTHENTICATED"
  | "AGREEMENT_MODIFIED"
  | "AGREEMENT_OFFLINE_SYNC"
  | "AGREEMENT_RECALLED"
  | "AGREEMENT_REJECTED"
  | "AGREEMENT_SHARED"
  | "AGREEMENT_UPLOADED_BY_SENDER"
  | "AGREEMENT_VAULTED"
  | "AGREEMENT_WEB_IDENTITY_AUTHENTICATED"
  | "AGREEMENT_ALL";

export interface AdobeSignWebhookPayload {
  webhookId: string;
  webhookName: string;
  webhookNotificationId: string;
  webhookUrlInfo: { url: string };
  webhookScope: AdobeSignWebhookScope;
  webhookNotificationApplicableUsers: Array<{
    id: string;
    email: string;
    role: string;
    payloadApplicable: boolean;
  }>;
  event: AdobeSignWebhookEventType;
  subEvent?: string;
  eventDate: string;
  eventResourceType: AdobeSignWebhookResourceType;
  eventResourceParentType?: string;
  eventResourceParentId?: string;
  participantUserId?: string;
  participantUserEmail?: string;
  actingUserId?: string;
  actingUserEmail?: string;
  actingUserIpAddress?: string;
  agreement?: AdobeSignAgreementDetails;
}

export interface AdobeSignCreateWebhookRequest {
  name: string;
  scope: AdobeSignWebhookScope;
  state: "ACTIVE";
  webhookSubscriptionEvents: AdobeSignWebhookEventType[];
  webhookUrlInfo: {
    url: string;
  };
  resourceType?: AdobeSignWebhookResourceType;
  resourceId?: string;
}

export interface AdobeSignCreateWebhookResponse {
  id: string;
}

export interface AdobeSignWebhooksListResponse {
  userWebhookList: AdobeSignWebhookInfo[];
  page: AdobeSignPageInfo;
}
