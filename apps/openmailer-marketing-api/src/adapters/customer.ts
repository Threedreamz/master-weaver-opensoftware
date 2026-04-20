/**
 * openmailer → CanonicalCustomer adapter.
 *
 * Native: openmailer Contact (UUID id, workspaceId, firstName/lastName, consent flags)
 * — see packages/openmailer-core/src/schemas/contact.ts.
 *
 * Wire format: CanonicalCustomer (kind: 'person', externalIds preserve consent
 * + score so downstream modules can opt-in to consent-aware features).
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
import type { Contact } from "@opensoftware/openmailer-core/schemas";

const PREFIX = "mailer";

export function toCanonicalCustomer(contact: Contact): CanonicalCustomer {
  const displayName = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || contact.email;
  return {
    id: makeCanonicalId(PREFIX, contact.id),
    workspaceId: contact.workspaceId,
    displayName,
    email: normalizeEmail(contact.email),
    phone: null,
    kind: "person",
    status: contact.status === "unsubscribed" || contact.status === "bounced" ? "suspended"
          : contact.status === "complained" ? "archived"
          : "active",
    company: null,
    vatId: null,
    country: null,
    locale: null,
    externalIds: {
      mailerId: contact.id,
    },
    attributes: {
      score: contact.score,
      emailConsent: contact.emailConsent,
      trackingConsent: contact.trackingConsent,
      mailerStatus: contact.status,
      customFields: contact.customFields,
    },
    createdAt: new Date(contact.createdAt).toISOString(),
    updatedAt: new Date(contact.updatedAt).toISOString(),
  };
}

export function fromCanonicalCustomer(canonical: CanonicalCustomer): Contact {
  const { prefix, local } = parseCanonicalId(canonical.id);
  if (prefix !== PREFIX) {
    throw new Error(`Cannot map canonical id from prefix "${prefix}" into openmailer (expected "${PREFIX}")`);
  }
  if (!canonical.email) {
    throw new Error("openmailer requires an email — refusing to map a canonical customer without one");
  }
  if (!canonical.workspaceId) {
    throw new Error("openmailer requires workspaceId — refusing to map without it");
  }
  // Best-effort displayName split. If the canonical name has multiple words,
  // first word → firstName, rest → lastName. Single-word names go to firstName.
  const [first, ...rest] = canonical.displayName.split(/\s+/);
  return {
    id: local,
    workspaceId: canonical.workspaceId,
    email: canonical.email,
    firstName: first,
    lastName: rest.length ? rest.join(" ") : undefined,
    customFields: (canonical.attributes.customFields as Record<string, unknown>) ?? {},
    score: typeof canonical.attributes.score === "number" ? canonical.attributes.score : 0,
    status: canonical.status === "suspended" ? "unsubscribed"
          : canonical.status === "archived" ? "complained"
          : "active",
    emailConsent: canonical.attributes.emailConsent === false ? false : true,
    trackingConsent: canonical.attributes.trackingConsent === true,
    createdAt: new Date(canonical.createdAt),
    updatedAt: new Date(canonical.updatedAt),
  };
}

export interface MailerContactStore {
  list(query: CustomerQuery): Promise<{ rows: Contact[]; nextCursor: string | null }>;
  get(id: string): Promise<Contact | null>;
  /** Required for cross-module import via importCanonicalCustomer below. */
  findByEmail(workspaceId: string, email: string): Promise<Contact | null>;
  upsert(contact: Contact): Promise<Contact>;
  delete(id: string): Promise<void>;
}

/**
 * Cross-module import path: take a CanonicalCustomer from ANY publisher
 * (openaccounting, openportal, future openshop, …) and materialize it as
 * an openmailer Contact keyed by (workspaceId, email).
 *
 * Contrast with the adapter's own `upsert`, which requires the canonical id
 * prefix to match "mailer:" — this helper is the bridge that allows
 * openmailer to consume events originating elsewhere.
 *
 * Behavior:
 *   - Event without email OR without workspaceId → skipped (logged upstream).
 *   - Existing row (match on workspace + email) → updated in place; the
 *     incoming module's id is recorded under customFields["external_<prefix>"].
 *   - No match → new row inserted with emailConsent=false / trackingConsent=false
 *     (conservative; opt-in happens via openmailer's own UI).
 */
export interface ImportOutcome {
  action: "inserted" | "updated" | "skipped";
  reason?: string;
  contactId?: string;
}

export async function importCanonicalCustomer(
  store: MailerContactStore,
  canonical: CanonicalCustomer,
): Promise<ImportOutcome> {
  if (!canonical.email) return { action: "skipped", reason: "no email on canonical payload" };
  if (!canonical.workspaceId) return { action: "skipped", reason: "no workspaceId on canonical payload" };

  const { prefix, local } = parseCanonicalId(canonical.id);
  const externalKey = `external_${prefix}`;

  const existing = await store.findByEmail(canonical.workspaceId, canonical.email);
  if (existing) {
    const updated = await store.upsert({
      ...existing,
      customFields: {
        ...existing.customFields,
        [externalKey]: local,
      },
      updatedAt: new Date(),
    });
    return { action: "updated", contactId: updated.id };
  }

  const [first, ...rest] = canonical.displayName.split(/\s+/);
  const now = new Date();
  const inserted = await store.upsert({
    id: randomUuid(),
    workspaceId: canonical.workspaceId,
    email: canonical.email,
    firstName: first,
    lastName: rest.length ? rest.join(" ") : undefined,
    customFields: { [externalKey]: local },
    score: 0,
    status: "active",
    emailConsent: false,
    trackingConsent: false,
    createdAt: now,
    updatedAt: now,
  });
  return { action: "inserted", contactId: inserted.id };
}

function randomUuid(): string {
  // `crypto.randomUUID` is available in Node 14+ and all evergreen browsers.
  // Typed via globalThis to avoid a DOM/Node typing fork in this file.
  return (globalThis as unknown as { crypto: { randomUUID(): string } }).crypto.randomUUID();
}

export interface CustomerAdapterOptions {
  store: MailerContactStore;
  /** Optional openpipeline publisher; events are fire-and-forget when set. */
  publisher?: Publisher;
}

export function createCustomerAdapter(opts: CustomerAdapterOptions | MailerContactStore): CustomerAdapter<Contact> {
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
      const c = await store.get(local);
      return c ? toCanonicalCustomer(c) : null;
    },
    async upsert(canonical) {
      const existed = canonical.id ? await store.get(parseCanonicalId(canonical.id).local) : null;
      const native = fromCanonicalCustomer(canonical);
      const written = await store.upsert(native);
      const canonicalOut = toCanonicalCustomer(written);
      if (publisher) {
        await publisher.emit(existed
          ? {
              type: "customer.updated",
              eventId: randomUUID(),
              occurredAt: new Date().toISOString(),
              source: "openmailer",
              workspaceId: canonical.workspaceId,
              payload: canonicalOut,
              changedFields: [],
            }
          : {
              type: "customer.created",
              eventId: randomUUID(),
              occurredAt: new Date().toISOString(),
              source: "openmailer",
              workspaceId: canonical.workspaceId,
              payload: canonicalOut,
            }
        );
      }
      return canonicalOut;
    },
    async delete(canonicalId) {
      const { local } = parseCanonicalId(canonicalId);
      await store.delete(local);
    },
  };
}
