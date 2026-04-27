/**
 * opencam — cam-store
 *
 * Zustand store that owns the currently-loaded CAM project: its operations,
 * the user's tool library, selection, and a cache of generated toolpaths.
 *
 * Mirrors the structure of apps/opencad/src/stores/workbench-store.ts but
 * with CAM semantics (operations + tools + toolpaths instead of features +
 * sketches). Server routes are same-origin Next handlers typed via
 * api-contracts.ts.
 */

"use client";

import { create } from "zustand";
import type { z } from "zod";
import type {
  ProjectDetail as ProjectDetailSchema,
  CamOperation as CamOperationSchema,
  CamOperationKind as CamOperationKindSchema,
  Tool as ToolSchema,
  ToolpathResult as ToolpathResultSchema,
  BBox as BBoxSchema,
  PostprocessResponse as PostprocessResponseSchema,
  ImportFromOpencadResponse as ImportFromOpencadResponseSchema,
} from "@/lib/api-contracts";
import { fetcher, FetchError } from "@/lib/client-fetch";

// -------------------------------------------------------------------- types

export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;
export type CamOperation = z.infer<typeof CamOperationSchema>;
export type CamOperationKind = z.infer<typeof CamOperationKindSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type ToolpathResult = z.infer<typeof ToolpathResultSchema>;
export type BBox = z.infer<typeof BBoxSchema>;
export type PostprocessResponse = z.infer<typeof PostprocessResponseSchema>;
export type ImportFromOpencadResponse = z.infer<typeof ImportFromOpencadResponseSchema>;

interface OperationListResponse {
  items: CamOperation[];
}

interface ToolListResponse {
  items: Tool[];
}

export interface AddOperationArgs {
  kind: CamOperationKind;
  toolId: string;
  feedMmMin: number;
  spindleRpm: number;
  paramsJson?: Record<string, unknown>;
  stepoverMm?: number;
  stepdownMm?: number;
}

export interface ImportFromOpencadArgs {
  openCadProjectId: string;
  role: "stock" | "part";
  format?: "step" | "stl";
  versionId?: string;
}

// ------------------------------------------------------------------- helpers

