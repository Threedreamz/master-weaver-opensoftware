export * from './transport.js';

// ---------------------------------------------------------------------------
// API request/response envelope types
// ---------------------------------------------------------------------------

/** Standard API success response */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** Standard API error response */
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Tracking event types
// ---------------------------------------------------------------------------

export type TrackingEventType =
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'unsubscribed';

export interface TrackingEvent {
  id: string;
  campaignId: string;
  contactId: string;
  type: TrackingEventType;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Campaign statistics
// ---------------------------------------------------------------------------

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}
