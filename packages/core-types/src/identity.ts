import { z } from "zod";

/**
 * CanonicalUser — derived from the FinderAuth (or 3DreamzAuth/MWAuth) OIDC subject.
 *
 * Modules MUST NOT mint their own canonical user ids; they map a local user
 * row to its FinderAuth subject and use that as the canonical id (prefixed
 * with the auth issuer family, e.g. "finderauth:abc-123").
 */
export const CanonicalUser = z.object({
  /** Prefixed canonical id from the auth issuer. */
  id: z.string().regex(/^(finderauth|3dreamzauth|mwauth):.+$/),
  email: z.string().email().nullable(),
  displayName: z.string().nullable(),
  /** The OIDC issuer URL that minted this subject. */
  issuer: z.string().url(),
  /** Roles granted in this workspace. */
  roles: z.array(z.string()).default([]),
});
export type CanonicalUser = z.infer<typeof CanonicalUser>;
