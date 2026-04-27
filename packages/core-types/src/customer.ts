import { z } from "zod";

export const CanonicalCustomerKind = z.enum(["person", "business"]);
export type CanonicalCustomerKind = z.infer<typeof CanonicalCustomerKind>;

export const CanonicalCustomerStatus = z.enum(["active", "suspended", "archived"]);
export type CanonicalCustomerStatus = z.infer<typeof CanonicalCustomerStatus>;

/**
 * Canonical Customer — the wire-format every OpenSoftware module exposes via
 * its adapter and `/api/v1/canonical/customers` endpoint.
 *
 * Native records stay where they are; this is purely an interchange shape.
 */
export const CanonicalCustomer = z.object({
  /** Prefixed canonical id, e.g. "acct:1234" — IMMUTABLE once issued. */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*:.+$/, "id must be prefix-scoped (e.g. 'acct:123')"),
  /** Workspace / tenant scope. Required for multi-tenant modules. */
  workspaceId: z.string().nullable(),
  /** Display label shown in the admin UI. */
  displayName: z.string().min(1),
  /** Primary email, normalized (lowercased, trimmed). */
  email: z.string().email().nullable(),
  /** Phone in E.164 if known. */
  phone: z.string().nullable(),
  /** Person vs. business. Affects which UI fields/forms are rendered. */
  kind: CanonicalCustomerKind,
  /** Lifecycle state. */
  status: CanonicalCustomerStatus.default("active"),
  /** Optional company name (always present for `kind: "business"`). */
  company: z.string().nullable(),
  /** VAT / tax id (mostly business). */
  vatId: z.string().nullable(),
  /** Country code (ISO-3166 alpha-2). */
  country: z.string().length(2).nullable(),
  /** Free-form locale tag, e.g. "de-DE". */
  locale: z.string().nullable(),
  /** External ids in other systems — keys are stable handles, e.g. "acct", "mailer", "stripe". */
  externalIds: z.record(z.string(), z.string()).default({}),
  /** Free-form attributes the source module wants to ride along. Avoid putting wire-critical data here. */
  attributes: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CanonicalCustomer = z.infer<typeof CanonicalCustomer>;

/** Query shape passed to `CustomerAdapter.list`. All fields are optional filters. */
export const CustomerQuery = z.object({
  workspaceId: z.string().optional(),
  email: z.string().email().optional(),
  kind: CanonicalCustomerKind.optional(),
  status: CanonicalCustomerStatus.optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(500).default(50),
  cursor: z.string().optional(),
});
export type CustomerQuery = z.infer<typeof CustomerQuery>;

/** Normalize an email for canonical equality (lowercase + trim). */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const t = email.trim().toLowerCase();
  return t.length > 0 ? t : null;
}

/**
 * Merge two canonical customers thought to represent the same identity.
 * `primary` wins on scalar fields; both contribute to `externalIds` and `attributes`.
 * Used to build cross-module unified views in the admin panel.
 */
export function mergeCustomers(primary: CanonicalCustomer, secondary: CanonicalCustomer): CanonicalCustomer {
  return {
    ...primary,
    externalIds: { ...secondary.externalIds, ...primary.externalIds },
    attributes:  { ...secondary.attributes,  ...primary.attributes },
    company: primary.company ?? secondary.company,
    vatId: primary.vatId ?? secondary.vatId,
    phone: primary.phone ?? secondary.phone,
    country: primary.country ?? secondary.country,
    locale: primary.locale ?? secondary.locale,
  };
}
