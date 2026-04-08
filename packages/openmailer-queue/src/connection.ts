import type { ConnectionOptions } from "bullmq";

/**
 * Parse a Redis URL into BullMQ-compatible connection options.
 * Supports standard redis:// and rediss:// (TLS) URLs.
 *
 * Uses REDIS_URL env var (Railway convention) with localhost:6379 fallback.
 */
export function parseRedisUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    maxRetriesPerRequest: null,
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/**
 * Shared Redis connection config for all BullMQ queues and workers.
 * Parsed from the REDIS_URL environment variable.
 */
export const redisConnection: ConnectionOptions = parseRedisUrl(REDIS_URL);
