// ==================== AWS SES Types ====================

/** Email destination addresses */
export interface SESDestination {
  ToAddresses?: string[];
  CcAddresses?: string[];
  BccAddresses?: string[];
}

/** Email content for a simple message */
export interface SESContent {
  Data: string;
  Charset?: string;
}

/** Body of an email (text and/or html) */
export interface SESBody {
  Text?: SESContent;
  Html?: SESContent;
}

/** Email message structure */
export interface SESMessage {
  Subject: SESContent;
  Body: SESBody;
}

/** Tag applied to an email for tracking */
export interface SESMessageTag {
  Name: string;
  Value: string;
}

// ==================== SendEmail ====================

export interface SESSendEmailRequest {
  Source: string;
  Destination: SESDestination;
  Message: SESMessage;
  ReplyToAddresses?: string[];
  ReturnPath?: string;
  SourceArn?: string;
  ReturnPathArn?: string;
  Tags?: SESMessageTag[];
  ConfigurationSetName?: string;
}

export interface SESSendEmailResponse {
  MessageId: string;
}

// ==================== SendRawEmail ====================

export interface SESSendRawEmailRequest {
  RawMessage: {
    Data: string; // base64-encoded MIME message
  };
  Source?: string;
  Destinations?: string[];
  FromArn?: string;
  SourceArn?: string;
  ReturnPathArn?: string;
  Tags?: SESMessageTag[];
  ConfigurationSetName?: string;
}

export interface SESSendRawEmailResponse {
  MessageId: string;
}

// ==================== SendTemplatedEmail ====================

export interface SESSendTemplatedEmailRequest {
  Source: string;
  Destination: SESDestination;
  Template: string;
  TemplateData: string; // JSON string of template variables
  ReplyToAddresses?: string[];
  ReturnPath?: string;
  SourceArn?: string;
  ReturnPathArn?: string;
  Tags?: SESMessageTag[];
  ConfigurationSetName?: string;
}

export interface SESSendTemplatedEmailResponse {
  MessageId: string;
}

// ==================== SendBulkTemplatedEmail ====================

export interface SESBulkEmailDestination {
  Destination: SESDestination;
  ReplacementTags?: SESMessageTag[];
  ReplacementTemplateData?: string;
}

export interface SESSendBulkTemplatedEmailRequest {
  Source: string;
  Template: string;
  DefaultTemplateData?: string;
  Destinations: SESBulkEmailDestination[];
  ReplyToAddresses?: string[];
  ReturnPath?: string;
  SourceArn?: string;
  ReturnPathArn?: string;
  DefaultTags?: SESMessageTag[];
  ConfigurationSetName?: string;
}

export interface SESBulkEmailStatus {
  Status: "Success" | "MessageRejected" | "MailFromDomainNotVerified" | "ConfigurationSetDoesNotExist" | "TemplateDoesNotExist" | "AccountSuspended" | "AccountThrottled" | "AccountDailyQuotaExceeded" | "InvalidSendingPoolName" | "AccountSendingPaused" | "ConfigurationSetSendingPaused" | "InvalidParameterValue" | "TransientFailure" | "Failed";
  Error?: string;
  MessageId?: string;
}

export interface SESSendBulkTemplatedEmailResponse {
  Status: SESBulkEmailStatus[];
}

// ==================== GetSendStatistics ====================

export interface SESSendDataPoint {
  Timestamp: string;
  DeliveryAttempts: number;
  Bounces: number;
  Complaints: number;
  Rejects: number;
}

export interface SESGetSendStatisticsResponse {
  SendDataPoints: SESSendDataPoint[];
}

// ==================== GetSendQuota ====================

export interface SESGetSendQuotaResponse {
  Max24HourSend: number;
  MaxSendRate: number;
  SentLast24Hours: number;
}

// ==================== Identity Verification ====================

export interface SESVerifyEmailIdentityRequest {
  EmailAddress: string;
}

export interface SESListIdentitiesResponse {
  Identities: string[];
  NextToken?: string;
}

export interface SESGetIdentityVerificationAttributesResponse {
  VerificationAttributes: Record<
    string,
    { VerificationStatus: "Pending" | "Success" | "Failed" | "TemporaryFailure" | "NotStarted"; VerificationToken?: string }
  >;
}

// ==================== Client Config ====================

export interface AWSSESClientConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  /** Optional session token for temporary credentials */
  sessionToken?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}
