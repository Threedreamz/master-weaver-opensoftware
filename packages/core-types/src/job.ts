import { z } from "zod";

export const CanonicalJobStatus = z.enum([
  "queued", "running", "completed", "failed", "cancelled",
]);
export type CanonicalJobStatus = z.infer<typeof CanonicalJobStatus>;

export const CanonicalJob = z.object({
  /** Prefixed canonical id, e.g. "open3d:nerf_abc". */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*:.+$/),
  workspaceId: z.string().nullable(),
  /** Logical job kind, e.g. "nerf-train", "slice", "drawing-to-3d". */
  kind: z.string(),
  status: CanonicalJobStatus,
  progress: z.number().min(0).max(1).nullable(),
  /** Free-form input payload (validated by the handler, not by this schema). */
  input: z.record(z.string(), z.unknown()).default({}),
  /** Free-form result payload populated when status === "completed". */
  result: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  startedAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type CanonicalJob = z.infer<typeof CanonicalJob>;
