/**
 * openaccounting → CanonicalCustomer adapter.
 *
 * Native storage: drizzle table `acct_customers` (integer PK, B2B/B2C, VAT,
 * separate `acct_customer_contacts` for sub-contacts). See
 * `packages/db/src/openaccounting.schema.ts`.
 *
 * Wire format: CanonicalCustomer from @opensoftware/core-types — UUID-style
 * prefixed id ("acct:<integer>"), kind person/business, email-normalized.
 *
 * This file ships pure mapper functions (`toCanonical`, `fromCanonical`) plus
 * a thin adapter shell. The adapter's storage methods (list/get/upsert/delete)
 * are TODO — wire them up when the canonical HTTP routes land in
 * `apps/openaccounting/src/app/api/v1/canonical/customers/route.ts`.
 */
import { randomUUID } from "node:crypto";
import {
  CanonicalCustomer,
  makeCanonicalId,
  normalizeEmail,
  parseCanonicalId,
  type CustomerQuery,
} from "@opensoftware/core-types";
import type {
  CustomerAdapter,
  CustomerPage,
} from "@opensoftware/core-adapters";
import type { Publisher } from "@opensoftware/openpipeline-client";

const PREFIX = "acct";

/** The native row shape from `acctCustomers` (drizzle schema). */
export interface AcctCustomerRow {
  id: number;
  customerNumber: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  vatId: string | null;
  type: "B2B" | "B2C" | null;
  country: string | null;
  status: "active" | "inactive" | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Pure mapper: native row → canonical wire format. */
export function toCanonicalCustomer(row: AcctCustomerRow): CanonicalCustomer {
  const created = row.createdAt ?? new Date().toISOString();
  const updated = row.updatedAt ?? created;
  return {
    id: makeCanonicalId(PREFIX, row.id),
    workspaceId: null,
    displayName: row.name || row.company || `Customer ${row.customerNumber}`,
    email: normalizeEmail(row.email),
    phone: row.phone,
    kind: row.type === "B2B" ? "business" : "person",
    status: row.status === "inactive" ? "suspended" : "active",
    company: row.company,
    vatId: row.vatId,
    country: row.country?.toUpperCase()?.slice(0, 2) ?? null,
    locale: null,
    externalIds: {
      customerNumber: row.customerNumber,
    },
    attributes: {},
    createdAt: toIso(created),
    updatedAt: toIso(updated),
  };
}

/** Pure mapper: canonical → native row (without DB-managed columns like id when creating). */
export function fromCanonicalCustomer(canonical: CanonicalCustomer): Omit<AcctCustomerRow, "id"> & { id?: number } {
  const { prefix, local } = parseCanonicalId(canonical.id);
  if (prefix !== PREFIX) {
    throw new Error(`Cannot map canonical id from prefix "${prefix}" into openaccounting (expected "${PREFIX}")`);
  }
  const numericId = Number.parseInt(local, 10);
  return {
    id: Number.isFinite(numericId) ? numericId : undefined,
    customerNumber: canonical.externalIds.customerNumber ?? local,
    name: canonical.displayName,
    company: canonical.company,
    email: canonical.email,
    phone: canonical.phone,
    vatId: canonical.vatId,
    type: canonical.kind === "business" ? "B2B" : "B2C",
    country: canonical.country ?? "DE",
    status: canonical.status === "suspended" ? "inactive" : "active",
    createdAt: canonical.createdAt,
    updatedAt: canonical.updatedAt,
  };
}

function toIso(s: string): string {
  // SQLite default `(datetime('now'))` returns "YYYY-MM-DD HH:MM:SS" without
  // a T separator or timezone — coerce to ISO-8601.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return s.replace(" ", "T") + "Z";
  }
  return s;
}

/**
 * Storage shape the adapter delegates to. Each app instance wires this to its
 * own drizzle DB. Pure mapper logic stays in this file; storage is ambient.
 */
export interface AcctCustomerStore {
  list(query: CustomerQuery): Promise<{ rows: AcctCustomerRow[]; nextCursor: string | null }>;
  get(id: number): Promise<AcctCustomerRow | null>;
  upsert(row: Omit<AcctCustomerRow, "id"> & { id?: number }): Promise<AcctCustomerRow>;
  delete(id: number): Promise<void>;
}

export interface CustomerAdapterOptions {
  store: AcctCustomerStore;
  /** Optional openpipeline publisher; events are fire-and-forget when set. */
  publisher?: Publisher;
}

export function createCustomerAdapter(opts: CustomerAdapterOptions | AcctCustomerStore): CustomerAdapter<AcctCustomerRow> {
  // Backwards compat: allow the legacy bare-store call shape.
  const config: CustomerAdapterOptions = "store" in opts ? opts : { store: opts };
  const { store, publisher } = config;

  return {
    toCanonical: toCanonicalCustomer,
    fromCanonical: fromCanonicalCustomer,
    async list(query): Promise<CustomerPage> {
      const { rows, nextCursor } = await store.list(query);
      return { items: rows.map(toCanonicalCustomer), nextCursor };
    },
    async get(canonicalId) {
      const { local } = parseCanonicalId(canonicalId);
      const numericId = Number.parseInt(local, 10);
      if (!Number.isFinite(numericId)) return null;
      const row = await store.get(numericId);
      return row ? toCanonicalCustomer(row) : null;
    },
    async upsert(canonical) {
      const existed = canonical.id ? await store.get(Number.parseInt(parseCanonicalId(canonical.id).local, 10)) : null;
      const native = fromCanonicalCustomer(canonical);
      const written = await store.upsert(native);
      const canonicalOut = toCanonicalCustomer(written);
      if (publisher) {
        await publisher.emit(existed
          ? {
              type: "customer.updated",
              eventId: randomUUID(),
              occurredAt: new Date().toISOString(),
              source: "openaccounting",
              workspaceId: null,
              payload: canonicalOut,
              changedFields: [],
            }
          : {
              type: "customer.created",
              eventId: randomUUID(),
              occurredAt: new Date().toISOString(),
              source: "openaccounting",
              workspaceId: null,
              payload: canonicalOut,
            }
        );
      }
      return canonicalOut;
    },
    async delete(canonicalId) {
      const { local } = parseCanonicalId(canonicalId);
      const numericId = Number.parseInt(local, 10);
      if (!Number.isFinite(numericId)) return;
      await store.delete(numericId);
    },
  };
}
