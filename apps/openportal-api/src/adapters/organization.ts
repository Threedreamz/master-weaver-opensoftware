/**
 * openportal → CanonicalOrganization adapter.
 *
 * Native storage: pg `orgs` table + `org_members` (UUID ids, workspace-scoped).
 * See packages/openportal-db/src/schema.ts.
 *
 * Wire format: CanonicalOrganization + CanonicalOrgMember from
 * @opensoftware/core-types. Canonical ids are prefixed "portal:<uuid>".
 *
 * Same factory shape as the customer adapters — pure mappers + an optional
 * openpipeline publisher that fires organization.created /
 * organization.member-added events on upsert / member addition.
 */
import { randomUUID } from "node:crypto";
import {
  CanonicalOrganization,
  CanonicalOrgMember,
  makeCanonicalId,
  parseCanonicalId,
} from "@opensoftware/core-types";
import type {
  OrganizationAdapter,
  OrganizationPage,
  OrganizationQuery,
} from "@opensoftware/core-adapters";
import type { Publisher } from "@opensoftware/openpipeline-client";

const PREFIX = "portal";

/** Native row shapes (trimmed to what the adapter touches). */
export interface OrgRow {
  id: string;           // UUID
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OrgMemberRow {
  id: string;
  orgId: string;
  userId: string;
  role: string;
  joinedAt: Date | string;
}

/** Pure mapper: native row → canonical wire format. */
export function toCanonicalOrganization(row: OrgRow): CanonicalOrganization {
  return {
    id: makeCanonicalId(PREFIX, row.id),
    workspaceId: row.workspaceId,
    name: row.name,
    slug: row.slug,
    parentId: null,             // openportal's current schema doesn't model hierarchy
    externalIds: {},
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** Pure mapper: canonical → native row shape (id optional so callers can insert). */
export function fromCanonicalOrganization(c: CanonicalOrganization): Omit<OrgRow, "id"> & { id?: string } {
  const { prefix, local } = parseCanonicalId(c.id);
  if (prefix !== PREFIX) {
    throw new Error(`Cannot map canonical id from prefix "${prefix}" into openportal (expected "${PREFIX}")`);
  }
  if (!c.workspaceId) {
    throw new Error("openportal Organizations require workspaceId");
  }
  return {
    id: local,
    workspaceId: c.workspaceId,
    name: c.name,
    slug: c.slug,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function toCanonicalOrgMember(row: OrgMemberRow): CanonicalOrgMember {
  return {
    organizationId: makeCanonicalId(PREFIX, row.orgId),
    // Trust the auth issuer prefix already lives in upstream identity code.
    // If not, callers can re-map by replacing with "finderauth:" etc.
    userId: row.userId.includes(":") ? row.userId : `finderauth:${row.userId}`,
    role: (row.role === "owner" || row.role === "admin" || row.role === "viewer") ? row.role : "member",
    joinedAt: toIso(row.joinedAt),
  };
}

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

/**
 * Store contract — openportal-api's route handlers wire this to drizzle +
 * the `orgs` / `org_members` tables.
 */
export interface OrgStore {
  list(query: OrganizationQuery): Promise<{ rows: OrgRow[]; nextCursor: string | null }>;
  get(id: string): Promise<OrgRow | null>;
  upsert(row: Omit<OrgRow, "id"> & { id?: string }): Promise<OrgRow>;
  delete(id: string): Promise<void>;
  listMembers(orgId: string): Promise<OrgMemberRow[]>;
}

export interface OrganizationAdapterOptions {
  store: OrgStore;
  /** Optional openpipeline publisher for cross-module events. */
  publisher?: Publisher;
}

export function createOrganizationAdapter(
  opts: OrganizationAdapterOptions | OrgStore,
): OrganizationAdapter<OrgRow, OrgMemberRow> {
  const config: OrganizationAdapterOptions = "store" in opts ? opts : { store: opts };
  const { store, publisher } = config;

  return {
    toCanonical: toCanonicalOrganization,
    fromCanonical: fromCanonicalOrganization,

    async list(query): Promise<OrganizationPage> {
      const { rows, nextCursor } = await store.list(query);
      return { items: rows.map(toCanonicalOrganization), nextCursor };
    },

    async get(canonicalId) {
      const { local } = parseCanonicalId(canonicalId);
      const row = await store.get(local);
      return row ? toCanonicalOrganization(row) : null;
    },

    async upsert(canonical) {
      const existed = canonical.id ? await store.get(parseCanonicalId(canonical.id).local) : null;
      const row = await store.upsert(fromCanonicalOrganization(canonical));
      const out = toCanonicalOrganization(row);
      if (publisher) {
        if (!existed) {
          await publisher.emit({
            type: "organization.created",
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
            source: "openportal",
            workspaceId: out.workspaceId,
            payload: out,
          });
        }
        // No canonical organization.updated event in the schema yet — members
        // are the interesting mutation; org-level updates are rare.
      }
      return out;
    },

    async delete(canonicalId) {
      const { local } = parseCanonicalId(canonicalId);
      await store.delete(local);
    },

    async listMembers(canonicalOrgId) {
      const { local } = parseCanonicalId(canonicalOrgId);
      const rows = await store.listMembers(local);
      return rows.map(toCanonicalOrgMember);
    },
  };
}

/**
 * Side-channel helper for emitting organization.member-added at the place a
 * new member is actually inserted. The adapter can't tail every inner table
 * without a subscribe/log pattern, so API handlers call this directly.
 *
 * Usage:
 *   await store.addMember(orgId, userId, role);
 *   await notifyMemberAdded(publisher, { orgId, userId, role });
 */
export async function notifyMemberAdded(
  publisher: Publisher | undefined,
  input: { orgId: string; userId: string; role: string; workspaceId?: string | null; correlationId?: string },
): Promise<void> {
  if (!publisher) return;
  await publisher.emit({
    type: "organization.member-added",
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    source: "openportal",
    workspaceId: input.workspaceId ?? null,
    correlationId: input.correlationId,
    organizationId: input.orgId.includes(":") ? input.orgId : makeCanonicalId(PREFIX, input.orgId),
    userId: input.userId.includes(":") ? input.userId : `finderauth:${input.userId}`,
    role: input.role,
  });
}
