// ==================== DocuSign eSignature REST API Types ====================

/** OAuth2 grant type for DocuSign authentication */
export type DocuSignAuthGrantType = "authorization_code" | "jwt_bearer";

/** Envelope status in DocuSign */
export type DocuSignEnvelopeStatus =
  | "created"
  | "sent"
  | "delivered"
  | "completed"
  | "declined"
  | "voided"
  | "deleted"
  | "timedout"
  | "processing"
  | "signed";

/** Recipient type */
export type DocuSignRecipientType =
  | "signer"
  | "cc"
  | "certifiedDelivery"
  | "inPersonSigner"
  | "agent"
  | "editor"
  | "intermediary"
  | "witness";

/** Recipient status */
export type DocuSignRecipientStatus =
  | "created"
  | "sent"
  | "delivered"
  | "signed"
  | "declined"
  | "completed"
  | "faxpending"
  | "autoresponded";

/** Tab (field) type for signing */
export type DocuSignTabType =
  | "signHere"
  | "initialHere"
  | "dateSignedTabs"
  | "textTabs"
  | "checkboxTabs"
  | "radioGroupTabs"
  | "listTabs"
  | "noteTabs"
  | "fullNameTabs"
  | "emailTabs"
  | "titleTabs"
  | "companyTabs";

// ==================== Client Configuration ====================

export interface DocuSignClientConfig {
  /** DocuSign integration key (client ID) */
  integrationKey: string;
  /** DocuSign secret key (client secret) */
  secretKey: string;
  /** OAuth2 access token */
  accessToken: string;
  /** OAuth2 refresh token (for auth code grant) */
  refreshToken?: string;
  /** DocuSign account ID */
  accountId: string;
  /** Base URL — defaults to EU production */
  baseUrl?: string;
  /** Use demo environment */
  useSandbox?: boolean;
  /** RSA private key for JWT grant */
  rsaPrivateKey?: string;
  /** User ID for JWT impersonation */
  userId?: string;
}

// ==================== Envelopes ====================

export interface DocuSignEnvelope {
  envelopeId: string;
  status: DocuSignEnvelopeStatus;
  statusChangedDateTime: string;
  emailSubject: string;
  emailBlurb?: string;
  sentDateTime?: string;
  deliveredDateTime?: string;
  completedDateTime?: string;
  declinedDateTime?: string;
  voidedDateTime?: string;
  voidedReason?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  expireEnabled: boolean;
  expireDateTime?: string;
  expireAfter?: string;
  sender: DocuSignSender;
  recipients?: DocuSignRecipients;
  documentsUri?: string;
  recipientsUri?: string;
  envelopeUri?: string;
  customFields?: DocuSignCustomFields;
}

export interface DocuSignSender {
  userName: string;
  userId: string;
  accountId: string;
  email: string;
}

export interface DocuSignRecipients {
  signers: DocuSignSigner[];
  carbonCopies?: DocuSignCarbonCopy[];
  certifiedDeliveries?: DocuSignCertifiedDelivery[];
  inPersonSigners?: DocuSignInPersonSigner[];
  recipientCount: string;
}

export interface DocuSignSigner {
  recipientId: string;
  recipientIdGuid?: string;
  name: string;
  email: string;
  routingOrder: string;
  status: DocuSignRecipientStatus;
  signedDateTime?: string;
  deliveredDateTime?: string;
  declinedDateTime?: string;
  declinedReason?: string;
  tabs?: DocuSignTabs;
  clientUserId?: string;
  embeddedRecipientStartURL?: string;
}

export interface DocuSignCarbonCopy {
  recipientId: string;
  name: string;
  email: string;
  routingOrder: string;
  status: DocuSignRecipientStatus;
}

export interface DocuSignCertifiedDelivery {
  recipientId: string;
  name: string;
  email: string;
  routingOrder: string;
  status: DocuSignRecipientStatus;
}

export interface DocuSignInPersonSigner {
  recipientId: string;
  hostName: string;
  hostEmail: string;
  signerName: string;
  signerEmail?: string;
  routingOrder: string;
  status: DocuSignRecipientStatus;
  tabs?: DocuSignTabs;
}

// ==================== Tabs ====================

export interface DocuSignTabs {
  signHereTabs?: DocuSignSignHereTab[];
  initialHereTabs?: DocuSignInitialHereTab[];
  dateSignedTabs?: DocuSignDateSignedTab[];
  textTabs?: DocuSignTextTab[];
  checkboxTabs?: DocuSignCheckboxTab[];
  fullNameTabs?: DocuSignFullNameTab[];
}

export interface DocuSignTabBase {
  documentId: string;
  pageNumber: string;
  xPosition: string;
  yPosition: string;
  tabLabel?: string;
  anchorString?: string;
  anchorXOffset?: string;
  anchorYOffset?: string;
  anchorUnits?: string;
}

export interface DocuSignSignHereTab extends DocuSignTabBase {
  scaleValue?: string;
}

export interface DocuSignInitialHereTab extends DocuSignTabBase {
  scaleValue?: string;
}

export interface DocuSignDateSignedTab extends DocuSignTabBase {}
export interface DocuSignFullNameTab extends DocuSignTabBase {}

export interface DocuSignTextTab extends DocuSignTabBase {
  value?: string;
  required?: string;
  locked?: string;
  maxLength?: string;
  width?: string;
  height?: string;
}

export interface DocuSignCheckboxTab extends DocuSignTabBase {
  selected?: string;
  required?: string;
  locked?: string;
}

// ==================== Custom Fields ====================

export interface DocuSignCustomFields {
  textCustomFields?: DocuSignTextCustomField[];
  listCustomFields?: DocuSignListCustomField[];
}

