// Connection
export { parseRedisUrl, redisConnection } from "./connection.js";

// Queues
export { QUEUE_NAMES, createQueue } from "./queues.js";
export type { QueueName } from "./queues.js";

// Job payload types
export type {
  // Campaign
  SendCampaignJob,
  SendEmailBatchJob,
  // Import
  ImportContactsJob,
  // Automation
  AutomationTriggerJob,
  AutomationActionJob,
  // Scoring
  ScoringJob,
  BulkScoringJob,
  // Cleanup
  CleanupJob,
} from "./jobs.js";

// Re-export BullMQ primitives for worker creation
export { Queue, Worker } from "bullmq";
export type { Job, ConnectionOptions } from "bullmq";
