/**
 * opencad — workbench-store
 *
 * Single Zustand store that owns the open project, its feature tree, the
 * current sketch editor (if any), selection, and cached evaluated geometry.
 *
 * All mutations (add/update/delete/reorder feature) chain a call to
 * evaluate() so the Viewport stays in lockstep with the tree. Callers that
 * know they'll batch many edits can pass evaluate({ dryRun: true }) or call
 * evaluate() manually at the end.
 *
 * API routes are proxied via `/api/...` (same-origin Next.js handlers).
 * Server responses are typed via api-contracts.ts.
 */

"use client";

import { create } from "zustand";
import type { z } from "zod";
import type {
  ProjectDetail as ProjectDetailSchema,
  FeatureEvaluateResponse as FeatureEvaluateResponseSchema,
  SketchEntity as SketchEntitySchema,
  SketchConstraint as SketchConstraintSchema,
  SketchSolveResponse as SketchSolveResponseSchema,
  ExportFormat,
  HandoffOpenslicerResponse as HandoffOpenslicerResponseSchema,
  BBox as BBoxSchema,
} from "../lib/api-contracts";
import { fetcher, FetchError } from "../lib/client-fetch";
import { unionBBox } from "../lib/geometry-client";

// -------------------------------------------------------------------- types

export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;
export type FeatureEvaluateResponse = z.infer<typeof FeatureEvaluateResponseSchema>;
export type SketchEntity = z.infer<typeof SketchEntitySchema>;
export type SketchConstraint = z.infer<typeof SketchConstraintSchema>;
export type SketchSolveResponse = z.infer<typeof SketchSolveResponseSchema>;
export type BBox = z.infer<typeof BBoxSchema>;
export type ExportFormatKind = z.infer<typeof ExportFormat>;
export type HandoffOpenslicerResponse = z.infer<typeof HandoffOpenslicerResponseSchema>;

/**
 * FeatureKind — open union of primitive/modifier feature types understood by
 * opencad-core. Kept as `string` here so new kinds can land in the server
 * evaluator without churning the client store; refine to an enum once the
 * set is stable.
 */
export type FeatureKind =
  | "sketch"
  | "extrude"
  | "revolve"
  | "loft"
  | "sweep"
  | "fillet"
  | "chamfer"
  | "shell"
  | "boolean-union"
  | "boolean-subtract"
  | "boolean-intersect"
  | "mirror"
  | "pattern-linear"
  | "pattern-circular"
  | "import"
  | (string & {});

export interface WorkbenchFeature {
  id: string;
  kind: string;
  paramsJson: Record<string, unknown>;
  positions?: Float32Array;
  indices?: Uint32Array;
  bbox?: BBox;
  parentIds: string[];
  order: number;
}

export interface Sketch {
  id: string;
  planeRef: string;
  entities: SketchEntity[];
  constraints: SketchConstraint[];
}

// ---------------------------------------------------------------- feature IO
// Server → client feature shape on /api/feature/* endpoints. Mesh arrays are
// plain number[]; we hoist to typed arrays client-side for Three.js.
interface FeatureDTO {
  id: string;
  kind: string;
  paramsJson: Record<string, unknown>;
  parentIds: string[];
  order: number;
  mesh?: {
    positions: number[];
    indices: number[];
    bbox?: BBox;
  };
}

interface FeatureListResponse {
  features: FeatureDTO[];
}

interface FeatureMutateResponse {
  feature: FeatureDTO;
}

function dtoToFeature(dto: FeatureDTO): WorkbenchFeature {
  return {
    id: dto.id,
    kind: dto.kind,
    paramsJson: dto.paramsJson,
    parentIds: dto.parentIds,
    order: dto.order,
    positions: dto.mesh ? new Float32Array(dto.mesh.positions) : undefined,
    indices: dto.mesh ? new Uint32Array(dto.mesh.indices) : undefined,
    bbox: dto.mesh?.bbox,
  };
}

// ----------------------------------------------------------------- state

interface WorkbenchState {
  projectId: string | null;
  project: ProjectDetail | null;
  features: WorkbenchFeature[];
  activeSketch: Sketch | null;
  selectedFeatureId: string | null;
  dirty: boolean;
  loading: boolean;
  error: string | null;
  bbox: BBox | null;
  triangleCount: number;

