import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";

/**
 * All queue names used by the OpenMailer system.
 * Each queue handles a distinct category of background work.
 */
export const QUEUE_NAMES = {
  /** Individual email send jobs (campaign batch sends, transactional) */
  EMAIL: "email",
  /** Campaign orchestration (scheduling, segmentation, batch splitting) */
  CAMPAIGN: "campaign",
  /** Contact import jobs (CSV/file processing, field mapping) */
  IMPORT: "import",
  /** Automation trigger evaluation and action execution */
  AUTOMATION: "automation",
  /** Contact engagement scoring recalculation */
  SCORING: "scoring",
  /** Periodic cleanup (expired sessions, stale data, log rotation) */
  CLEANUP: "cleanup",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Default job options applied to every job added to OpenMailer queues.
 * - 3 attempts with exponential backoff (5s, 10s, 20s)
 * - Failed jobs are kept for 7 days for inspection
 * - Completed jobs are removed after 1 day
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { age: 86400 },
  removeOnFail: { age: 604800 },
};

/**
 * Create a typed BullMQ queue with the shared Redis connection.
 *
 * @param name - One of the QUEUE_NAMES constants
 * @returns A BullMQ Queue instance connected to the shared Redis
 *
 * @example
 * ```ts
 * import { createQueue, QUEUE_NAMES } from "@opensoftware/openmailer-queue";
 *
 * const emailQueue = createQueue(QUEUE_NAMES.EMAIL);
 * await emailQueue.add("send-batch", { campaignId: "abc", contactIds: ["1","2"] });
 * ```
 */
export function createQueue<TData = unknown>(name: QueueName | string): Queue<TData> {
  return new Queue<TData>(name, {
    connection: redisConnection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
}
