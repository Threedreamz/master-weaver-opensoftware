/**
 * Job payload type definitions for all OpenMailer queue jobs.
 *
 * Each interface defines the data shape expected by the corresponding
 * queue worker. Workers validate these payloads at runtime.
 */

// ---------------------------------------------------------------------------
// Campaign Jobs
// ---------------------------------------------------------------------------

/** Trigger a full campaign send (orchestrator splits into batches) */
export interface SendCampaignJob {
  campaignId: string;
  workspaceId: string;
}

/** Send a batch of emails for a campaign */
export interface SendEmailBatchJob {
  campaignId: string;
  contactIds: string[];
  templateHtml: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  transportId: string;
}

// ---------------------------------------------------------------------------
// Import Jobs
// ---------------------------------------------------------------------------

/** Import contacts from an uploaded file */
export interface ImportContactsJob {
  workspaceId: string;
  filePath: string;
  fieldMapping: Record<string, string>;
  tagIds?: string[];
  segmentId?: string;
}

// ---------------------------------------------------------------------------
// Automation Jobs
// ---------------------------------------------------------------------------

/** Evaluate automation triggers for a contact event */
export interface AutomationTriggerJob {
  workspaceId: string;
  automationId: string;
  contactId: string;
  event: string;
  eventData?: Record<string, unknown>;
}

/** Execute an automation action step */
export interface AutomationActionJob {
  workspaceId: string;
  automationId: string;
  stepId: string;
  contactId: string;
}

// ---------------------------------------------------------------------------
// Scoring Jobs
// ---------------------------------------------------------------------------

/** Recalculate engagement score for a contact */
export interface ScoringJob {
  workspaceId: string;
  contactId: string;
}

/** Bulk scoring recalculation for a segment or all contacts */
export interface BulkScoringJob {
  workspaceId: string;
  segmentId?: string;
}

// ---------------------------------------------------------------------------
// Cleanup Jobs
// ---------------------------------------------------------------------------

/** Periodic cleanup of stale data */
export interface CleanupJob {
  workspaceId?: string;
  type: "expired_sessions" | "stale_imports" | "old_logs" | "bounced_contacts";
  olderThanDays?: number;
}