  // actions
  loadProject: (id: string) => Promise<void>;
  evaluate: (opts?: { dryRun?: boolean; fromFeatureId?: string }) => Promise<void>;
  selectFeature: (id: string | null) => void;
  addFeature: (
    kind: FeatureKind,
    params: Record<string, unknown>,
    parents: string[],
  ) => Promise<WorkbenchFeature>;
  updateFeatureParams: (id: string, params: Record<string, unknown>) => Promise<void>;
  deleteFeature: (id: string) => Promise<void>;
  reorderFeatures: (fromIdx: number, toIdx: number) => Promise<void>;
  startSketch: (planeRef: string) => void;
  updateSketch: (sketch: Sketch) => void;
  cancelSketch: () => void;
  commitSketch: (sketch: Sketch) => Promise<void>;
  solveSketch: () => Promise<SketchSolveResponse>;
  exportProject: (format: ExportFormatKind) => Promise<Blob>;
  handoffToSlicer: () => Promise<{ url: string; modelId: string }>;
  reset: () => void;
}

const initialState = {
  projectId: null as string | null,
  project: null as ProjectDetail | null,
  features: [] as WorkbenchFeature[],
  activeSketch: null as Sketch | null,
  selectedFeatureId: null as string | null,
  dirty: false,
  loading: false,
  error: null as string | null,
  bbox: null as BBox | null,
  triangleCount: 0,
};

