import { z } from "zod";

export const CanonicalOrderLine = z.object({
  sku: z.string(),
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int(),
  currency: z.string().length(3),  // ISO-4217
});
export type CanonicalOrderLine = z.infer<typeof CanonicalOrderLine>;

export const CanonicalOrderStatus = z.enum([
  "draft", "pending", "confirmed", "fulfilled", "shipped", "delivered", "cancelled", "refunded",
]);
export type CanonicalOrderStatus = z.infer<typeof CanonicalOrderStatus>;

export const CanonicalOrder = z.object({
  /** Prefixed canonical id, e.g. "acct:invoice_42". */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*:.+$/),
  workspaceId: z.string().nullable(),
  customerId: z.string(),  // canonical customer id
  status: CanonicalOrderStatus,
  totalCents: z.number().int(),
  currency: z.string().length(3),
  lines: z.array(CanonicalOrderLine),
  externalIds: z.record(z.string(), z.string()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CanonicalOrder = z.infer<typeof CanonicalOrder>;
