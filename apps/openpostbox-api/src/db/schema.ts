import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * OpenPostbox schema.
 *
 * `scanned_mail` is the canonical ledger of a received physical mail item.
 * Each row stores the raw PDF (by blob reference), the OCR text, a
 * classification (rechnung | vertrag | behoerde | werbung | unknown), and
 * a hash chain (`prev_hash` + `this_hash`) that makes the table
 * GoBD-compliant for 10-year retention. The hash chain is written by the
 * worker in `openpostbox-worker` after OCR completes and classification is
 * confirmed.
 *
 * `mail_event` is an append-only log of lifecycle events (received, ocr,
 * classified, routed, exported, archived) — used by the admin UI to render
 * a timeline and by the gateway to audit per-tenant usage against the
 * entitlement's `scanPagesPerMonth` cap.
 */

export const scannedMail = sqliteTable(
  "scanned_mail",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    receivedAt: integer("received_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    senderName: text("sender_name"),
    senderAddress: text("sender_address"),
    subject: text("subject"),
    pageCount: integer("page_count").notNull().default(0),
    blobUrl: text("blob_url").notNull(),
    ocrText: text("ocr_text"),
    classification: text("classification", {
      enum: ["rechnung", "vertrag", "behoerde", "werbung", "unknown"],
    })
      .notNull()
      .default("unknown"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`(json_array())`),
    dueDate: integer("due_date", { mode: "timestamp_ms" }),
    unread: integer("unread", { mode: "boolean" }).notNull().default(true),
    shredded: integer("shredded", { mode: "boolean" }).notNull().default(false),
    prevHash: text("prev_hash"),
    thisHash: text("this_hash").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    byTenantReceivedIdx: index("idx_scanned_mail_tenant_received").on(t.tenantId, t.receivedAt),
    byTenantUnreadIdx: index("idx_scanned_mail_tenant_unread").on(t.tenantId, t.unread),
  }),
);

export const mailEvent = sqliteTable(
  "mail_event",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    mailId: text("mail_id")
      .notNull()
      .references(() => scannedMail.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["received", "ocr", "classified", "routed", "exported", "archived"],
    }).notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    byMailIdx: index("idx_mail_event_mail").on(t.mailId),
    byTenantTypeIdx: index("idx_mail_event_tenant_type").on(t.tenantId, t.type),
  }),
);

export type ScannedMail = typeof scannedMail.$inferSelect;
export type NewScannedMail = typeof scannedMail.$inferInsert;
export type MailEvent = typeof mailEvent.$inferSelect;
export type NewMailEvent = typeof mailEvent.$inferInsert;
