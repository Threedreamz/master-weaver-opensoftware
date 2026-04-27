/**
 * opencad — projects-store
 *
 * Lightweight Zustand store that mirrors `/api/projects` list state. Used by
 * the dashboard/project picker. Mutation actions re-fetch rather than patching
 * locally so list stays in sync with server cursors + counts.
 */

"use client";

import { create } from "zustand";
import type { z } from "zod";
import type {
  ProjectSummary as ProjectSummarySchema,
  CreateProjectBody,
} from "../lib/api-contracts";
import { fetcher, FetchError } from "../lib/client-fetch";

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type ProjectTemplate = z.infer<typeof CreateProjectBody>["template"];
export type ProjectUnits = z.infer<typeof CreateProjectBody>["units"];

interface ProjectsState {
  items: ProjectSummary[];
  nextCursor: string | null;
  loading: boolean;
  error: string | null;

  loadAll: (opts?: { search?: string; limit?: number }) => Promise<void>;
  loadMore: () => Promise<void>;
  create: (
    name: string,
    template?: ProjectTemplate,
    options?: { description?: string; units?: ProjectUnits },
  ) => Promise<ProjectSummary>;
  deleteProject: (id: string) => Promise<void>;
  reset: () => void;
}

interface ListResponse {
  items: ProjectSummary[];
  nextCursor: string | null;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  items: [],
  nextCursor: null,
  loading: false,
  error: null,

  async loadAll(opts) {
    set({ loading: true, error: null });
    try {
      const qs = new URLSearchParams();
      if (opts?.search) qs.set("search", opts.search);
      if (opts?.limit) qs.set("limit", String(opts.limit));
      const url = `/api/projects${qs.toString() ? `?${qs}` : ""}`;
      const res = await fetcher<ListResponse>(url);
      set({ items: res.items, nextCursor: res.nextCursor, loading: false });
    } catch (err) {
      const message = err instanceof FetchError ? err.message : String(err);
      set({ error: message, loading: false });
      throw err;
    }
  },

  async loadMore() {
    const cursor = get().nextCursor;
    if (!cursor || get().loading) return;
    set({ loading: true, error: null });
    try {
      const res = await fetcher<ListResponse>(`/api/projects?cursor=${encodeURIComponent(cursor)}`);
      set({
        items: [...get().items, ...res.items],
        nextCursor: res.nextCursor,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof FetchError ? err.message : String(err);
      set({ error: message, loading: false });
      throw err;
    }
  },

  async create(name, template = "blank", options) {
    set({ error: null });
    try {
      const created = await fetcher<ProjectSummary>("/api/projects", {
        method: "POST",
        body: {
          name,
          template,
          description: options?.description,
          units: options?.units ?? "mm",
        },
      });
      set({ items: [created, ...get().items] });
      return created;
    } catch (err) {
      const message = err instanceof FetchError ? err.message : String(err);
      set({ error: message });
      throw err;
    }
  },

  async deleteProject(id) {
    set({ error: null });
    // Optimistic remove — restore on failure.
    const prev = get().items;
    set({ items: prev.filter((p) => p.id !== id) });
    try {
      await fetcher<{ ok: true; id: string }>(`/api/projects/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (err) {
      const message = err instanceof FetchError ? err.message : String(err);
      set({ items: prev, error: message });
      throw err;
    }
  },

  reset() {
    set({ items: [], nextCursor: null, loading: false, error: null });
  },
}));
