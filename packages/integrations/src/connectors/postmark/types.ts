// ==================== Postmark Types ====================

// ==================== Send Email ====================

export interface PostmarkEmailAddress {
  Email: string;
  Name?: string;
  Full?: string;
}

export interface PostmarkAttachment {
  Name: string;
  Content: string; // base64-encoded
  ContentType: string;
  ContentID?: string;
}

export interface PostmarkHeader {
  Name: string;
  Value: string;
}

export interface PostmarkSendEmailRequest {
  From: string;
  To: string;
  Cc?: string;
  Bcc?: string;
  Subject: string;
  Tag?: string;
  HtmlBody?: string;
  TextBody?: string;
  ReplyTo?: string;
  Headers?: PostmarkHeader[];
  TrackOpens?: boolean;
  TrackLinks?: "None" | "HtmlAndText" | "HtmlOnly" | "TextOnly";
  Metadata?: Record<string, string>;
  Attachments?: PostmarkAttachment[];
  MessageStream?: string;
}

export interface PostmarkSendEmailResponse {
  To: string;
  SubmittedAt: string;
  MessageID: string;
  ErrorCode: number;
  Message: string;
}

export interface PostmarkSendBatchEmailRequest {
  Messages: PostmarkSendEmailRequest[];
}

export interface PostmarkSendBatchEmailResponse {
  results: PostmarkSendEmailResponse[];
}

// ==================== Send with Template ====================

export interface PostmarkSendTemplateEmailRequest {
  TemplateId?: number;
  TemplateAlias?: string;
  TemplateModel: Record<string, unknown>;
  InlineCss?: boolean;
  From: string;
  To: string;
  Cc?: string;
  Bcc?: string;
  Tag?: string;
  ReplyTo?: string;
  Headers?: PostmarkHeader[];
  TrackOpens?: boolean;
  TrackLinks?: "None" | "HtmlAndText" | "HtmlOnly" | "TextOnly";
  Metadata?: Record<string, string>;
  Attachments?: PostmarkAttachment[];
  MessageStream?: string;
}

export interface PostmarkSendTemplateEmailResponse {
  To: string;
  SubmittedAt: string;
  MessageID: string;
  ErrorCode: number;
  Message: string;
}

// ==================== Templates ====================

export interface PostmarkTemplate {
  TemplateId: number;
  Name: string;
  Subject: string;
  HtmlBody: string;
  TextBody: string;
  AssociatedServerId: number;
  Active: boolean;
  Alias?: string;
  TemplateType: "Standard" | "Layout";
  LayoutTemplate?: string;
}

export interface PostmarkListTemplatesResponse {
  TotalCount: number;
  Templates: Array<{
    TemplateId: number;
    Name: string;
    Subject: string;
    Active: boolean;
    Alias?: string;
    TemplateType: "Standard" | "Layout";
    LayoutTemplate?: string;
  }>;
}

export interface PostmarkCreateTemplateRequest {
  Name: string;
  Subject: string;
  HtmlBody?: string;
  TextBody?: string;
  Alias?: string;
  TemplateType?: "Standard" | "Layout";
  LayoutTemplate?: string;
}

export interface PostmarkUpdateTemplateRequest {
  Name?: string;
  Subject?: string;
  HtmlBody?: string;
  TextBody?: string;
  Alias?: string;
  LayoutTemplate?: string;
}

export interface PostmarkValidateTemplateRequest {
  Subject: string;
  HtmlBody?: string;
  TextBody?: string;
  TestRenderModel?: Record<string, unknown>;
  InlineCssForHtmlTestRender?: boolean;
  TemplateType?: "Standard" | "Layout";
  LayoutTemplate?: string;
}

export interface PostmarkValidateTemplateResponse {
  AllContentIsValid: boolean;
  HtmlBody: { ContentIsValid: boolean; ValidationErrors: Array<{ Message: string; Line: number; CharacterPosition: number }> };
  TextBody: { ContentIsValid: boolean; ValidationErrors: Array<{ Message: string; Line: number; CharacterPosition: number }> };
  Subject: { ContentIsValid: boolean; ValidationErrors: Array<{ Message: string; Line: number; CharacterPosition: number }> };
  SuggestedTemplateModel: Record<string, unknown>;
}

// ==================== Bounce Management ====================

