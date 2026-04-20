import type { CanonicalJob } from "@opensoftware/core-types";

/**
 * Work payload — what the API receives from the caller and hands to the
 * worker. `kind` selects the consumer; `input` is opaque to the queue.
 */
export interface JobInput {
  kind: string;
  workspaceId?: string | null;
  input: Record<string, unknown>;
  /**
   * Optional correlation id the caller wants to thread through events. Used
   * for OpenPipeline tracing.
   */
  correlationId?: string;
}

/**
 * Result the worker returns from its handler. The queue persists this on
 * success and makes it available via `get(jobId).result`.
 */
export type JobResult = Record<string, unknown>;

export type JobHandler = (job: {
  id: string;
  kind: string;
  input: Record<string, unknown>;
  workspaceId: string | null;
  correlationId: string | null;
}) => Promise<JobResult>;

/**
 * Minimal backend contract. Two implementations: memory (tests / dev) and
 * redis (BullMQ, production).
 */
export interface QueueBackend {
  readonly id: string;
  enqueue(name: string, job: JobInput): Promise<CanonicalJob>;
  get(jobId: string): Promise<CanonicalJob | null>;
  list(filter?: { kind?: string; status?: CanonicalJob["status"]; limit?: number }): Promise<CanonicalJob[]>;
  cancel(jobId: string): Promise<void>;
  /**
   * Register a handler. The first registered handler for a given kind
   * receives every job of that kind. Calling register(kind, ...) twice
   * replaces the prior handler.
   */
  register(kind: string, handler: JobHandler, options?: { concurrency?: number }): void;
  /** Stop processing + release resources. */
  close(): Promise<void>;
}
