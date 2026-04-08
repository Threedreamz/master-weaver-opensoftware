// ==================== Integration Core Types ====================

/** Authentication method used by an integration */
export type AuthType = "api_key" | "oauth2" | "basic_auth" | "custom" | "none";

/** Current status of an integration connection */
export type ConnectionStatus = "active" | "disconnected" | "error" | "pending";

/** Direction of a sync event */
export type SyncDirection = "inbound" | "outbound" | "bidirectional";

/** Event types for integration audit log */
export type IntegrationEventType = "sync" | "webhook" | "error" | "auth_refresh" | "import" | "export";

/** Which app an integration belongs to */
export type IntegrationApp =
  | "openaccounting"
  | "openmailer"
  | "openlawyer"
  | "opensem"
  | "openflow"
  | "openinventory"
  | "openpayroll";

/** Category of integration for UI grouping */
export type IntegrationCategory =
  | "payment"
  | "banking"
  | "tax"
  | "invoicing"
  | "erp"
  | "ocr"
  | "ai"
  | "email_delivery"
  | "email_marketing"
  | "crm"
  | "seo"
  | "analytics"
  | "legal"
  | "compliance"
  | "esignature"
  | "shipping"
  | "marketplace"
  | "ecommerce"
  | "hr"
  | "payroll"
  | "automation"
  | "productivity"
  | "communication";

// ==================== Configuration ====================

export interface IntegrationDefinition {
  /** Unique identifier (e.g., "stripe", "paypal") */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Which apps can use this integration */
  apps: IntegrationApp[];
  /** UI category */
  category: IntegrationCategory;
  /** Authentication type */
  authType: AuthType;
  /** Whether this integration supports webhooks */
  webhooks: boolean;
  /** Rate limit in requests per minute */
  rateLimitRPM: number;
  /** Required environment variables */
  requiredEnvVars: string[];
  /** Optional environment variables */
  optionalEnvVars?: string[];
  /** Base URL for API calls */
  baseUrl: string;
  /** Documentation URL */
  docsUrl: string;
  /** Icon identifier for UI */
  icon: string;
  /** OAuth2 scopes (if authType is oauth2) */
  oauthScopes?: string[];
  /** OAuth2 authorization URL */
  oauthAuthUrl?: string;
  /** OAuth2 token URL */
  oauthTokenUrl?: string;
}

// ==================== Connection ====================

export interface IntegrationConnection {
  id: string;
  appName: IntegrationApp;
  serviceName: string;
  workspaceId?: string;
  credentials: string; // encrypted JSON
  authType: AuthType;
  status: ConnectionStatus;
  lastSyncAt?: Date;
  lastErrorAt?: Date;
  lastErrorMessage?: string;
  config?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== HTTP Client ====================

export interface RequestConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  burstSize?: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeMs: number;
}

export interface BaseClientConfig {
  baseUrl: string;
  authType: AuthType;
  credentials: Record<string, string>;
  retry?: RetryConfig;
  rateLimit?: RateLimitConfig;
  circuitBreaker?: CircuitBreakerConfig;
  timeout?: number;
  defaultHeaders?: Record<string, string>;
}

// ==================== Webhook ====================

export interface WebhookEvent {
  id: string;
  provider: string;
  eventType: string;
  payload: unknown;
  signature?: string;
  receivedAt: Date;
}

export interface WebhookConfig {
  secret: string;
  signatureHeader: string;
  signatureAlgorithm: "hmac-sha256" | "hmac-sha1" | "hmac-sha512";
}

// ==================== Connector Interface ====================

export interface IntegrationConnector {
  /** The integration definition */
  definition: IntegrationDefinition;
  /** Test the connection with given credentials */
  testConnection(credentials: Record<string, string>): Promise<boolean>;
  /** Handle an incoming webhook event */
  handleWebhook?(event: WebhookEvent): Promise<void>;
}
