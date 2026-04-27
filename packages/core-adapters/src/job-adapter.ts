import type { CanonicalJob } from "@opensoftware/core-types";

export interface JobPage {
  items: CanonicalJob[];
  nextCursor: string | null;
}

export interface JobAdapter<TLocal> {
  toCanonical(local: TLocal): CanonicalJob;
  fromCanonical(canonical: CanonicalJob): TLocal;
  list(query: { workspaceId?: string; kind?: string; status?: CanonicalJob["status"]; limit?: number; cursor?: string }): Promise<JobPage>;
  get(id: string): Promise<CanonicalJob | null>;
  enqueue(input: { kind: string; workspaceId?: string; input: Record<string, unknown> }): Promise<CanonicalJob>;
  cancel(id: string): Promise<void>;
}
