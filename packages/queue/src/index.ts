/**
 * @opensoftware/queue
 *
 * Async job queue used by Open3D (and any other OpenSoftware module that
 * wants async execution). Two backends:
 *
 *   - MemoryQueueBackend — in-process, zero deps. Dev / tests / CI / single-
 *     process apps. Default when REDIS_URL is unset.
 *   - createRedisQueueBackend({ redisUrl }) — BullMQ + ioredis. Production.
 *     `bullmq` and `ioredis` are declared as peer deps so that modules
 *     opting into the memory backend don't install them.
 *
 * Jobs are reported as @opensoftware/core-types CanonicalJob; ids are
 * prefix-scoped ("open3d:<uuid>" by default). Consumers publish
 * `job.completed` / `job.failed` events via @opensoftware/openpipeline-client
 * — that wiring lives in apps/open3d-worker, not here, so this package stays
 * independent of openpipeline.
 */
export * from "./types.js";
export { MemoryQueueBackend } from "./memory-backend.js";
export { createRedisQueueBackend } from "./redis-backend.js";
export type { RedisBackendOptions } from "./redis-backend.js";

import { MemoryQueueBackend } from "./memory-backend.js";
import { createRedisQueueBackend } from "./redis-backend.js";
import type { QueueBackend } from "./types.js";

/**
 * Factory that picks the right backend from env. Pass `prefix` to scope
 * the canonical job ids (e.g. "open3d", "openfarm").
 *
 * - When REDIS_URL is set and useRedis is truthy, returns BullMQ backend.
 * - Otherwise returns the in-process memory backend.
 */
export async function createQueueFromEnv(opts: {
  prefix?: string;
  redisUrl?: string;
  forceMemory?: boolean;
} = {}): Promise<QueueBackend> {
  const url = opts.redisUrl ?? process.env.REDIS_URL;
  if (!opts.forceMemory && url) {
    try {
      return await createRedisQueueBackend({ redisUrl: url, prefix: opts.prefix });
    } catch (err) {
      console.warn(`@opensoftware/queue: Redis backend failed (${err instanceof Error ? err.message : err}), falling back to memory.`);
    }
  }
  return new MemoryQueueBackend({ prefix: opts.prefix });
}
