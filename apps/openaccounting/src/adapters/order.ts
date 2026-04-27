/**
 * openaccounting → CanonicalOrder adapter.
 *
 * Native: `acct_orders` (integer PK, items jsonb, status enum DE phrasing).
 * See packages/db/src/openaccounting.schema.ts.
 *
 * Canonical id prefix: "acct-order:<integer>" — disambiguates from
 * customers which use "acct:".
 *
 * Status mapping (native → canonical):
 *   neu             → pending
 *   in_bearbeitung  → confirmed
 *   in_produktion   → fulfilled
 *   versendet       → shipped
 *   abgeschlossen   → delivered
 *   storniert       → cancelled
 *
 * Amounts: native stores floats (EUR). Canonical uses integer cents.
 * Currency defaults to EUR — the native schema has no currency column but
 * the taxRate (19.0) + language (German) makes this a safe default.
 */
import { randomUUID } from "node:crypto";
import {
  CanonicalOrder,
  CanonicalOrderLine,
  CanonicalOrderStatus,
  makeCanonicalId,
  parseCanonicalId,
} from "@opensoftware/core-types";
import type {
  OrderAdapter,
  OrderPage,
  OrderQuery,
} from "@opensoftware/core-adapters";
import type { Publisher } from "@opensoftware/openpipeline-client";

const PREFIX = "acct-order";
const CUSTOMER_PREFIX = "acct";
const DEFAULT_CURRENCY = "EUR";

type NativeStatus = "neu" | "in_bearbeitung" | "in_produktion" | "versendet" | "abgeschlossen" | "storniert";

export interface AcctOrderItem {
  beschreibung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  gesamtpreis: number;
  /** Optional SKU the UI may add later — canonical accepts empty string. */
  sku?: string;
}

