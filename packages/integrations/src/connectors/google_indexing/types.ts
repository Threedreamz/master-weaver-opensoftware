/**
 * Google Indexing API types.
 * @see https://developers.google.com/search/apis/indexing-api/v3/reference
 */

export type UrlNotificationType = "URL_UPDATED" | "URL_DELETED";

// ── Publish URL Notification ──────────────────────────────────────

export interface PublishUrlNotificationRequest {
  url: string;
  type: UrlNotificationType;
}

export interface PublishUrlNotificationResponse {
  urlNotificationMetadata: UrlNotificationMetadata;
}

// ── Get Notification Status ───────────────────────────────────────

export interface UrlNotificationMetadata {
  url: string;
  latestUpdate?: {
    url: string;
    type: UrlNotificationType;
    notifyTime: string;
  };
  latestRemove?: {
    url: string;
    type: UrlNotificationType;
    notifyTime: string;
  };
}

// ── Batch Request ─────────────────────────────────────────────────

export interface BatchUrlNotificationRequest {
  urls: Array<{
    url: string;
    type: UrlNotificationType;
  }>;
}

export interface BatchUrlNotificationResponse {
  results: Array<{
    url: string;
    type: UrlNotificationType;
    notifyTime?: string;
    error?: {
      code: number;
      message: string;
      status: string;
    };
  }>;
}

// ── Service Account Auth ──────────────────────────────────────────

export interface ServiceAccountCredentials {
  type: "service_account";
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface JwtClaims {
  iss: string;
  scope: string;
  aud: string;
  exp: number;
  iat: number;
}
