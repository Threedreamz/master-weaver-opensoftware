// ==================== Microsoft Graph API Types ====================

// ==================== Common ====================

export interface GraphListResponse<T> {
  "@odata.context"?: string;
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
  value: T[];
}

export interface GraphListParams {
  $top?: number;
  $skip?: number;
  $select?: string;
  $filter?: string;
  $orderby?: string;
  $search?: string;
  $expand?: string;
}

// ==================== Mail ====================

export interface GraphEmailAddress {
  name: string;
  address: string;
}

export interface GraphRecipient {
  emailAddress: GraphEmailAddress;
}

export interface GraphItemBody {
  contentType: "text" | "html";
  content: string;
}

export interface GraphMessage {
  id: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  receivedDateTime: string;
  sentDateTime: string | null;
  hasAttachments: boolean;
  internetMessageId: string;
  subject: string;
  bodyPreview: string;
  importance: "low" | "normal" | "high";
  parentFolderId: string;
  conversationId: string;
  conversationIndex: string;
  isDeliveryReceiptRequested: boolean;
  isReadReceiptRequested: boolean;
  isRead: boolean;
  isDraft: boolean;
  webLink: string;
  inferenceClassification: "focused" | "other";
  body: GraphItemBody;
  sender: GraphRecipient;
  from: GraphRecipient;
  toRecipients: GraphRecipient[];
  ccRecipients: GraphRecipient[];
  bccRecipients: GraphRecipient[];
  replyTo: GraphRecipient[];
  flag: { flagStatus: "notFlagged" | "flagged" | "complete" };
  categories: string[];
}

export interface GraphSendMailParams {
  message: {
    subject: string;
    body: GraphItemBody;
    toRecipients: GraphRecipient[];
    ccRecipients?: GraphRecipient[];
    bccRecipients?: GraphRecipient[];
    replyTo?: GraphRecipient[];
    importance?: "low" | "normal" | "high";
    attachments?: GraphAttachment[];
  };
  saveToSentItems?: boolean;
}

export interface GraphAttachment {
  "@odata.type": "#microsoft.graph.fileAttachment";
  name: string;
  contentType: string;
  contentBytes: string; // base64
  size?: number;
}

export interface GraphMessageListParams extends GraphListParams {
  includeHiddenMessages?: boolean;
}

// ==================== Calendar ====================

export interface GraphDateTimeTimeZone {
  dateTime: string;
  timeZone: string;
}

export interface GraphLocation {
  displayName: string;
  locationType?: "default" | "conferenceRoom" | "homeAddress" | "businessAddress" | "geoCoordinates" | "streetAddress" | "hotel" | "restaurant" | "localBusiness" | "postalAddress";
  address?: {
    street: string;
    city: string;
    state: string;
    countryOrRegion: string;
    postalCode: string;
  };
}

export interface GraphCalendar {
  id: string;
  name: string;
  color: string;
  changeKey: string;
  canShare: boolean;
  canViewPrivateItems: boolean;
  canEdit: boolean;
  owner: GraphEmailAddress;
  isDefaultCalendar: boolean;
  isRemovable: boolean;
  allowedOnlineMeetingProviders: string[];
  defaultOnlineMeetingProvider: string;
}

export interface GraphEvent {
  id: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  subject: string;
  bodyPreview: string;
  body: GraphItemBody;
  importance: "low" | "normal" | "high";
  sensitivity: "normal" | "personal" | "private" | "confidential";
  start: GraphDateTimeTimeZone;
  end: GraphDateTimeTimeZone;
  location: GraphLocation;
  locations: GraphLocation[];
  isAllDay: boolean;
  isCancelled: boolean;
  isOrganizer: boolean;
  recurrence: unknown | null;
  responseRequested: boolean;
  showAs: "free" | "tentative" | "busy" | "oof" | "workingElsewhere" | "unknown";
  type: "singleInstance" | "occurrence" | "exception" | "seriesMaster";
  webLink: string;
  onlineMeetingUrl: string | null;
  attendees: Array<{
    emailAddress: GraphEmailAddress;
    status: { response: "none" | "organizer" | "tentativelyAccepted" | "accepted" | "declined" | "notResponded"; time: string };
    type: "required" | "optional" | "resource";
  }>;
  organizer: GraphRecipient;
  categories: string[];
}

export interface GraphCreateEventParams {
  subject: string;
  body?: GraphItemBody;
  start: GraphDateTimeTimeZone;
  end: GraphDateTimeTimeZone;
  location?: GraphLocation;
  attendees?: Array<{
    emailAddress: GraphEmailAddress;
    type?: "required" | "optional" | "resource";
  }>;
  isAllDay?: boolean;
  importance?: "low" | "normal" | "high";
  showAs?: "free" | "tentative" | "busy" | "oof" | "workingElsewhere" | "unknown";
  recurrence?: unknown;
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
}

// ==================== Users ====================

export interface GraphUser {
  id: string;
  displayName: string;
  givenName: string | null;
  surname: string | null;
  mail: string | null;
  userPrincipalName: string;
  jobTitle: string | null;
  mobilePhone: string | null;
  officeLocation: string | null;
  businessPhones: string[];
  department: string | null;
  companyName: string | null;
  accountEnabled: boolean;
}

// ==================== Subscriptions (Webhooks) ====================

export interface GraphSubscription {
  id: string;
  resource: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  expirationDateTime: string;
  applicationId: string;
  creatorId: string;
}

export interface GraphCreateSubscriptionParams {
  changeType: "created" | "updated" | "deleted" | string;
  notificationUrl: string;
  resource: string;
  expirationDateTime: string;
  clientState?: string;
}

export interface GraphWebhookNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  changeType: "created" | "updated" | "deleted";
  resource: string;
  resourceData: {
    "@odata.type": string;
    "@odata.id": string;
    "@odata.etag": string;
    id: string;
  };
  clientState: string;
  tenantId: string;
}

export interface GraphWebhookPayload {
  value: GraphWebhookNotification[];
}

export interface GraphValidationPayload {
  validationToken: string;
}

// ==================== Client Config ====================

export interface MicrosoftGraphClientConfig {
  /** OAuth2 access token */
  accessToken: string;
  /** OAuth2 refresh token */
  refreshToken?: string;
  /** Azure AD client ID */
  clientId?: string;
  /** Azure AD client secret */
  clientSecret?: string;
  /** Azure AD tenant ID */
  tenantId?: string;
  /** Request timeout in ms */
  timeout?: number;
}
