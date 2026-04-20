/**
 * opencad — feature timeline (deterministic tree evaluator, M1)
 *
 * Loads a project's feature list from SQLite, topologically sorts by parentIds,
 * and evaluates each node by dispatching to the cad-kernel (boxes, extrudes,
 * booleans, fillets, chamfers). Every node's output is content-addressed via
 * hashFeature(kind + paramsJson + sorted parent hashes + parameterOverrides)
 * and cached in geometry-cache to make re-evaluation cheap.
 *
 * Errors in one branch don't halt the run — downstream nodes whose ancestry
 * is still clean continue evaluating. Failures are reported per-feature in
 * the response `errors` array.
 *
 * Pure Node runtime. No browser imports. Consumed by /api/feature/evaluate.
 */

import { performance } from "node:perf_hooks";
import { eq, asc } from "drizzle-orm";
import * as THREE from "three";

import { db, schema } from "@/db";
import type { OpencadFeature } from "@opensoftware/db/opencad";
import type { z } from "zod";
import type { FeatureEvaluateResponse as FeatureEvaluateResponseSchema, BBox as BBoxSchema } from "./api-contracts";

import { topoSort, buildDAG, type DAG } from "./feature-dag";
import { hashFeature, hashContent } from "./hash";
import {
  getCachedGeometry,
  setCachedGeometry,
  type SerializedGeometry,
} from "./geometry-cache";
import {
  createBox,
  extrudeProfile,
  booleanOp,
  fillet,
  chamfer,
  tessellate,
  exportBoundingBox,
  serializeGeometry,
  deserializeGeometry,
  computeVolumeMm3,
  type SolidResult,
  type Point2,
  type TessellationQuality,
  type BooleanOpKind,
} from "./cad-kernel";

type FeatureEvaluateResponse = z.infer<typeof FeatureEvaluateResponseSchema>;
type BBox = z.infer<typeof BBoxSchema>;

type EvalOpts = {
  fromFeatureId?: string;
  parameterOverrides?: Record<string, unknown>;
  dryRun?: boolean;
};

type EvalResult = {
  solid: SolidResult | null;
  bbox: BBox | null;
  triangleCount: number;
  contentHash: string;
};

/* -------------------------------------------------------------------- utils */

/** Canonical JSON stringify (sorted keys) — required so hash is deterministic
 * even when the client writes paramsJson with keys in a different order. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

/** Apply parameter overrides by shallow key-matching on paramsJson. Keys not
 * present in the feature's params are ignored — overrides are broadcast across
 * the tree and each feature picks up only the names it knows about. */
function applyOverrides(
  params: Record<string, unknown>,
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  if (!overrides) return params;
  const merged: Record<string, unknown> = { ...params };
  for (const key of Object.keys(overrides)) {
    if (key in merged) merged[key] = overrides[key];
  }
  return merged;
}

function unionBBox(a: BBox | null, b: BBox | null): BBox | null {
  if (!a) return b;
  if (!b) return a;
  return {
    min: { x: Math.min(a.min.x, b.min.x), y: Math.min(a.min.y, b.min.y), z: Math.min(a.min.z, b.min.z) },
    max: { x: Math.max(a.max.x, b.max.x), y: Math.max(a.max.y, b.max.y), z: Math.max(a.max.z, b.max.z) },
  };
}

/** Count triangles in a BufferGeometry (index-count/3 or position-count/3). */
function triangleCountOf(geom: THREE.BufferGeometry): number {
  const idx = geom.getIndex();
  if (idx) return Math.floor(idx.count / 3);
  const pos = geom.getAttribute("position");
  return pos ? Math.floor(pos.count / 3) : 0;
}

