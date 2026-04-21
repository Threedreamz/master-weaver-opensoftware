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
  createCylinder,
  createSphere,
  extrudeProfile,
  revolveProfile,
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
  type RevolveAxis,
} from "./cad-kernel";
import { createCone } from "./ops/cone";
import { createTorus } from "./ops/torus";
import { createPyramid } from "./ops/pyramid";
import { sweep } from "./ops/sweep";
import { loft } from "./ops/loft";
import { shell } from "./ops/shell";
import { draft } from "./ops/draft";
import { hole } from "./ops/hole";
import { thread } from "./ops/thread";
import { patternLinear } from "./ops/pattern-linear";
import { patternCircular } from "./ops/pattern-circular";
import { mirror } from "./ops/mirror";
import { transform as transformOp } from "./ops/transform";
import { group as groupOp } from "./ops/group";
import { brepFillet, brepChamfer, brepShell, brepDraft } from "./brep/replicad-wrapper";

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
async function evaluateFeature(
  feature: OpencadFeature,
  params: Record<string, unknown>,
  parentSolids: SolidResult[],
): Promise<{ solid: SolidResult; bbox: BBox; triangleCount: number }> {
  let solid: SolidResult;

  // Tiny helper — pull a number from params with a default, guards NaN.
  const num = (key: string, def?: number): number => {
    const v = params[key];
    return typeof v === "number" && Number.isFinite(v)
      ? v
      : def !== undefined
        ? def
        : (() => {
            throw new Error(`${feature.kind}: missing or non-numeric param "${key}"`);
          })();
  };
  const vec3 = (key: string, def?: { x: number; y: number; z: number }) => {
    const v = params[key];
    if (v && typeof v === "object") {
      const p = v as { x?: unknown; y?: unknown; z?: unknown };
      if (typeof p.x === "number" && typeof p.y === "number" && typeof p.z === "number") {
        return { x: p.x, y: p.y, z: p.z };
      }
    }
    if (def) return def;
    throw new Error(`${feature.kind}: missing or malformed Vec3 param "${key}"`);
  };
  const requireParent = (): SolidResult => {
    if (parentSolids.length < 1)
      throw new Error(`${feature.kind} requires 1 parent feature`);
    return parentSolids[0];
  };

  switch (feature.kind) {
    /* ------------------------------------------------------ primitives */
    case "box": {
      solid = createBox(num("width"), num("height"), num("depth"));
      break;
    }
    case "cylinder": {
      solid = createCylinder(num("radius"), num("height"));
      break;
    }
    case "sphere": {
      solid = createSphere(num("radius"));
      break;
    }
    case "cone": {
      solid = createCone(num("radiusBase"), num("radiusTop", 0), num("height"));
      break;
    }
    case "torus": {
      solid = createTorus(
        num("majorRadius"),
        num("minorRadius"),
        num("arcDeg", 360),
      );
      break;
    }
    case "pyramid": {
      solid = createPyramid(num("sides", 4), num("baseRadius"), num("height"));
      break;
    }

    /* -------------------------------------------------------- extrude */
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
      const profile = coerceProfile(params.profile);
      const axis = ((typeof params.axis === "string" ? params.axis : "z") as RevolveAxis);
      const angleDeg = typeof params.angleDeg === "number" ? params.angleDeg : 360;
      solid = revolveProfile(profile, axis, angleDeg);
      break;
    }

    /* ----------------------------------------------------- solid ops */
    case "sweep": {
      const profile = coerceProfile(params.profile);
      const path = Array.isArray(params.path)
        ? (params.path as Array<{ x: number; y: number; z: number }>)
        : [];
      const opts = (params.options as Record<string, unknown>) ?? {};
      solid = sweep(profile, path, {
        twistDeg: typeof opts.twistDeg === "number" ? opts.twistDeg : 0,
        closedProfile: !!opts.closedProfile,
      });
      break;
    }
    case "loft": {
      const sections = Array.isArray(params.sections)
        ? (params.sections as Array<{ points: Point2[]; z: number }>)
        : [];
      const opts = (params.options as Record<string, unknown>) ?? {};
      solid = loft(sections, { closed: !!opts.closed });
      break;
    }
    case "shell": {
      const parent = requireParent();
      const thickness = num("thickness");
      solid = params.useBrep
        ? await brepShell(parent.mesh, thickness)
        : shell(parent.mesh, thickness);
      break;
    }
    case "draft": {
      const parent = requireParent();
      const pullAxis = (params.pullAxis === "x" || params.pullAxis === "y" ? params.pullAxis : "z") as "x" | "y" | "z";
      const direction = (params.direction === "negative" ? "negative" : "positive") as "positive" | "negative";
      const neutralValue = num("neutralValue", 0);
      const angleDeg = num("angleDeg", 5);
      solid = params.useBrep
        ? await brepDraft(parent.mesh, neutralValue, angleDeg)
        : draft(parent.mesh, neutralValue, angleDeg, { pullAxis, direction });
      break;
    }
    case "hole": {
      const parent = requireParent();
      solid = hole(
        parent.mesh,
        vec3("position", { x: 0, y: 0, z: 0 }),
        num("diameter"),
        num("depth"),
        {
          kind: (params.kind as "simple" | "counterbore" | "countersink" | undefined) ?? "simple",
          counterboreDiameter: typeof params.counterboreDiameter === "number" ? params.counterboreDiameter : undefined,
          counterboreDepth: typeof params.counterboreDepth === "number" ? params.counterboreDepth : undefined,
          countersinkDiameter: typeof params.countersinkDiameter === "number" ? params.countersinkDiameter : undefined,
          countersinkAngleDeg: typeof params.countersinkAngleDeg === "number" ? params.countersinkAngleDeg : undefined,
          axis: typeof params.axis === "object" && params.axis !== null ? vec3("axis") : undefined,
          throughAll: !!params.throughAll,
        },
      );
      break;
    }
    case "thread": {
      const parent = requireParent();
      solid = thread(parent.mesh, num("pitch"), num("length"), {
        standard: (params.standard as "ISO" | "UN" | "custom" | undefined) ?? "ISO",
        external: params.external !== false,
        depthOverride: typeof params.depthOverride === "number" ? params.depthOverride : undefined,
      });
      break;
    }

    /* ------------------------------------------------------- patterns */
    case "pattern-linear": {
      const parent = requireParent();
      const axisA = {
        direction: vec3("directionA", { x: 1, y: 0, z: 0 }),
        count: num("countA", 2),
        spacing: num("spacingA", 10),
      };
      const axisB = params.directionB
        ? {
            direction: vec3("directionB"),
            count: num("countB", 1),
            spacing: num("spacingB", 10),
          }
        : undefined;
      solid = patternLinear(parent.mesh, axisA, axisB);
      break;
    }
    case "pattern-circular": {
      const parent = requireParent();
      solid = patternCircular(
        parent.mesh,
        vec3("axis", { x: 0, y: 0, z: 1 }),
        vec3("origin", { x: 0, y: 0, z: 0 }),
        num("count", 6),
        {
          totalAngleDeg: num("totalAngleDeg", 360),
          symmetric: !!params.symmetric,
        },
      );
      break;
    }
    case "mirror": {
      const parent = requireParent();
      solid = mirror(
        parent.mesh,
        {
          normal: vec3("normal", { x: 1, y: 0, z: 0 }),
          origin: vec3("origin", { x: 0, y: 0, z: 0 }),
        },
        { keepOriginal: params.keepOriginal !== false },
      );
      break;
    }

    /* ------------------------------------------------------ booleans */
    case "cut":
    case "boolean":
    case "boolean-union":
    case "boolean-subtract":
    case "boolean-intersect": {
      if (parentSolids.length < 2) {
        throw new Error(`${feature.kind} requires 2+ parent features, got ${parentSolids.length}`);
      }
      const op: BooleanOpKind =
        feature.kind === "cut" || feature.kind === "boolean-subtract"
          ? "subtract"
          : feature.kind === "boolean-intersect"
            ? "intersect"
            : feature.kind === "boolean-union"
              ? "union"
              : ((params.op as BooleanOpKind | undefined) ?? "union");
      solid = booleanOp(parentSolids[0].mesh, parentSolids[1].mesh, op);
      for (let i = 2; i < parentSolids.length; i++) {
        solid = booleanOp(solid.mesh, parentSolids[i].mesh, op);
      }
      break;
    }

    /* --------------------------------------------------- modifiers */
    case "fillet": {
      const parent = requireParent();
      const radius = num("radius", 1);
      solid = params.useBrep
        ? await brepFillet(parent.mesh, radius)
        : fillet(parent.mesh, radius);
      break;
    }
    case "chamfer": {
      const parent = requireParent();
      const distance = num("distance", 1);
      solid = params.useBrep
        ? await brepChamfer(parent.mesh, distance)
        : chamfer(parent.mesh, distance);
      break;
    }
    case "transform": {
      const parent = requireParent();
      const scaleRaw = params.scale;
      const scaleArg: { x: number; y: number; z: number } | number | undefined =
        typeof scaleRaw === "number"
          ? scaleRaw
          : scaleRaw && typeof scaleRaw === "object"
            ? vec3("scale")
            : undefined;
      solid = transformOp(parent.mesh, {
        translate: params.translate ? vec3("translate") : undefined,
        rotate:
          params.rotate && typeof params.rotate === "object"
            ? {
                axis: vec3("rotateAxis", { x: 0, y: 0, z: 1 }),
                angleDeg: num("rotateAngleDeg", 0),
              }
            : undefined,
        scale: scaleArg,
        origin: params.origin ? vec3("origin") : undefined,
      });
      break;
    }
    case "group": {
      if (parentSolids.length < 1) throw new Error("group requires 1+ parent features");
      const holeIdxSet = new Set<number>(
        Array.isArray(params.holeIndices)
          ? (params.holeIndices as number[]).filter((n) => typeof n === "number")
          : [],
      );
      solid = groupOp(
        parentSolids.map((p, i) => ({
          id: `m${i}`,
          geometry: p.mesh,
          mode: holeIdxSet.has(i) ? ("hole" as const) : ("solid" as const),
        })),
      );
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

      const evalOut = await evaluateFeature(feature, effectiveParams, parentSolids);
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

/* ----------------------------------------------------------- evaluateProject */

/**
 * Evaluate a project's feature tree and return a single merged
 * `THREE.BufferGeometry` ready for export (STL/3MF/GLTF).
 *
 * Empty-project guard: if the project has zero features (just-created), returns
 * an empty BufferGeometry with a zero-length position attribute. Exporters that
 * consume this still produce a valid (empty) file instead of throwing HTTP 500,
 * so the hub's fresh-project workbench doesn't surface a scary error before the
 * user has a chance to add their first feature.
 *
 * Merge semantics: all non-poisoned leaf solids are concatenated into one
 * non-indexed geometry (a leaf = a node with no successfully evaluated
 * children). This matches how `evaluateTree` aggregates bboxes, so the viewer
 * sees the full model when multiple branches exist.
 *
 * Consumed by `lib/exporters/{stl,threemf,gltf}.ts` via dynamic import.
 */
export async function evaluateProject(
  projectId: string,
  opts: { tessellation: TessellationQuality; versionId?: string },
): Promise<THREE.BufferGeometry> {
  const features = await db
    .select()
    .from(schema.opencadFeatures)
    .where(eq(schema.opencadFeatures.projectId, projectId))
    .orderBy(asc(schema.opencadFeatures.order));

  // Empty-project guard — export must succeed on fresh projects.
  if (features.length === 0) {
    return new THREE.BufferGeometry();
  }

  const sorted = topoSort(features);
  const dag: DAG = buildDAG(sorted);
  const results = new Map<string, SolidResult>();
  const poisoned = new Set<string>();

  for (const feature of sorted) {
    const parents = dag.get(feature.id)?.parents ?? [];
    if (parents.some((p) => poisoned.has(p))) {
      poisoned.add(feature.id);
      continue;
    }
    const params = (feature.paramsJson ?? {}) as Record<string, unknown>;
    try {
      const parentSolids: SolidResult[] = [];
      for (const pid of parents) {
        const r = results.get(pid);
        if (!r) throw new Error(`missing parent solid ${pid}`);
        parentSolids.push(r);
      }
      const { solid } = evaluateFeature(feature, params, parentSolids);
      results.set(feature.id, solid);
    } catch {
      poisoned.add(feature.id);
    }
  }

  // Collect leaves (nodes with no successfully evaluated child).
  const leaves: SolidResult[] = [];
  for (const [id, solid] of results) {
    const children = dag.get(id)?.children ?? [];
    const hasEvalChild = children.some((c) => results.has(c) && !poisoned.has(c));
    if (!hasEvalChild) leaves.push(solid);
  }

  if (leaves.length === 0) return new THREE.BufferGeometry();
  if (leaves.length === 1) {
    return tessellate(leaves[0].mesh.clone(), opts.tessellation);
  }

  // Manual merge: concatenate position/normal attributes into a single
  // non-indexed geometry. Keeps us out of three/examples/BufferGeometryUtils
  // which pulls in browser-ish helpers.
  let totalVerts = 0;
  const nonIndexedLeaves: THREE.BufferGeometry[] = leaves.map((l) => {
    const g = l.mesh.clone();
    const ni = g.getIndex() ? g.toNonIndexed() : g;
    totalVerts += ni.getAttribute("position")?.count ?? 0;
    return ni;
  });
  const merged = new THREE.BufferGeometry();
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const g of nonIndexedLeaves) {
    const pos = g.getAttribute("position");
    if (!pos) continue;
    const norm = g.getAttribute("normal");
    const vc = pos.count;
    for (let i = 0; i < vc; i++) {
      positions[(offset + i) * 3 + 0] = pos.getX(i);
      positions[(offset + i) * 3 + 1] = pos.getY(i);
      positions[(offset + i) * 3 + 2] = pos.getZ(i);
      if (norm) {
        normals[(offset + i) * 3 + 0] = norm.getX(i);
        normals[(offset + i) * 3 + 1] = norm.getY(i);
        normals[(offset + i) * 3 + 2] = norm.getZ(i);
      }
    }
    offset += vc;
  }
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  merged.computeVertexNormals();
  return tessellate(merged, opts.tessellation);
}
