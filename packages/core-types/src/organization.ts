import { z } from "zod";

export const CanonicalOrganization = z.object({
  /** Prefixed canonical id, e.g. "portal:org_xyz". */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*:.+$/),
  workspaceId: z.string().nullable(),
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  parentId: z.string().nullable(),
  externalIds: z.record(z.string(), z.string()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CanonicalOrganization = z.infer<typeof CanonicalOrganization>;

export const CanonicalOrgMember = z.object({
  organizationId: z.string(),
  userId: z.string(),       // canonical user id (FinderAuth subject)
  role: z.enum(["owner", "admin", "member", "viewer"]),
  joinedAt: z.string().datetime(),
});
export type CanonicalOrgMember = z.infer<typeof CanonicalOrgMember>;
