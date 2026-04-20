import type { CanonicalOrder } from "@opensoftware/core-types";

export interface OrderPage {
  items: CanonicalOrder[];
  nextCursor: string | null;
}

export interface OrderQuery {
  workspaceId?: string;
  customerId?: string;
  status?: CanonicalOrder["status"];
  limit?: number;
  cursor?: string;
}

export interface OrderAdapter<TLocal> {
  toCanonical(local: TLocal): CanonicalOrder;
  fromCanonical(canonical: CanonicalOrder): TLocal;
  list(query: OrderQuery): Promise<OrderPage>;
  get(id: string): Promise<CanonicalOrder | null>;
  upsert(canonical: CanonicalOrder): Promise<CanonicalOrder>;
}
