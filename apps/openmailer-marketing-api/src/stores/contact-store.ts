import { and, eq, desc } from "drizzle-orm";
import { db, contacts } from "@opensoftware/openmailer-db";
import type { Contact } from "@opensoftware/openmailer-core/schemas";
import type { MailerContactStore } from "../adapters/customer.js";
import type { CustomerQuery } from "@opensoftware/core-types";

/**
 * Postgres-backed MailerContactStore — the real implementation used by the
 * canonical-events receiver (and, eventually, the /api/contacts routes).
 *
 * Single shared singleton because drizzle + pg Pool are module-scope (see
 * @opensoftware/openmailer-db/index.ts). If that ever changes, rework this
 * file to take a db parameter.
 */
export const contactStore: MailerContactStore = {
  async list(query: CustomerQuery) {
    const filters = [];
    if (query.workspaceId) filters.push(eq(contacts.workspaceId, query.workspaceId));
    if (query.email) filters.push(eq(contacts.email, query.email.toLowerCase()));
    if (query.status === "active") filters.push(eq(contacts.status, "active"));
    const rows = await db
      .select()
      .from(contacts)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(contacts.createdAt))
      .limit(Math.min(500, query.limit ?? 50));
    return { rows: rows.map(rowToContact), nextCursor: null };
  },

  async get(id: string): Promise<Contact | null> {
    const [row] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
    return row ? rowToContact(row) : null;
  },

  async findByEmail(workspaceId: string, email: string): Promise<Contact | null> {
    const [row] = await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.workspaceId, workspaceId),
        eq(contacts.email, email.toLowerCase()),
      ))
      .limit(1);
    return row ? rowToContact(row) : null;
  },

  async upsert(contact: Contact): Promise<Contact> {
    const values = {
      id: contact.id,
      workspaceId: contact.workspaceId,
      email: contact.email.toLowerCase(),
      firstName: contact.firstName,
      lastName: contact.lastName,
      customFields: contact.customFields as Record<string, unknown>,
      score: Math.round(contact.score),
      status: contact.status,
      emailConsent: contact.emailConsent,
      trackingConsent: contact.trackingConsent,
      createdAt: toDate(contact.createdAt),
      updatedAt: toDate(contact.updatedAt),
    };
    const [written] = await db
      .insert(contacts)
      .values(values)
      .onConflictDoUpdate({
        target: contacts.id,
        set: {
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          customFields: values.customFields,
          score: values.score,
          status: values.status,
          emailConsent: values.emailConsent,
          trackingConsent: values.trackingConsent,
          updatedAt: values.updatedAt,
        },
      })
      .returning();
    return rowToContact(written);
  },

  async delete(id: string): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  },
};

type ContactRow = typeof contacts.$inferSelect;

function rowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    email: row.email,
    firstName: row.firstName ?? undefined,
    lastName: row.lastName ?? undefined,
    customFields: (row.customFields as Record<string, unknown>) ?? {},
    score: row.score,
    status: row.status as Contact["status"],
    emailConsent: row.emailConsent,
    trackingConsent: row.trackingConsent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}