export interface DocuSignTextCustomField {
  fieldId?: string;
  name: string;
  value: string;
  required?: string;
  show?: string;
}

export interface DocuSignListCustomField {
  fieldId?: string;
  name: string;
  value: string;
  listItems: string[];
  required?: string;
  show?: string;
}

// ==================== Documents ====================

export interface DocuSignDocument {
  documentId: string;
  name: string;
  uri: string;
  order: string;
  pages?: DocuSignPage[];
  type?: string;
  fileExtension?: string;
  containsPdfFormFields?: string;
}

export interface DocuSignPage {
  pageId: string;
  sequence: string;
  height: string;
  width: string;
  dpi: string;
}

export interface DocuSignDocumentsResponse {
  envelopeId: string;
  envelopeDocuments: DocuSignDocument[];
}

// ==================== Templates ====================

export interface DocuSignTemplate {
  templateId: string;
  name: string;
  description?: string;
  shared: string;
  created: string;
  lastModified: string;
  uri: string;
  folderId?: string;
  folderName?: string;
  owner: DocuSignTemplateOwner;
  emailSubject?: string;
  emailBlurb?: string;
}

export interface DocuSignTemplateOwner {
  userName: string;
  userId: string;
  email: string;
}

export interface DocuSignTemplatesResponse {
  envelopeTemplates: DocuSignTemplate[];
  resultSetSize: string;
  totalSetSize: string;
  startPosition: string;
  endPosition: string;
}

// ==================== Signing URL ====================

export interface DocuSignRecipientViewRequest {
  returnUrl: string;
  authenticationMethod: "none" | "phone" | "password" | "knowledge" | "email";
  email: string;
  userName: string;
  clientUserId: string;
  pingUrl?: string;
  pingFrequency?: string;
}

export interface DocuSignRecipientViewResponse {
  url: string;
}

// ==================== Create Envelope Request ====================

export interface DocuSignCreateEnvelopeRequest {
  emailSubject: string;
  emailBlurb?: string;
  status: "created" | "sent";
  recipients: {
    signers?: Array<{
      recipientId: string;
      name: string;
      email: string;
      routingOrder?: string;
      clientUserId?: string;
      tabs?: DocuSignTabs;
    }>;
    carbonCopies?: Array<{
      recipientId: string;
      name: string;
      email: string;
      routingOrder?: string;
    }>;
  };
  documents?: Array<{
    documentId: string;
    name: string;
    fileExtension: string;
    documentBase64: string;
  }>;
  templateId?: string;
  templateRoles?: Array<{
    roleName: string;
    name: string;
    email: string;
    clientUserId?: string;
    tabs?: DocuSignTabs;
  }>;
  customFields?: DocuSignCustomFields;
  expireEnabled?: string;
  expireAfter?: string;
  expireWarn?: string;
  notification?: DocuSignNotification;
}

export interface DocuSignNotification {
  useAccountDefaults?: string;
  reminders?: {
    reminderEnabled: string;
    reminderDelay: string;
    reminderFrequency: string;
  };
  expirations?: {
    expireEnabled: string;
    expireAfter: string;
    expireWarn: string;
  };
}

export interface DocuSignCreateEnvelopeResponse {
  envelopeId: string;
  uri: string;
  statusDateTime: string;
  status: DocuSignEnvelopeStatus;
}

// ==================== Envelope List ====================

export interface DocuSignEnvelopesListParams {
  fromDate: string;
  toDate?: string;
  status?: DocuSignEnvelopeStatus;
  fromToStatus?: string;
  count?: string;
  startPosition?: string;
  searchText?: string;
  include?: string;
  order?: "asc" | "desc";
  orderBy?: "created" | "last_modified" | "sent" | "status_changed";
}

export interface DocuSignEnvelopesListResponse {
  envelopes: DocuSignEnvelope[];
  resultSetSize: string;
  totalSetSize: string;
  startPosition: string;
  endPosition: string;
  nextUri?: string;
  previousUri?: string;
}

// ==================== Webhook (DocuSign Connect) ====================

export interface DocuSignConnectEvent {
  event: string;
  apiVersion: string;
  uri: string;
  retryCount: number;
  configurationId: number;
  generatedDateTime: string;
  data: {
    accountId: string;
    userId: string;
    envelopeId: string;
    envelopeSummary: DocuSignEnvelope;
  };
}

export type DocuSignWebhookEventType =
  | "envelope-sent"
  | "envelope-delivered"
  | "envelope-completed"
  | "envelope-declined"
  | "envelope-voided"
  | "envelope-resent"
  | "envelope-corrected"
  | "envelope-purge"
  | "envelope-deleted"
  | "envelope-discard"
  | "recipient-sent"
  | "recipient-autoresponded"
  | "recipient-delivered"
  | "recipient-completed"
  | "recipient-declined"
  | "recipient-authenticationfailed"
  | "recipient-resent"
  | "recipient-finish-later";

export interface DocuSignConnectConfig {
  name: string;
  urlToPublishTo: string;
  allUsers: string;
  allowEnvelopePublish: string;
  includeDocumentFields: string;
  includeSenderAccountasCustomField: string;
  envelopeEvents: DocuSignWebhookEventType[];
  recipientEvents: DocuSignWebhookEventType[];
  requiresAcknowledgement: string;
  includeTimeZoneInformation: string;
  useSoapInterface: string;
  includeHMAC: string;
}

export interface DocuSignConnectConfigResponse {
  connectId: string;
  configurationType: string;
  urlToPublishTo: string;
  name: string;
}

export interface DocuSignConnectListResponse {
  configurations: DocuSignConnectConfigResponse[];
  totalRecords: string;
}
