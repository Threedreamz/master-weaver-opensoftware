import type { CanonicalFile } from "@opensoftware/core-types";

export interface FilePage {
  items: CanonicalFile[];
  nextCursor: string | null;
}

export interface FileAdapter<TLocal> {
  toCanonical(local: TLocal): CanonicalFile;
  fromCanonical(canonical: CanonicalFile): TLocal;
  list(query: { workspaceId?: string; mimePrefix?: string; limit?: number; cursor?: string }): Promise<FilePage>;
  get(id: string): Promise<CanonicalFile | null>;
  upsert(canonical: CanonicalFile): Promise<CanonicalFile>;
  /** Stream content out of storage. */
  read(id: string): Promise<ReadableStream<Uint8Array> | null>;
}