function toErrorMessage(err: unknown): string {
  if (err instanceof FetchError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

// -------------------------------------------------------------------- store

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  ...initialState,

  async loadProject(id) {
    set({ loading: true, error: null, projectId: id });
    try {
      const [project, featuresRes] = await Promise.all([
        fetcher<ProjectDetail>(`/api/projects/${encodeURIComponent(id)}`),
        fetcher<FeatureListResponse>(`/api/projects/${encodeURIComponent(id)}/features`),
      ]);

      const features = featuresRes.features
        .map(dtoToFeature)
        .sort((a, b) => a.order - b.order);

      const bbox = features.reduce<BBox | null>(
        (acc, f) => unionBBox(acc, f.bbox ?? null),
        project.bbox ?? null,
      );

      const triangleCount = features.reduce(
        (sum, f) => sum + (f.indices ? f.indices.length / 3 : 0),
        0,
      );

      set({
        project,
        features,
        bbox,
        triangleCount,
        loading: false,
        dirty: false,
        selectedFeatureId: null,
        activeSketch: null,
      });
    } catch (err) {
      set({ error: toErrorMessage(err), loading: false });
      throw err;
    }
  },

  async evaluate(opts) {
    const projectId = get().projectId;
    if (!projectId) return;
    set({ loading: true, error: null });
    try {
      const res = await fetcher<
        FeatureEvaluateResponse & { features?: FeatureDTO[] }
      >("/api/feature/evaluate", {
        method: "POST",
        body: {
          projectId,
          dryRun: opts?.dryRun ?? false,
          fromFeatureId: opts?.fromFeatureId,
        },
      });

      // Server returns evaluated feature meshes on `features` when not dryRun.
      // Fall back to the current cache if omitted.
      let features = get().features;
      if (res.features?.length) {
        const byId = new Map(features.map((f) => [f.id, f] as const));
        for (const dto of res.features) {
          byId.set(dto.id, dtoToFeature(dto));
        }
        features = Array.from(byId.values()).sort((a, b) => a.order - b.order);
      }

      set({
        features,
        bbox: res.bbox ?? null,
        triangleCount: res.triangleCount,
        loading: false,
        dirty: opts?.dryRun ? get().dirty : false,
      });

      if (res.errors.length > 0) {
        // Surface first error as non-fatal; keep state otherwise intact.
        set({ error: res.errors.map((e) => `[${e.featureId}] ${e.message}`).join("; ") });
      }
    } catch (err) {
      set({ error: toErrorMessage(err), loading: false });
      throw err;
    }
  },

  selectFeature(id) {
    set({ selectedFeatureId: id });
  },

  async addFeature(kind, params, parents) {
    const projectId = get().projectId;
    if (!projectId) throw new Error("No active project");
    set({ error: null });
    try {
      const res = await fetcher<FeatureMutateResponse>(
        `/api/projects/${encodeURIComponent(projectId)}/features`,
        {
          method: "POST",
          body: { kind, paramsJson: params, parentIds: parents },
        },
      );
      const feature = dtoToFeature(res.feature);
      set((s) => ({
        features: [...s.features, feature].sort((a, b) => a.order - b.order),
        selectedFeatureId: feature.id,
        dirty: true,
      }));
      await get().evaluate();
      return feature;
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  async updateFeatureParams(id, params) {
    const projectId = get().projectId;
    if (!projectId) throw new Error("No active project");
    set({ error: null });
    // Optimistic params update — evaluate() will supply authoritative mesh.
    const prev = get().features;
    set({
      features: prev.map((f) => (f.id === id ? { ...f, paramsJson: params } : f)),
      dirty: true,
    });
    try {
      await fetcher(
        `/api/projects/${encodeURIComponent(projectId)}/features/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: { paramsJson: params },
        },
      );
      await get().evaluate({ fromFeatureId: id });
    } catch (err) {
      set({ features: prev, error: toErrorMessage(err) });
      throw err;
    }
  },

  async deleteFeature(id) {
    const projectId = get().projectId;
    if (!projectId) throw new Error("No active project");
    set({ error: null });
    const prev = get().features;
    set({
      features: prev.filter((f) => f.id !== id),
      selectedFeatureId: get().selectedFeatureId === id ? null : get().selectedFeatureId,
      dirty: true,
    });
    try {
      await fetcher(
        `/api/projects/${encodeURIComponent(projectId)}/features/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      await get().evaluate();
    } catch (err) {
      set({ features: prev, error: toErrorMessage(err) });
      throw err;
    }
  },

  async reorderFeatures(fromIdx, toIdx) {
    const projectId = get().projectId;
    if (!projectId) throw new Error("No active project");
    const prev = get().features;
    if (
      fromIdx < 0 ||
      fromIdx >= prev.length ||
      toIdx < 0 ||
      toIdx >= prev.length ||
      fromIdx === toIdx
    ) {
      return;
    }
    const next = prev.slice();
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const reordered = next.map((f, i) => ({ ...f, order: i }));
    set({ features: reordered, dirty: true, error: null });
    try {
      await fetcher(
        `/api/projects/${encodeURIComponent(projectId)}/features/reorder`,
        {
          method: "POST",
          body: { order: reordered.map((f) => f.id) },
        },
      );
      await get().evaluate();
    } catch (err) {
      set({ features: prev, error: toErrorMessage(err) });
      throw err;
    }
  },

  startSketch(planeRef) {
    set({
      activeSketch: {
        id: `sketch-${Date.now().toString(36)}`,
        planeRef,
        entities: [],
        constraints: [],
      },
    });
  },

  updateSketch(sketch) {
    set({ activeSketch: sketch, dirty: true });
  },

  cancelSketch() {
    set({ activeSketch: null });
  },

  async commitSketch(sketch) {
    const projectId = get().projectId;
    if (!projectId) throw new Error("No active project");
    set({ error: null });
    try {
      await get().addFeature("sketch", {
        sketchId: sketch.id,
        planeRef: sketch.planeRef,
        entities: sketch.entities,
        constraints: sketch.constraints,
      }, []);
      set({ activeSketch: null });
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  async solveSketch() {
    const sketch = get().activeSketch;
    if (!sketch) throw new Error("No active sketch");
    set({ error: null });
    try {
      const res = await fetcher<SketchSolveResponse>("/api/sketch/solve", {
        method: "POST",
        body: {
          entities: sketch.entities,
          constraints: sketch.constraints,
        },
      });
      // Update entity positions from solver output.
      const nextEntities = sketch.entities.map((e) => {
        if (e.kind !== "point") return e;
        const solved = res.entities.find((s) => s.id === e.id);
        if (solved && solved.x !== undefined && solved.y !== undefined) {
          return { ...e, x: solved.x, y: solved.y };
        }
        return e;
      });
      set({ activeSketch: { ...sketch, entities: nextEntities } });
      return res;
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  async exportProject(format) {
    const projectId = get().projectId;
    if (!projectId) throw new Error("No active project");
    set({ error: null });
    try {
      const res = await fetcher<Response>(
        `/api/projects/${encodeURIComponent(projectId)}/export/${format}`,
        { asStream: true },
      );
      return await res.blob();
    } catch (err) {
      set({ error: toErrorMessage(err) });
      throw err;
    }
  },

  async handoffToSlicer() {
    const projectId = get().projectId;
    if (!projectId) throw new Error("No active project");
    set({ error: null });
    try {
      const res = await fetcher<HandoffOpenslicerResponse>("/api/handoff/openslicer", {
        method: "POST",
        body: { projectId },
      });
      return { url: res.openslicerUrl, modelId: res.openslicerModelId };
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
// Small helpers so components subscribe to narrow slices and avoid re-renders.

export const useSelectedFeature = (): WorkbenchFeature | null =>
  useWorkbenchStore((s) => {
    if (!s.selectedFeatureId) return null;
    return s.features.find((f) => f.id === s.selectedFeatureId) ?? null;
  });

export const useFeatureById = (id: string | null | undefined): WorkbenchFeature | null =>
  useWorkbenchStore((s) => (id ? s.features.find((f) => f.id === id) ?? null : null));