export interface PostmarkBounce {
  ID: number;
  Type: string;
  TypeCode: number;
  Name: string;
  Tag?: string;
  MessageID: string;
  ServerID: number;
  MessageStream: string;
  Description: string;
  Details: string;
  Email: string;
  From: string;
  BouncedAt: string;
  DumpAvailable: boolean;
  Inactive: boolean;
  CanActivate: boolean;
  Subject: string;
  Content?: string;
}

export interface PostmarkBouncesResponse {
  TotalCount: number;
  Bounces: PostmarkBounce[];
}

export interface PostmarkBounceDump {
  Body: string;
}

export interface PostmarkDeliveryStats {
  InactiveMails: number;
  Bounces: Array<{
    Name: string;
    Count: number;
    Type?: string;
  }>;
}

// ==================== Stats ====================

export interface PostmarkOutboundStats {
  Sent: number;
  Bounced: number;
  SMTPApiErrors: number;
  BounceRate: number;
  SpamComplaints: number;
  SpamComplaintsRate: number;
  Opens: number;
  UniqueOpens: number;
  Tracked: number;
  WithClientRecorded: number;
  WithPlatformRecorded: number;
  WithReadTimeRecorded: number;
  TotalClicks: number;
  UniqueLinksClicked: number;
  TotalTrackedLinksSent: number;
  WithLinkTracking: number;
}

export interface PostmarkStatsDays {
  Days: Array<{
    Date: string;
    Sent: number;
    Bounced?: number;
    Opens?: number;
    UniqueOpens?: number;
    Clicks?: number;
    UniqueLinksClicked?: number;
    SpamComplaints?: number;
  }>;
}

export interface PostmarkStatsParams {
  tag?: string;
  fromdate?: string; // YYYY-MM-DD
  todate?: string;
  messagestream?: string;
}

// ==================== Webhook Events ====================

export type PostmarkWebhookType =
  | "Bounce"
  | "Delivery"
  | "Open"
  | "Click"
  | "SpamComplaint"
  | "SubscriptionChange";

export interface PostmarkWebhookBounce {
  RecordType: "Bounce";
  ID: number;
  Type: string;
  TypeCode: number;
  Name: string;
  Tag?: string;
  MessageID: string;
  ServerID: number;
  MessageStream: string;
  Description: string;
  Details: string;
  Email: string;
  From: string;
  BouncedAt: string;
  DumpAvailable: boolean;
  Inactive: boolean;
  CanActivate: boolean;
  Subject: string;
  Metadata?: Record<string, string>;
}

export interface PostmarkWebhookDelivery {
  RecordType: "Delivery";
  ServerID: number;
  MessageID: string;
  Recipient: string;
  Tag?: string;
  DeliveredAt: string;
  Details: string;
  MessageStream: string;
  Metadata?: Record<string, string>;
}

export interface PostmarkWebhookOpen {
  RecordType: "Open";
  FirstOpen: boolean;
  Client: { Name: string; Company: string; Family: string };
  OS: { Name: string; Company: string; Family: string };
  Platform: string;
  UserAgent: string;
  ReadSeconds: number;
  Geo: { CountryISOCode: string; Country: string; RegionISOCode: string; Region: string; City: string; Zip: string; Coords: string; IP: string };
  MessageID: string;
  MessageStream: string;
  ReceivedAt: string;
  Tag?: string;
  Recipient: string;
  Metadata?: Record<string, string>;
}

export interface PostmarkWebhookClick {
  RecordType: "Click";
  ClickLocation: string;
  Client: { Name: string; Company: string; Family: string };
  OS: { Name: string; Company: string; Family: string };
  Platform: string;
  UserAgent: string;
  OriginalLink: string;
  Geo: { CountryISOCode: string; Country: string; RegionISOCode: string; Region: string; City: string; Zip: string; Coords: string; IP: string };
  MessageID: string;
  MessageStream: string;
  ReceivedAt: string;
  Tag?: string;
  Recipient: string;
  Metadata?: Record<string, string>;
}

export type PostmarkWebhookEvent =
  | PostmarkWebhookBounce
  | PostmarkWebhookDelivery
  | PostmarkWebhookOpen
  | PostmarkWebhookClick;

// ==================== Client Config ====================

export interface PostmarkClientConfig {
  serverToken: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}
