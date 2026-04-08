// ==================== Twilio API Types ====================

// ==================== Messages ====================

export type TwilioMessageStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "undelivered"
  | "failed"
  | "receiving"
  | "received"
  | "accepted"
  | "scheduled"
  | "read"
  | "partially_delivered"
  | "canceled";

export type TwilioMessageDirection =
  | "inbound"
  | "outbound-api"
  | "outbound-call"
  | "outbound-reply";

export interface TwilioMessage {
  sid: string;
  account_sid: string;
  messaging_service_sid: string | null;
  from: string;
  to: string;
  body: string;
  status: TwilioMessageStatus;
  direction: TwilioMessageDirection;
  date_created: string;
  date_updated: string;
  date_sent: string | null;
  price: string | null;
  price_unit: string | null;
  num_segments: string;
  num_media: string;
  error_code: number | null;
  error_message: string | null;
  uri: string;
  api_version: string;
  subresource_uris: Record<string, string>;
}

export interface TwilioSendSmsParams {
  To: string;
  From: string;
  Body: string;
  StatusCallback?: string;
  MessagingServiceSid?: string;
  MediaUrl?: string[];
}

export interface TwilioMessageListParams {
  To?: string;
  From?: string;
  DateSent?: string;
  "DateSent>="?: string;
  "DateSent<="?: string;
  PageSize?: number;
  Page?: number;
}

export interface TwilioMessageListResponse {
  messages: TwilioMessage[];
  uri: string;
  first_page_uri: string;
  next_page_uri: string | null;
  previous_page_uri: string | null;
  page: number;
  page_size: number;
}

// ==================== Phone Number Lookup ====================

export interface TwilioLookupCarrier {
  mobile_country_code: string | null;
  mobile_network_code: string | null;
  name: string | null;
  type: "landline" | "mobile" | "voip" | null;
  error_code: string | null;
}

export interface TwilioLookupCallerName {
  caller_name: string | null;
  caller_type: "CONSUMER" | "BUSINESS" | null;
  error_code: string | null;
}

export interface TwilioLookupResult {
  calling_country_code: string;
  country_code: string;
  phone_number: string;
  national_format: string;
  valid: boolean;
  validation_errors: string[] | null;
  caller_name: TwilioLookupCallerName | null;
  sim_swap: { last_sim_swap: { last_sim_swap_date: string | null; swapped_period: string | null } | null } | null;
  call_forwarding: { call_forwarding_status: boolean | null } | null;
  line_status: { status: string | null; error_code: number | null } | null;
  line_type_intelligence: { type: string | null; error_code: number | null } | null;
  url: string;
}

export interface TwilioLookupParams {
  /** Fields to include: line_type_intelligence, caller_name, sim_swap, etc. */
  fields?: string;
}

// ==================== Webhook Events ====================

export interface TwilioSmsWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  NumSegments: string;
  SmsStatus: TwilioMessageStatus;
  ApiVersion: string;
  MessageStatus?: TwilioMessageStatus;
  ErrorCode?: string;
  ErrorMessage?: string;
}

export interface TwilioStatusCallbackPayload {
  MessageSid: string;
  MessageStatus: TwilioMessageStatus;
  AccountSid: string;
  From: string;
  To: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

// ==================== Client Config ====================

export interface TwilioClientConfig {
  /** Twilio Account SID */
  accountSid: string;
  /** Twilio Auth Token */
  authToken: string;
  /** Request timeout in ms */
  timeout?: number;
}
