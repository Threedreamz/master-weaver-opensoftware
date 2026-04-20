import { z } from "zod";

export const CanonicalFileStorage = z.enum(["s3", "local", "railway-volume", "tmp"]);
export type CanonicalFileStorage = z.infer<typeof CanonicalFileStorage>;

export const CanonicalFile = z.object({
  /** Prefixed canonical id. */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*:.+$/),
  workspaceId: z.string().nullable(),
  filename: z.string(),
  mime: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  storage: CanonicalFileStorage,
  /** Storage-relative path or s3 key. Resolution rules per storage backend. */
  path: z.string(),
  /** Optional ttl — useful for `/tmp` artifacts produced by handlers. */
  expiresAt: z.string().datetime().nullable(),
  attributes: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
});
export type CanonicalFile = z.infer<typeof CanonicalFile>;