/** Coerce an unknown params.profile into a Point2[] (tolerant of missing data). */
function coerceProfile(raw: unknown): Point2[] {
  if (!Array.isArray(raw)) return [];
  const out: Point2[] = [];
  for (const p of raw) {
    if (p && typeof p === "object") {
      const x = (p as { x?: unknown }).x;
      const y = (p as { y?: unknown }).y;
      if (typeof x === "number" && typeof y === "number") out.push({ x, y });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- kernel op */

/**
 * Dispatch a single feature to the kernel. Caller is responsible for having
 * already resolved parent solids (they're passed via `parentSolids`, in the
 * same order as feature.parentIds).
 */
function evaluateFeature(
  feature: OpencadFeature,
  params: Record<string, unknown>,
  parentSolids: SolidResult[],
): { solid: SolidResult; bbox: BBox; triangleCount: number } {
  let solid: SolidResult;

  switch (feature.kind) {
    case "extrude": {
      // Box shorthand if params look like a box (width/height/depth); otherwise
      // treat as a profile extrusion.
      if (
        typeof params.width === "number" &&
        typeof params.height === "number" &&
        typeof params.depth === "number"
      ) {
        solid = createBox(
          params.width as number,
          params.height as number,
          params.depth as number,
        );
      } else {
        const profile = coerceProfile(params.profile);
        const height =
          (typeof params.distance === "number" ? (params.distance as number) : undefined) ??
          (typeof params.height === "number" ? (params.height as number) : 1);
        solid = extrudeProfile(profile, height);
      }
      break;
    }
    case "revolve": {
      // Revolve is not fully wired to revolveProfile here (profile must be 2D);
      // approximate with extrudeProfile as a safe fallback.
      const profile = coerceProfile(params.profile);
      const height = typeof params.height === "number" ? (params.height as number) : 1;
      solid = extrudeProfile(profile, height);
      break;
    }
    case "cut":
    case "boolean": {
      if (parentSolids.length < 2) {
        throw new Error(`${feature.kind} requires 2+ parent features, got ${parentSolids.length}`);
      }
      const op: BooleanOpKind =
        feature.kind === "cut"
          ? "subtract"
          : ((params.op as BooleanOpKind | undefined) ?? "union");
      solid = booleanOp(parentSolids[0].mesh, parentSolids[1].mesh, op);
      // Fold any further parents into the result (n-ary union/intersect).
      for (let i = 2; i < parentSolids.length; i++) {
        solid = booleanOp(solid.mesh, parentSolids[i].mesh, op);
      }
      break;
    }
    case "fillet": {
      if (parentSolids.length < 1) throw new Error("fillet requires 1 parent feature");
      const radius = typeof params.radius === "number" ? (params.radius as number) : 1;
      solid = fillet(parentSolids[0].mesh, radius);
      break;
    }
    case "chamfer": {
      if (parentSolids.length < 1) throw new Error("chamfer requires 1 parent feature");
      const distance = typeof params.distance === "number" ? (params.distance as number) : 1;
      solid = chamfer(parentSolids[0].mesh, distance);
      break;
    }
    default:
      throw new Error(`unknown feature kind: ${(feature as { kind: string }).kind}`);
  }

  const bbox: BBox = exportBoundingBox(solid.mesh);
  const quality: TessellationQuality = "normal";
  const mesh = tessellate(solid.mesh, quality);
  const triangleCount = triangleCountOf(mesh);

  return { solid, bbox, triangleCount };
}

/* ----------------------------------------------------------------- top-level */

/**
 * Evaluate (or re-evaluate) a project's feature tree.
 *
 * Flow:
 *   1. Load features from DB, ordered by `order` ASC.
 *   2. If `fromFeatureId` given, prune to that node and its descendants.
 *   3. topoSort — throws on cycle.
 *   4. For each node: compute content hash, check geometry-cache, evaluate if
 *      miss (or skip entirely on dryRun), cache on success, record on fail.
 *   5. Union all leaf bboxes, sum triangle counts, return.
 */
export async function evaluateTree(
  projectId: string,
  opts: EvalOpts = {},
): Promise<FeatureEvaluateResponse> {
  const started = performance.now();
  const errors: { featureId: string; message: string }[] = [];
  const evaluatedFeatureIds: string[] = [];

  // 1. Load features in timeline order.
  const allFeatures = await db
    .select()
    .from(schema.opencadFeatures)
    .where(eq(schema.opencadFeatures.projectId, projectId))
    .orderBy(asc(schema.opencadFeatures.order));

  if (allFeatures.length === 0) {
    return {
      projectId,
      evaluatedFeatureIds: [],
      bbox: null,
      triangleCount: 0,
      durationMs: performance.now() - started,
      errors: [],
    };
  }

  // 2. Optional partial-tree pruning: keep only `fromFeatureId` and descendants.
  let features: OpencadFeature[] = allFeatures;
  if (opts.fromFeatureId) {
    const fullDag = buildDAG(allFeatures);
    if (!fullDag.has(opts.fromFeatureId)) {
      return {
        projectId,
        evaluatedFeatureIds: [],
        bbox: null,
        triangleCount: 0,
        durationMs: performance.now() - started,
        errors: [{ featureId: opts.fromFeatureId, message: "fromFeatureId not found in project" }],
      };
    }
    const keep = new Set<string>();
    const walk = (id: string) => {
      if (keep.has(id)) return;
      keep.add(id);
      const n = fullDag.get(id);
      if (!n) return;
      for (const c of n.children) walk(c);
    };
    walk(opts.fromFeatureId);
    features = allFeatures.filter((f) => keep.has(f.id));
  }

  // 3. Topological sort — bubbles cycles as a thrown error (caller gets 500).
  const sorted = topoSort(features);
  const dag: DAG = buildDAG(sorted);

  // 4. Evaluate. Track per-node result so downstream nodes can pick up handles.
  const results = new Map<string, EvalResult>();
  /** Nodes that failed OR have a failed ancestor — skipped without adding new errors. */
  const poisoned = new Set<string>();
  const overrideHash = opts.parameterOverrides
    ? hashContent(opts.parameterOverrides)
    : "";

  for (const feature of sorted) {
    // Skip if any ancestor is poisoned (the branch is already broken — don't
    // double-report and don't waste kernel calls).
    const parents = dag.get(feature.id)?.parents ?? [];
    if (parents.some((p) => poisoned.has(p))) {
      poisoned.add(feature.id);
      continue;
    }

    // Content hash: stable across reorderings of paramsJson keys and parentIds.
    const effectiveParams = applyOverrides(
      (feature.paramsJson ?? {}) as Record<string, unknown>,
      opts.parameterOverrides,
    );
    const parentHashes = parents
      .map((pid) => results.get(pid)?.contentHash ?? "")
      .sort();
    const contentHash = hashFeature(
      feature.kind,
      { params: effectiveParams, overrideHash },
      parentHashes,
    );

    // dryRun: validate DAG + hash only. Don't touch the kernel or the cache.
    if (opts.dryRun) {
      results.set(feature.id, { solid: null, bbox: null, triangleCount: 0, contentHash });
      evaluatedFeatureIds.push(feature.id);
      continue;
    }

    try {
      const cached = getCachedGeometry(contentHash);
      if (cached) {
        const geom = deserializeGeometry(cached);
        const solid: SolidResult = {
          mesh: geom,
          bbox: {
            min: { x: cached.bbox.min[0], y: cached.bbox.min[1], z: cached.bbox.min[2] },
            max: { x: cached.bbox.max[0], y: cached.bbox.max[1], z: cached.bbox.max[2] },
          },
          volumeMm3: cached.volumeMm3,
        };
        results.set(feature.id, {
          solid,
          bbox: solid.bbox,
          triangleCount: triangleCountOf(geom),
          contentHash,
        });
        evaluatedFeatureIds.push(feature.id);
        continue;
      }

      const parentSolids: SolidResult[] = [];
      for (const pid of parents) {
        const r = results.get(pid);
        if (!r || !r.solid) throw new Error(`missing parent geometry for ${pid}`);
        parentSolids.push(r.solid);
      }

      const evalOut = evaluateFeature(feature, effectiveParams, parentSolids);
      results.set(feature.id, { ...evalOut, contentHash });

      // Cache the serialized form of the mesh for future hits.
      const serialized: SerializedGeometry = serializeGeometry(evalOut.solid.mesh);
      // Ensure volume is populated even when kernel didn't compute it.
      if (!serialized.volumeMm3) serialized.volumeMm3 = computeVolumeMm3(evalOut.solid.mesh);
      setCachedGeometry(contentHash, serialized);

      evaluatedFeatureIds.push(feature.id);
    } catch (err) {
      errors.push({
        featureId: feature.id,
        message: err instanceof Error ? err.message : String(err),
      });
      poisoned.add(feature.id);
      // Keep iterating — independent branches are still eligible.
    }
  }

  // 5. Aggregate leaf geometry. A "leaf" is a node with no successful children
  //    in the evaluated set (its output is observable). In dry-run mode there
  //    are no bboxes so this collapses to null.
  let unionedBBox: BBox | null = null;
  let triangleSum = 0;
  for (const [id, result] of results) {
    const hasEvaluatedChild = (dag.get(id)?.children ?? []).some(
      (c) => results.has(c) && !poisoned.has(c),
    );
    if (hasEvaluatedChild) continue;
    unionedBBox = unionBBox(unionedBBox, result.bbox);
    triangleSum += result.triangleCount;
  }

  return {
    projectId,
    evaluatedFeatureIds,
    bbox: unionedBBox,
    triangleCount: triangleSum,
    durationMs: performance.now() - started,
    errors,
  };
}