function toErrorMessage(err: unknown): string {
  if (err instanceof FetchError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

// -------------------------------------------------------------------- state

interface CamState {
  projectId: string | null;
  project: ProjectDetail | null;
  operations: CamOperation[];
  tools: Tool[];
  selectedOperationId: string | null;
  toolpaths: Record<string, ToolpathResult>;
  loading: boolean;
  error: string | null;

  // actions
  loadProject: (id: string) => Promise<void>;
  loadTools: () => Promise<void>;
  addOperation: (op: AddOperationArgs) => Promise<void>;
  updateOperation: (id: string, patch: Partial<CamOperation>) => Promise<void>;
  deleteOperation: (id: string) => Promise<void>;
  selectOperation: (id: string | null) => void;
  generateToolpath: (operationId: string) => Promise<ToolpathResult>;
  postprocessAll: (postId: string) => Promise<{ gcodeId: string; lineCount: number }>;
  importFromOpencad: (
    body: ImportFromOpencadArgs,
  ) => Promise<{ projectId: string; bbox: BBox }>;
  reset: () => void;
}

const initialState = {
  projectId: null as string | null,
  project: null as ProjectDetail | null,
  operations: [] as CamOperation[],
  tools: [] as Tool[],
  selectedOperationId: null as string | null,
  toolpaths: {} as Record<string, ToolpathResult>,
  loading: false,
  error: null as string | null,
};

// -------------------------------------------------------------------- store

export const useCamStore = create<CamState>((set, get) => ({
  ...initialState,

  async loadProject(id) {
    set({ loading: true, error: null, projectId: id });
    try {
      const [project, opsRes] = await Promise.all([
        fetcher<ProjectDetail>(`/api/projects/${encodeURIComponent(id)}`),
        fetcher<OperationListResponse>(
          `/api/operations?projectId=${encodeURIComponent(id)}`,
        ),
      ]);
      const operations = [...opsRes.items].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      set({
        project,
        operations,
        selectedOperationId: null,
        toolpaths: {},
        loading: false,
      });
    } catch (err) {
      set({ error: toErrorMessage(err), loading: false });
      throw err;
    }
  },

  async loadTools() {
    set({ error: null });
    try {
      const res = await fetcher<ToolListResponse>("/api/tools");
      set({ tools: res.items });
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  async addOperation(op) {
    const projectId = get().projectId;
    if (!projectId) throw new Error("No active project");
    set({ error: null });
    try {
      const created = await fetcher<CamOperation>("/api/operations", {
        method: "POST",
        body: {
          projectId,
          operation: {
            kind: op.kind,
            toolId: op.toolId,
            feedMmMin: op.feedMmMin,
            spindleRpm: op.spindleRpm,
            stepoverMm: op.stepoverMm,
            stepdownMm: op.stepdownMm,
            paramsJson: op.paramsJson ?? {},
          },
        },
      });
      set((s) => ({
        operations: [...s.operations, created].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        ),
        selectedOperationId: created.id,
      }));
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  async updateOperation(id, patch) {
    set({ error: null });
    const prev = get().operations;
    // Optimistic update.
    set({
      operations: prev.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
    try {
      const updated = await fetcher<CamOperation>(
        `/api/operations/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: {
            kind: patch.kind,
            toolId: patch.toolId,
            feedMmMin: patch.feedMmMin,
            spindleRpm: patch.spindleRpm,
            stepoverMm: patch.stepoverMm,
            stepdownMm: patch.stepdownMm,
            paramsJson: patch.paramsJson,
          },
        },
      );
      set((s) => ({
        operations: s.operations
          .map((o) => (o.id === id ? updated : o))
          .sort((a, b) => a.sortOrder - b.sortOrder),
        // Invalidate cached toolpath for this op.
        toolpaths: Object.fromEntries(
          Object.entries(s.toolpaths).filter(([k]) => k !== id),
        ),
      }));
    } catch (err) {
      set({ operations: prev, error: toErrorMessage(err) });
      throw err;
    }
  },

  async deleteOperation(id) {
    set({ error: null });
    const prev = get().operations;
    const prevSelected = get().selectedOperationId;
    set({
      operations: prev.filter((o) => o.id !== id),
      selectedOperationId: prevSelected === id ? null : prevSelected,
    });
    try {
      await fetcher<{ ok: true }>(
        `/api/operations/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      set((s) => ({
        toolpaths: Object.fromEntries(
          Object.entries(s.toolpaths).filter(([k]) => k !== id),
        ),
      }));
    } catch (err) {
      set({
        operations: prev,
        selectedOperationId: prevSelected,
        error: toErrorMessage(err),
      });
      throw err;
    }
  },

  selectOperation(id) {
    set({ selectedOperationId: id });
  },

  async generateToolpath(operationId) {
    set({ error: null });
    try {
      const res = await fetcher<ToolpathResult>(
        `/api/operations/${encodeURIComponent(operationId)}/generate`,
        { method: "POST" },
      );
      set((s) => ({ toolpaths: { ...s.toolpaths, [operationId]: res } }));
      return res;
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  async postprocessAll(postId) {
    const projectId = get().projectId;
    if (!projectId) throw new Error("No active project");
    const operationIds = get().operations.map((o) => o.id);
    if (operationIds.length === 0) throw new Error("No operations to post-process");
    set({ error: null });
    try {
      const res = await fetcher<PostprocessResponse>("/api/postprocess", {
        method: "POST",
        body: { projectId, operationIds, postId },
      });
      return { gcodeId: res.gcodeId, lineCount: res.lineCount };
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  async importFromOpencad(body) {
    set({ error: null });
    try {
      const res = await fetcher<ImportFromOpencadResponse>(
        "/api/opencad/import",
        {
          method: "POST",
          body: {
            openCadProjectId: body.openCadProjectId,
            role: body.role,
            format: body.format ?? "stl",
            versionId: body.versionId,
          },
        },
      );
      return { projectId: res.projectId, bbox: res.bbox };
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  reset() {
    set({ ...initialState });
  },
}));

// ------------------------------------------------------------ selector hooks

export const useSelectedOperation = (): CamOperation | null =>
  useCamStore((s) =>
    s.selectedOperationId
      ? s.operations.find((o) => o.id === s.selectedOperationId) ?? null
      : null,
  );

export const useToolById = (id: string | null): Tool | null =>
  useCamStore((s) =>
    id ? s.tools.find((t) => t.id === id) ?? null : null,
  );