export interface AcctOrderRow {
  id: number;
  number: string;
  customerId: number | null;
  items: AcctOrderItem[] | null;
  netAmount: number;
  taxAmount: number;
  grossAmount: number;
  status: NativeStatus | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const NATIVE_TO_CANONICAL_STATUS: Record<NativeStatus, CanonicalOrderStatus> = {
  neu: "pending",
  in_bearbeitung: "confirmed",
  in_produktion: "fulfilled",
  versendet: "shipped",
  abgeschlossen: "delivered",
  storniert: "cancelled",
};

const CANONICAL_TO_NATIVE_STATUS: Record<CanonicalOrderStatus, NativeStatus> = {
  draft: "neu",
  pending: "neu",
  confirmed: "in_bearbeitung",
  fulfilled: "in_produktion",
  shipped: "versendet",
  delivered: "abgeschlossen",
  cancelled: "storniert",
  refunded: "storniert",
};

/** Round float euros to int cents — avoids floating-point drift on upsert. */
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Pure mapper: native row → canonical wire format. */
export function toCanonicalOrder(row: AcctOrderRow): CanonicalOrder {
  const items = row.items ?? [];
  const lines: CanonicalOrderLine[] = items.map((it) => ({
    sku: it.sku ?? "",
    description: it.beschreibung,
    quantity: it.menge,
    unitPriceCents: toCents(it.einzelpreis),
    currency: DEFAULT_CURRENCY,
  }));
  const createdAt = toIso(row.createdAt ?? new Date().toISOString());
  const updatedAt = toIso(row.updatedAt ?? createdAt);
  return {
    id: makeCanonicalId(PREFIX, row.id),
    workspaceId: null,
    customerId: row.customerId != null ? makeCanonicalId(CUSTOMER_PREFIX, row.customerId) : "",
    status: NATIVE_TO_CANONICAL_STATUS[row.status ?? "neu"],
    totalCents: toCents(row.grossAmount),
    currency: DEFAULT_CURRENCY,
    lines,
    externalIds: { orderNumber: row.number },
    createdAt,
    updatedAt,
  };
}

/** Pure mapper: canonical → native row shape (id optional on insert). */
export function fromCanonicalOrder(c: CanonicalOrder): Omit<AcctOrderRow, "id"> & { id?: number } {
  const { prefix, local } = parseCanonicalId(c.id);
  if (prefix !== PREFIX) {
    throw new Error(`Cannot map canonical id from prefix "${prefix}" into openaccounting orders (expected "${PREFIX}")`);
  }
  const numericId = Number.parseInt(local, 10);
  const items: AcctOrderItem[] = c.lines.map((l) => ({
    beschreibung: l.description,
    menge: l.quantity,
    einheit: "Stück",
    einzelpreis: l.unitPriceCents / 100,
    gesamtpreis: (l.unitPriceCents * l.quantity) / 100,
    sku: l.sku || undefined,
  }));
  const grossAmount = c.totalCents / 100;
  // Best-effort net / tax split using the canonical 19% VAT default. Real
  // upsert flows should compute these from line items before calling us —
  // this fallback just keeps the schema NOT NULL columns satisfied.
  const netAmount = Number((grossAmount / 1.19).toFixed(2));
  const taxAmount = Number((grossAmount - netAmount).toFixed(2));
  return {
    id: Number.isFinite(numericId) ? numericId : undefined,
    number: c.externalIds.orderNumber ?? local,
    customerId: c.customerId ? extractCustomerId(c.customerId) : null,
    items,
    netAmount,
    taxAmount,
    grossAmount,
    status: CANONICAL_TO_NATIVE_STATUS[c.status],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function extractCustomerId(canonicalId: string): number | null {
  try {
    const { prefix, local } = parseCanonicalId(canonicalId);
    if (prefix !== CUSTOMER_PREFIX) return null;
    const n = Number.parseInt(local, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function toIso(s: string): string {
  // SQLite's `(datetime('now'))` returns "YYYY-MM-DD HH:MM:SS" without T/timezone.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return s.replace(" ", "T") + "Z";
  }
  return s;
}

export interface AcctOrderStore {
  list(query: OrderQuery): Promise<{ rows: AcctOrderRow[]; nextCursor: string | null }>;
  get(id: number): Promise<AcctOrderRow | null>;
  upsert(row: Omit<AcctOrderRow, "id"> & { id?: number }): Promise<AcctOrderRow>;
}

export interface OrderAdapterOptions {
  store: AcctOrderStore;
  /** Optional openpipeline publisher for cross-module events. */
  publisher?: Publisher;
}

export function createOrderAdapter(
  opts: OrderAdapterOptions | AcctOrderStore,
): OrderAdapter<AcctOrderRow> {
  const config: OrderAdapterOptions = "store" in opts ? opts : { store: opts };
  const { store, publisher } = config;

  return {
    toCanonical: toCanonicalOrder,
    fromCanonical: fromCanonicalOrder,

    async list(query): Promise<OrderPage> {
      const { rows, nextCursor } = await store.list(query);
      return { items: rows.map(toCanonicalOrder), nextCursor };
    },

    async get(canonicalId) {
      const { local } = parseCanonicalId(canonicalId);
      const n = Number.parseInt(local, 10);
      if (!Number.isFinite(n)) return null;
      const row = await store.get(n);
      return row ? toCanonicalOrder(row) : null;
    },

    async upsert(canonical) {
      const priorRow = (() => {
        try {
          const n = Number.parseInt(parseCanonicalId(canonical.id).local, 10);
          return Number.isFinite(n) ? store.get(n) : Promise.resolve(null);
        } catch {
          return Promise.resolve(null);
        }
      })();
      const priorCanonical = (await priorRow) ? toCanonicalOrder(await priorRow as AcctOrderRow) : null;
      const written = await store.upsert(fromCanonicalOrder(canonical));
      const out = toCanonicalOrder(written);

      if (publisher) {
        // First-time placement: fire order.placed.
        if (!priorCanonical) {
          await publisher.emit({
            type: "order.placed",
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
            source: "openaccounting",
            workspaceId: null,
            payload: out,
          });
        } else if (
          // Status just transitioned into shipped — fire order.shipped.
          priorCanonical.status !== "shipped" && out.status === "shipped"
        ) {
          await publisher.emit({
            type: "order.shipped",
            eventId: randomUUID(),
            occurredAt: new Date().toISOString(),
            source: "openaccounting",
            workspaceId: null,
            payload: out,
            trackingNumber: null,
          });
        }
      }

      return out;
    },
  };
}
