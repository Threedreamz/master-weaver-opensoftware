import { Queue } from "bullmq";
import { Redis } from "ioredis";

/**
 * Producer-side BullMQ wiring. The api enqueues jobs; openpostbox-worker
 * consumes them. Queue names MUST match what the worker listens on
 * (see apps/openpostbox-worker/src/server.ts → QUEUES).
 *
 * Redis is optional — if `REDIS_URL` is unset we skip enqueue silently so
 * local dev works without Redis. Production is expected to have Redis
 * provisioned alongside the worker on Railway.
 */

export const QUEUE_NAMES = {
  OCR: "openpostbox.ocr",
  CLASSIFY: "openpostbox.classify",
} as const;

let ocrQueue: Queue | null = null;
let classifyQueue: Queue | null = null;

function getConnection(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: false, lazyConnect: true });
}

function getOcrQueue(): Queue | null {
  if (ocrQueue) return ocrQueue;
  const connection = getConnection();
  if (!connection) return null;
  ocrQueue = new Queue(QUEUE_NAMES.OCR, { connection });
  return ocrQueue;
}

function getClassifyQueue(): Queue | null {
  if (classifyQueue) return classifyQueue;
  const connection = getConnection();
  if (!connection) return null;
  classifyQueue = new Queue(QUEUE_NAMES.CLASSIFY, { connection });
  return classifyQueue;
}

export interface EnqueueOcr {
  tenantId: string;
  mailId: string;
  blobUrl: string;
}

export async function enqueueOcr(data: EnqueueOcr): Promise<void> {
  const q = getOcrQueue();
  if (!q) {
    console.warn(`[openpostbox] REDIS_URL unset — skipping OCR enqueue for mail=${data.mailId}`);
    return;
  }
  await q.add("ocr", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600 * 24 * 7 },
    removeOnFail: { age: 3600 * 24 * 30 },
  });
}

export interface EnqueueClassify {
  tenantId: string;
  mailId: string;
  ocrText: string;
}

export async function enqueueClassify(data: EnqueueClassify): Promise<void> {
  const q = getClassifyQueue();
  if (!q) return;
  await q.add("classify", data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 1000 },
  });
}
