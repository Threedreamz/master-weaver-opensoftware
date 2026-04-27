import { randomUUID } from "node:crypto";
import type { CanonicalJob } from "@opensoftware/core-types";
import { makeCanonicalId } from "@opensoftware/core-types";
import type { JobHandler, JobInput, QueueBackend } from "./types.js";

/**
 * BullMQ-backed queue (Redis).
 *
 * Kept behind a factory so the import of `bullmq` / `ioredis` only happens
 * when the backend is actually constructed — packages that rely on
 * MemoryQueueBackend don't pull these modules.
 */
export interface RedisBackendOptions {
  redisUrl: string;
  /** Namespace prefix for job ids and BullMQ queues. Default: "open3d". */
  prefix?: string;
  /** Per-kind BullMQ queue instances are lazily created. */
}

export async function createRedisQueueBackend(opts: RedisBackendOptions): Promise<QueueBackend> {
  const { Queue, Worker, QueueEvents, Job } = await import("bullmq");
  // ioredis v5's default export is the constructor; TS sees it as a namespace
  // when dynamically imported, so cast to the concrete constructor type.
  const ioredisMod = await import("ioredis");
  const Redis = ((ioredisMod as unknown as { default?: unknown }).default ?? ioredisMod) as new (url: string, opts?: Record<string, unknown>) => unknown;
  // Cast through unknown — BullMQ expects an ioredis-compatible instance and
  // we're intentionally agnostic about the concrete shape.
  const connection = new Redis(opts.redisUrl, { maxRetriesPerRequest: null }) as never;
  const prefix = opts.prefix ?? "open3d";

  const queues = new Map<string, InstanceType<typeof Queue>>();
  const workers = new Map<string, InstanceType<typeof Worker>>();

  const getOrCreateQueue = (kind: string): InstanceType<typeof Queue> => {
    let q = queues.get(kind);
    if (!q) {
      q = new Queue(`${prefix}:${kind}`, { connection });
      queues.set(kind, q);
    }
    return q;
  };

  interface BullJobData {
    kind?: string;
    workspaceId?: string | null;
    input?: Record<string, unknown>;
    correlationId?: string | null;
  }

  async function fromBullJob(job: InstanceType<typeof Job>): Promise<CanonicalJob> {
    const state = await job.getState();
    const started = job.processedOn ? new Date(job.processedOn).toISOString() : null;
    const finished = job.finishedOn ? new Date(job.finishedOn).toISOString() : null;
    const data = (job.data as BullJobData) ?? {};
    return {
      id: job.id ? makeCanonicalId(prefix, job.id) : makeCanonicalId(prefix, randomUUID()),
      workspaceId: data.workspaceId ?? null,
      kind: data.kind ?? job.name,
      status: mapBullState(state),
      progress: typeof job.progress === "number" ? job.progress : null,
      input: data.input ?? {},
      result: (job.returnvalue as Record<string, unknown>) ?? null,
      error: job.failedReason ?? null,
      startedAt: started,
      finishedAt: finished,
      createdAt: new Date(job.timestamp).toISOString(),
    };
  }

  function mapBullState(s: string): CanonicalJob["status"] {
    switch (s) {
      case "waiting":
      case "waiting-children":
      case "delayed":
      case "prioritized":
        return "queued";
      case "active":
        return "running";
      case "completed":
        return "completed";
      case "failed":
        return "failed";
      default:
        return "queued";
    }
  }

  function parseJobId(canonicalId: string): { kind?: string; rawId: string } {
    // canonical id = "<prefix>:<bull-job-id>"
    const idx = canonicalId.indexOf(":");
    const rawId = idx >= 0 ? canonicalId.slice(idx + 1) : canonicalId;
    return { rawId };
  }

  const backend: QueueBackend = {
    id: "redis",

    async enqueue(name, input): Promise<CanonicalJob> {
      const q = getOrCreateQueue(input.kind);
      const bull = await q.add(name, {
        kind: input.kind,
        workspaceId: input.workspaceId ?? null,
        input: input.input,
        correlationId: input.correlationId ?? null,
      });
      return fromBullJob(bull);
    },

    async get(canonicalId): Promise<CanonicalJob | null> {
      const { rawId } = parseJobId(canonicalId);
      // Without knowing the kind we search each queue we've touched.
      for (const q of queues.values()) {
        const bull = await q.getJob(rawId);
        if (bull) return fromBullJob(bull);
      }
      return null;
    },

    async list(filter): Promise<CanonicalJob[]> {
      const out: CanonicalJob[] = [];
      const wanted = filter?.status;
      const states: string[] = wanted === "completed" ? ["completed"]
        : wanted === "running" ? ["active"]
        : wanted === "queued" ? ["waiting", "delayed"]
        : wanted === "failed" ? ["failed"]
        : wanted === "cancelled" ? []
        : ["waiting", "active", "completed", "failed", "delayed"];
      const queuesToHit = filter?.kind
        ? [getOrCreateQueue(filter.kind)]
        : [...queues.values()];
      for (const q of queuesToHit) {
        const bulls = await q.getJobs(states as any, 0, filter?.limit ?? 100, false);
        for (const b of bulls) out.push(await fromBullJob(b));
      }
      out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return out.slice(0, filter?.limit ?? 100);
    },

    async cancel(canonicalId): Promise<void> {
      const { rawId } = parseJobId(canonicalId);
      for (const q of queues.values()) {
        const bull = await q.getJob(rawId);
        if (bull) {
          const state = await bull.getState();
          if (state === "waiting" || state === "delayed") {
            await bull.remove();
          } else if (state === "active") {
            await bull.moveToFailed(new Error("cancelled"), "cancelled-token");
          }
          return;
        }
      }
    },

    register(kind, handler, options): void {
      if (workers.has(kind)) return; // already registered
      const worker = new Worker(
        `${prefix}:${kind}`,
        async (bull: InstanceType<typeof Job>) => {
          const data = (bull.data as BullJobData) ?? {};
          return handler({
            id: bull.id ? makeCanonicalId(prefix, bull.id) : makeCanonicalId(prefix, randomUUID()),
            kind: data.kind ?? kind,
            input: data.input ?? {},
            workspaceId: data.workspaceId ?? null,
            correlationId: data.correlationId ?? null,
          });
        },
        { connection, concurrency: options?.concurrency ?? 1 },
      );
      workers.set(kind, worker);
    },

    async close(): Promise<void> {
      for (const w of workers.values()) await w.close();
      for (const q of queues.values()) await q.close();
      (connection as unknown as { disconnect(): void }).disconnect();
    },
  };

  // Side-effect: construct a QueueEvents to keep progress updates flowing
  // for any listeners that attach later.
  for (const kind of queues.keys()) {
    new QueueEvents(`${prefix}:${kind}`, { connection });
  }

  return backend;
}
