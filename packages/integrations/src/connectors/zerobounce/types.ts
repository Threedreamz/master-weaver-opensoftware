// ==================== ZeroBounce API Types ====================

// ==================== Email Validation ====================

export type ZeroBounceStatus =
  | "valid"
  | "invalid"
  | "catch-all"
  | "unknown"
  | "spamtrap"
  | "abuse"
  | "do_not_mail";

export type ZeroBounceSubStatus =
  | "antispam_system"
  | "greylisted"
  | "mail_server_temporary_error"
  | "forcible_disconnect"
  | "mail_server_did_not_respond"
  | "timeout_exceeded"
  | "failed_smtp_connection"
  | "mailbox_quota_exceeded"
  | "exception_occurred"
  | "possible_trap"
  | "role_based"
  | "global_suppression"
  | "mailbox_not_found"
  | "no_dns_entries"
  | "failed_syntax_check"
  | "possible_typo"
  | "unroutable_ip_address"
  | "leading_period_removed"
  | "does_not_accept_mail"
  | "alias_address"
  | "role_based_catch_all"
  | "disposable"
  | "toxic"
  | "";

export interface ZeroBounceValidateResponse {
  address: string;
  status: ZeroBounceStatus;
  sub_status: ZeroBounceSubStatus;
  free_email: boolean;
  did_you_mean: string | null;
  account: string | null;
  domain: string | null;
  domain_age_days: string | null;
  smtp_provider: string | null;
  mx_found: string;
  mx_record: string | null;
  firstname: string | null;
  lastname: string | null;
  gender: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  zipcode: string | null;
  processed_at: string;
}

// ==================== Batch Validation ====================

export interface ZeroBounceEmailEntry {
  email_address: string;
  ip_address?: string;
}

export interface ZeroBounceFileSendResponse {
  success: boolean;
  message: string;
  file_name: string;
  file_id: string;
}

export interface ZeroBounceFileStatusResponse {
  success: boolean;
  file_id: string;
  file_name: string;
  upload_date: string;
  file_status: string;
  complete_percentage: string;
  error_reason: string | null;
  return_url: string | null;
}

export interface ZeroBounceFileResultsResponse {
  local_filepath: string;
  file_name: string;
}

export interface ZeroBounceDeleteFileResponse {
  success: boolean;
  message: string;
  file_name: string;
  file_id: string;
}

// ==================== Batch Validate (inline) ====================

export interface ZeroBounceInlineBatchRequest {
  email_batch: ZeroBounceEmailEntry[];
}

export interface ZeroBounceInlineBatchResponse {
  email_batch: ZeroBounceValidateResponse[];
  errors: Array<{
    email_address: string;
    error: string;
  }>;
}

// ==================== Credits ====================

export interface ZeroBounceCreditsResponse {
  Credits: string;
}

// ==================== API Usage ====================

export interface ZeroBounceApiUsageParams {
  start_date: string;
  end_date: string;
}

export interface ZeroBounceApiUsageResponse {
  total: number;
  status_valid: number;
  status_invalid: number;
  status_catch_all: number;
  status_do_not_mail: number;
  status_spamtrap: number;
  status_unknown: number;
  sub_status_toxic: number;
  sub_status_disposable: number;
  sub_status_role_based: number;
  sub_status_possible_trap: number;
  sub_status_global_suppression: number;
  sub_status_timeout_exceeded: number;
  sub_status_mail_server_temporary_error: number;
  sub_status_mail_server_did_not_respond: number;
  sub_status_greylisted: number;
  sub_status_antispam_system: number;
  sub_status_does_not_accept_mail: number;
  sub_status_exception_occurred: number;
  sub_status_failed_syntax_check: number;
  sub_status_mailbox_not_found: number;
  sub_status_unroutable_ip_address: number;
  sub_status_possible_typo: number;
  sub_status_no_dns_entries: number;
  sub_status_role_based_catch_all: number;
  sub_status_mailbox_quota_exceeded: number;
  sub_status_forcible_disconnect: number;
  sub_status_failed_smtp_connection: number;
  start_date: string;
  end_date: string;
}

// ==================== Client Config ====================

export interface ZeroBounceClientConfig {
  /** ZeroBounce API key (passed as query parameter) */
  apiKey: string;
  /** Request timeout in ms */
  timeout?: number;
}
