/**
 * opencam — projects-store
 *
 * Lightweight list store for `/api/projects`. Used by the project-picker and
 * workbench landing page. Create/delete mutate locally and (for create) merge
 * the server-returned record into the list head.
 */

"use client";

import { create } from "zustand";
import type { z } from "zod";
import type {
  ProjectSummary as ProjectSummarySchema,
  CreateProjectBody as CreateProjectBodySchema,
} from "@/lib/api-contracts";
import { fetcher, FetchError } from "@/lib/client-fetch";

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>;

interface ProjectsState {
  items: ProjectSummary[];
  loading: boolean;
  error: string | null;

  load: (query?: { search?: string; limit?: number }) => Promise<void>;
  create: (body: CreateProjectBody) => Promise<ProjectSummary>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
}

interface ListResponse {
  items: ProjectSummary[];
  nextCursor: string | null;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof FetchError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  async load(query) {
    set({ loading: true, error: null });
    try {
      const qs = new URLSearchParams();
      if (query?.search) qs.set("search", query.search);
      if (query?.limit) qs.set("limit", String(query.limit));
      const url = `/api/projects${qs.toString() ? `?${qs}` : ""}`;
      const res = await fetcher<ListResponse>(url);
      set({ items: res.items, loading: false });
    } catch (err) {
      set({ error: toErrorMessage(err), loading: false });
      throw err;
    }
  },

  async create(body) {
    set({ error: null });
    try {
      const created = await fetcher<ProjectSummary>("/api/projects", {
        method: "POST",
        body,
      });
      set({ items: [created, ...get().items] });
      return created;
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  async remove(id) {
    set({ error: null });
    const prev = get().items;
    // Optimistic.
    set({ items: prev.filter((p) => p.id !== id) });
    try {
      await fetcher<{ ok: true; id: string }>(
        `/api/projects/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
    } catch (err) {
      set({ items: prev, error: toErrorMessage(err) });
      throw err;
    }
  },

  reset() {
    set({ items: [], loading: false, error: null });
  },
}));
