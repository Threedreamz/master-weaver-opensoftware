import { randomUUID } from "node:crypto";
import type { CanonicalJob } from "@opensoftware/core-types";
import { makeCanonicalId } from "@opensoftware/core-types";
import type { JobHandler, JobInput, QueueBackend } from "./types.js";

/**
 * In-memory queue backend.
 *
 * Intended for dev, tests, CI, and single-process apps that don't want a
 * Redis dependency. Jobs live only in this process; cross-process work
 * needs the Redis backend.
 *
 * Behavior mirrors BullMQ's semantics as closely as possible without
 * actually spinning up queues: FIFO within a kind, at-most-once processing
 * per handler, failed jobs don't retry (future: add retry config).
 */
export class MemoryQueueBackend implements QueueBackend {
  readonly id = "memory";
  private jobs = new Map<string, CanonicalJob>();
  /** Insertion order — used as a stable tiebreaker when createdAt has ms collisions. */
  private seq = new Map<string, number>();
  private nextSeq = 0;
  private handlers = new Map<string, { handler: JobHandler; concurrency: number; running: number }>();
  private pending: string[] = [];
  private prefix: string;

  constructor(opts: { prefix?: string } = {}) {
    this.prefix = opts.prefix ?? "open3d";
  }

  async enqueue(name: string, input: JobInput): Promise<CanonicalJob> {
    const id = makeCanonicalId(this.prefix, randomUUID());
    const now = new Date().toISOString();
    this.seq.set(id, this.nextSeq++);
    const job: CanonicalJob = {
      id,
      workspaceId: input.workspaceId ?? null,
      kind: input.kind,
      status: "queued",
      progress: null,
      input: input.input,
      result: null,
      error: null,
      startedAt: null,
      finishedAt: null,
      createdAt: now,
    };
    this.jobs.set(id, job);
    this.pending.push(id);
    // Schedule a microtask to pick up the new job without awaiting here
    queueMicrotask(() => void this.drain());
    return job;
  }

  async get(id: string): Promise<CanonicalJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async list(filter?: { kind?: string; status?: CanonicalJob["status"]; limit?: number }): Promise<CanonicalJob[]> {
    let items = [...this.jobs.values()];
    if (filter?.kind) items = items.filter((j) => j.kind === filter.kind);
    if (filter?.status) items = items.filter((j) => j.status === filter.status);
    // Newest first; tiebreak on insertion order so deterministic in fast tests.
    items.sort((a, b) => {
      const byTime = b.createdAt.localeCompare(a.createdAt);
      if (byTime !== 0) return byTime;
      return (this.seq.get(b.id) ?? 0) - (this.seq.get(a.id) ?? 0);
    });
    return items.slice(0, filter?.limit ?? 100);
  }

  async cancel(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    if (job.status === "queued" || job.status === "running") {
      this.jobs.set(id, {
        ...job,
        status: "cancelled",
        finishedAt: new Date().toISOString(),
      });
      this.pending = this.pending.filter((pid) => pid !== id);
    }
  }

  register(kind: string, handler: JobHandler, options?: { concurrency?: number }): void {
    this.handlers.set(kind, {
      handler,
      concurrency: options?.concurrency ?? 1,
      running: 0,
    });
    queueMicrotask(() => void this.drain());
  }

  async close(): Promise<void> {
    this.handlers.clear();
    this.pending = [];
    // Retain completed/failed jobs so `get` still works after close — the
    // backend may be queried by the API even after the worker has stopped.
  }

  // ---- internals ----
  private async drain(): Promise<void> {
    if (this.pending.length === 0) return;
    for (const id of [...this.pending]) {
      const job = this.jobs.get(id);
      if (!job || job.status !== "queued") continue;
      const entry = this.handlers.get(job.kind);
      if (!entry) continue; // no handler registered yet — leave queued
      if (entry.running >= entry.concurrency) continue;

      entry.running++;
      this.pending = this.pending.filter((pid) => pid !== id);
      // Fire-and-forget runtime; status transitions are captured in-place
      void this.run(id, entry).finally(() => { entry.running--; void this.drain(); });
    }
  }

  private async run(id: string, entry: { handler: JobHandler }): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;
    const running: CanonicalJob = {
      ...job,
      status: "running",
      startedAt: new Date().toISOString(),
    };
    this.jobs.set(id, running);
    try {
      const result = await entry.handler({
        id,
        kind: job.kind,
        input: job.input,
        workspaceId: job.workspaceId,
        correlationId: null,
      });
      // If the job was cancelled mid-flight, keep the cancelled status
      const current = this.jobs.get(id);
      if (current?.status === "cancelled") return;
      this.jobs.set(id, {
        ...running,
        status: "completed",
        progress: 1,
        result,
        finishedAt: new Date().toISOString(),
      });
    } catch (err) {
      this.jobs.set(id, {
        ...running,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        finishedAt: new Date().toISOString(),
      });
    }
  }
}
