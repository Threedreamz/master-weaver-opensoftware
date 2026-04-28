/**
 * opencad — pure-JS CAD kernel (M1).
 *
 * Uses Three.js primitives for mesh construction and boolean CSG via
 * `three-bvh-csg` (REQUIRED runtime dep — declared in package.json).
 *
 * Loading is lazy: the module imports cleanly even if the dep is somehow
 * absent at build time, but `booleanOp()` will throw
 * `BooleanOpUnsupportedError` on the first call so callers see a clear
 * error instead of silently-wrong geometry. Feature-timeline routes catch
 * this and surface it as a user-facing operation error.
 *
 * All public functions are Node-compatible: no `window`, no `document`, no
 * DOM-dependent Three.js helpers. Units: millimeters (mm).
 *
 * This module is intentionally a thin layer — it does NOT own the feature
 * tree, project state, or cache. Callers (feature-evaluate route) hash
 * parameters via `hash.ts`, probe `geometry-cache.ts`, and on miss invoke
 * the operators here. See `api-contracts.ts` for the request/response
 * shapes that consume these primitives.
 *
 * Replicad TODO: once the WASM OCCT binding is vendored, primitives should
 * delegate to replicad for BREP solidity (exact fillets, booleans, STEP
 * export) with the Three mesh becoming a tessellated view. The public
 * signatures here are designed to be drop-in swappable.
 */
import * as THREE from "three";

/* ------------------------------------------------------------- optional CSG */

type CsgLib = {
  Brush: new (geom: THREE.BufferGeometry) => unknown;
  Evaluator: new () => {
    evaluate: (a: unknown, b: unknown, op: number) => unknown;
  };
  ADDITION: number;
  SUBTRACTION: number;
  INTERSECTION: number;
};

let cachedCsg: CsgLib | null | undefined = undefined;
let cachedCsgLoadError: Error | null = null;

/**
 * Custom error thrown when boolean ops are invoked without three-bvh-csg
 * loaded. Feature-timeline routes catch by name and surface as a
 * user-facing operation error rather than a generic 500.
 */
export class BooleanOpUnsupportedError extends Error {
  public readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "BooleanOpUnsupportedError";
    if (cause !== undefined) this.cause = cause;
  }
}

/**
 * Custom error thrown when a kernel op cannot produce correct geometry —
 * e.g. fillet/chamfer hitting the mesh-mode branch when replicad WASM is
 * unavailable, where silently returning the input solid would mark the
 * feature as "applied" while the geometry is unchanged. Feature-timeline
 * catches this per-feature and surfaces it in the response `errors[]`
 * array so the UI can render the feature as failed (red badge).
 *
 * `code` lets callers branch on a stable identifier instead of message
 * substring matching; `cause` preserves the underlying error if any.
 */
export class KernelError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;
  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = "KernelError";
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

/**
 * Lazily load three-bvh-csg.
 *
 * Returns the loaded module on success. On failure, returns null AND records
 * the underlying load error in `cachedCsgLoadError` so `booleanOp()` can
 * throw a precise `BooleanOpUnsupportedError` only when actually called.
 *
 * Module init MUST NOT throw — this keeps server boot, type-checking, and
 * page-data collection succeeding even if the dep is somehow absent.
 */
function loadCsg(): CsgLib | null {
  if (cachedCsg !== undefined) return cachedCsg;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("three-bvh-csg") as CsgLib;
    cachedCsg = mod;
    cachedCsgLoadError = null;
    return mod;
  } catch (err) {
    cachedCsg = null;
    cachedCsgLoadError = err instanceof Error ? err : new Error(String(err));
    return null;
  }
}

/* ---------------------------------------------------------------- types */

export interface BBox3 {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface SolidResult {
  mesh: THREE.BufferGeometry;
  bbox: BBox3;
  volumeMm3: number;
  /**
   * Optional opaque handle to the underlying replicad/OCCT BREP solid for
   * results that came out of WASM-backed ops (booleans, fillet, chamfer).
   * Carrying it forward lets the next op (e.g. fillet after cut) stay in
   * BREP-land instead of round-tripping through mesh CSG.
   *
   * `unknown` here keeps the kernel free of a hard replicad type dep — the
   * brep wrapper module narrows it via `as ReplicadSolid` at use sites.
   * Absent / null when the result was produced by mesh-only paths.
   */
  brepSolid?: unknown;
  /**
   * Tag that callers (HTTP routes) propagate to clients via the
   * `X-Boolean-Mode` response header so users know whether the precision
   * was exact (`brep`) or reduced (`mesh-fallback`).
   */
  booleanMode?: "brep" | "mesh-fallback";
}

export interface Point2 {
  x: number;
  y: number;
}

export type TessellationQuality = "coarse" | "normal" | "fine";
export type BooleanOpKind = "union" | "subtract" | "intersect";

/* ---------------------------------------------------------------- helpers */

/** Return axis-aligned bbox of a BufferGeometry in the schema Vec3 shape. */
export function exportBoundingBox(geom: THREE.BufferGeometry): BBox3 {
  geom.computeBoundingBox();
  const b = geom.boundingBox ?? new THREE.Box3();
  return {
    min: { x: b.min.x, y: b.min.y, z: b.min.z },
    max: { x: b.max.x, y: b.max.y, z: b.max.z },
  };
}

/** Compute signed tetra-sum volume (mm^3) of a triangle-indexed geometry. */
export function computeVolumeMm3(geom: THREE.BufferGeometry): number {
  const pos = geom.getAttribute("position");
  if (!pos) return 0;
  const idx = geom.getIndex();
  const triCount = idx ? idx.count / 3 : pos.count / 3;
  let vol = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let t = 0; t < triCount; t += 1) {
    const i0 = idx ? idx.getX(t * 3 + 0) : t * 3 + 0;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    vol += a.dot(b.clone().cross(c)) / 6;
  }
  return Math.abs(vol);
}

/** Wrap a BufferGeometry into a SolidResult with bbox + volume pre-computed. */
function toSolid(geom: THREE.BufferGeometry): SolidResult {
  if (!geom.getIndex()) {
    // ExtrudeGeometry / BoxGeometry are already non-indexed in some Three
    // versions; leave as-is but ensure bbox is current.
  }
  geom.computeVertexNormals();
  return {
    mesh: geom,
    bbox: exportBoundingBox(geom),
    volumeMm3: computeVolumeMm3(geom),
  };
}

/* ------------------------------------------------------------- primitives */

/** Axis-aligned box centered at origin, dimensions in mm. */
export function createBox(x: number, y: number, z: number): SolidResult {
  return toSolid(new THREE.BoxGeometry(x, y, z, 1, 1, 1));
}

/** Z-axis cylinder, centered at origin. radius + height in mm. */
export function createCylinder(r: number, h: number, radialSegments = 48): SolidResult {
  const geom = new THREE.CylinderGeometry(r, r, h, radialSegments, 1, false);
  // CylinderGeometry is oriented along Y by default — rotate to Z for CAD.
  geom.rotateX(Math.PI / 2);
  return toSolid(geom);
}

/** Sphere centered at origin. radius in mm. */
export function createSphere(r: number, segments = 32): SolidResult {
  return toSolid(new THREE.SphereGeometry(r, segments, Math.max(8, segments / 2)));
}

/* --------------------------------------------------------------- extrude */

export interface ExtrudeOptions {
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  curveSegments?: number;
}

/** Extrude a 2D polygon (outer ring, CCW) along +Z by `height` mm. */
export function extrudeProfile(
  polygon2d: readonly Point2[],
  height: number,
  options: ExtrudeOptions = {}
): SolidResult {
  if (polygon2d.length < 3) {
    throw new Error("extrudeProfile: polygon2d needs ≥3 points");
  }
  const shape = new THREE.Shape(polygon2d.map((p) => new THREE.Vector2(p.x, p.y)));
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: options.bevelEnabled ?? false,
    bevelThickness: options.bevelThickness ?? 0,
    bevelSize: options.bevelSize ?? 0,
    bevelSegments: options.bevelSegments ?? 0,
    curveSegments: options.curveSegments ?? 12,
    steps: 1,
  });
  return toSolid(geom);
}

/* --------------------------------------------------------------- revolve */

export type RevolveAxis = "x" | "y" | "z";

/**
 * Revolve a 2D profile (points in the XZ plane for axis="z", XY for "y",
 * YZ for "x") around the named world axis by `angleDeg` degrees.
 */
export function revolveProfile(
  profile2d: readonly Point2[],
  axis: RevolveAxis,
  angleDeg: number,
  segments = 48
): SolidResult {
  if (profile2d.length < 2) {
    throw new Error("revolveProfile: profile2d needs ≥2 points");
  }
  const angleRad = (angleDeg * Math.PI) / 180;
  const points = profile2d.map((p) => new THREE.Vector2(p.x, p.y));
  // LatheGeometry revolves around Y. Re-orient afterwards for other axes.
  const geom = new THREE.LatheGeometry(points, segments, 0, angleRad);
  if (axis === "x") geom.rotateZ(Math.PI / 2);
  else if (axis === "z") geom.rotateX(Math.PI / 2);
  return toSolid(geom);
}

/* ---------------------------------------------------------------- boolean */

/**
 * Normalise a geometry for three-bvh-csg consumption.
 *
 * three-bvh-csg's Evaluator requires `position`, `normal`, AND `uv` attributes
 * on both input geometries (see `Evaluator.attributes = ['position','uv','normal']`).
 * It reads `a.geometry.attributes[key].array.constructor` during
 * `prepareAttributesData`, so a missing attribute throws the opaque
 * `Cannot read properties of undefined (reading 'array')` error on the first
 * boolean call.
 *
 * Fresh primitives (BoxGeometry, etc.) have uv; but cached geometries
 * round-tripped through `serializeGeometry`/`deserializeGeometry` only carry
 * position+normal+index, so a second evaluate() pass whose booleans read
 * parents from the cache crashes. Ditto CSG outputs that we later clone
 * without their uvs.
 *
 * Also accepts an already-wrapped `SolidResult` so callers that forget to
 * unwrap `.mesh` don't crash on `.attributes` access.
 */
function normalizeForCsg(
  g: THREE.BufferGeometry | SolidResult
): THREE.BufferGeometry {
  // Accept both raw BufferGeometry and SolidResult wrappers.
  const geom = (g as SolidResult).mesh instanceof THREE.BufferGeometry
    ? (g as SolidResult).mesh
    : (g as THREE.BufferGeometry);

  if (!(geom instanceof THREE.BufferGeometry)) {
    throw new Error("booleanOp: input is not a BufferGeometry or SolidResult");
  }

  const out = geom.clone();

  // Ensure position attribute exists (sanity — should always be present).
  const pos = out.getAttribute("position");
  if (!pos) {
    throw new Error("booleanOp: input geometry has no position attribute");
  }

  // Ensure normal attribute exists.
  if (!out.getAttribute("normal")) {
    out.computeVertexNormals();
  }

  // Ensure uv attribute exists — synthesise zero-valued uvs if missing.
  // three-bvh-csg requires uv to be present even if its values are unused
  // downstream (CAD callers don't render textured materials).
  if (!out.getAttribute("uv")) {
    const uvs = new Float32Array(pos.count * 2);
    out.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  }

  return out;
}

/**
 * CSG boolean — REQUIRES three-bvh-csg.
 *
 * Throws `BooleanOpUnsupportedError` if the dep failed to load. Callers
 * (feature-timeline / evaluate routes) catch by `err.name === "BooleanOpUnsupportedError"`
 * and surface it as a 422 user-facing operation error rather than silently
 * returning the left operand (which produces wrong geometry and hides
 * feature loss — see 2026-04-27 audit).
 */
export function booleanOp(
  a: THREE.BufferGeometry | SolidResult,
  b: THREE.BufferGeometry | SolidResult,
  op: BooleanOpKind
): SolidResult {
  const lib = loadCsg();
  const aGeom = normalizeForCsg(a);
  const bGeom = normalizeForCsg(b);
  if (!lib) {
    throw new BooleanOpUnsupportedError(
      `BooleanOpUnsupportedError: three-bvh-csg not loaded — boolean ops (${op}) require this dependency. Run \`pnpm install three-bvh-csg\`.`,
      cachedCsgLoadError ?? undefined
    );
  }
  const brushA = new lib.Brush(aGeom) as unknown as { updateMatrixWorld: () => void };
  const brushB = new lib.Brush(bGeom) as unknown as { updateMatrixWorld: () => void };
  brushA.updateMatrixWorld();
  brushB.updateMatrixWorld();
  const opCode =
    op === "union" ? lib.ADDITION : op === "subtract" ? lib.SUBTRACTION : lib.INTERSECTION;
  const evaluator = new lib.Evaluator();
  const result = evaluator.evaluate(brushA, brushB, opCode) as { geometry: THREE.BufferGeometry };
  const out = toSolid(result.geometry);
  out.booleanMode = "mesh-fallback";
  return out;
}

/**
 * BREP-preferring boolean entry point.
 *
 * If both inputs carry a `brepSolid` handle (i.e. they came from a primitive
 * or prior op that produced exact geometry), this dispatches to
 * `brep/replicad-wrapper.brepBoolean` which calls `solidA.cut/fuse/intersect`
 * directly on OCCT BREP shapes. The returned `SolidResult.brepSolid` carries
 * the result forward so subsequent fillet/chamfer/cut stay in BREP-land —
 * proving the cut→fillet→export-STEP chain works.
 *
 * Falls back to the synchronous mesh-CSG `booleanOp` only when:
 *   - the brep wrapper reports replicad as `not-installed` or `wasm-failed`, OR
 *   - either input is mesh-only (no `brepSolid` handle attached), OR
 *   - the BREP boolean throws (non-manifold inputs, OCCT internal error)
 *
 * In every fallback case the result is tagged `booleanMode: "mesh-fallback"`
 * so HTTP routes can attach `X-Boolean-Mode: mesh-fallback` and the client
 * UI can warn that precision is reduced.
 *
 * Caller signature stays compatible with `booleanOp` — accepts geometry or
 * a wrapped SolidResult; the BREP-aware path is only taken when SolidResults
 * are passed in (since BufferGeometry alone has no BREP companion).
 */
export async function booleanOpAsync(
  a: THREE.BufferGeometry | SolidResult,
  b: THREE.BufferGeometry | SolidResult,
  op: BooleanOpKind
): Promise<SolidResult> {
  const aIsSolid = (a as SolidResult).mesh instanceof THREE.BufferGeometry;
  const bIsSolid = (b as SolidResult).mesh instanceof THREE.BufferGeometry;
  const aBrep = aIsSolid ? (a as SolidResult).brepSolid : undefined;
  const bBrep = bIsSolid ? (b as SolidResult).brepSolid : undefined;

  // Both inputs have BREP companions → try replicad-native cut/fuse/intersect.
  if (aBrep && bBrep) {
    try {
      const { brepBoolean } = await import("./brep/replicad-wrapper");
      const brepResult = await brepBoolean(aBrep, bBrep, op);
      if (brepResult) {
        // Defense-in-depth: assert the BREP path emitted a brepSolid handle
        // so downstream ops (fillet) stay in BREP-land. Mesh-fallback paths
        // explicitly clear it.
        if (!brepResult.brepSolid) {
          // Type-mismatch on output — treat as fallback rather than crash.
          brepResult.booleanMode = "mesh-fallback";
        } else {
          brepResult.booleanMode = "brep";
        }
        return brepResult;
      }
    } catch {
      // Fall through to mesh CSG below.
    }
  }

  // Mesh CSG fallback — works on raw BufferGeometry too.
  const out = booleanOp(a, b, op);
  out.brepSolid = null;
  out.booleanMode = "mesh-fallback";
  return out;
}

/* ----------------------------------------------------------- fillet/chamfer */

/**
 * Edge fillet — REQUIRES the BREP kernel (replicad/OCCT WASM).
 *
 * Throws `KernelError` (code `kernel/fillet-requires-brep`) when called.
 * Pure-mesh fillet has no edge topology, so silently returning the input
 * solid would mark the feature as "applied" while geometry is unchanged —
 * a footgun the UI can't surface. Callers (feature-timeline) catch by
 * `err.name === "KernelError"` and add to that feature's `errors[]` array
 * so the UI marks the feature as failed (red badge).
 *
 * Production path is `brepFillet` in `brep/replicad-wrapper.ts`, which
 * probes WASM availability and routes to OCCT when present. This function
 * is kept as the explicit "no-BREP-available" failure mode.
 */
export function fillet(
  geom: THREE.BufferGeometry,
  edgeRadius: number,
  _edgeSelector?: (edgeIndex: number) => boolean
): SolidResult {
  if (edgeRadius <= 0) return toSolid(geom.clone());
  throw new KernelError(
    `fillet requires BREP kernel; replicad WASM not available (radius=${edgeRadius}mm). ` +
      "Install `replicad` + `replicad-opencascadejs` to enable BREP-exact fillets.",
    "kernel/fillet-requires-brep"
  );
}

/**
 * Edge chamfer — REQUIRES the BREP kernel (replicad/OCCT WASM).
 *
 * Throws `KernelError` (code `kernel/chamfer-requires-brep`) when called.
 * See `fillet` above for rationale. Production path is `brepChamfer`.
 */
export function chamfer(geom: THREE.BufferGeometry, distance: number): SolidResult {
  if (distance <= 0) return toSolid(geom.clone());
  throw new KernelError(
    `chamfer requires BREP kernel; replicad WASM not available (distance=${distance}mm). ` +
      "Install `replicad` + `replicad-opencascadejs` to enable BREP-exact chamfers.",
    "kernel/chamfer-requires-brep"
  );
}

/* -------------------------------------------------------------- tessellate */

/** Downsample or subdivide a Three geometry according to tessellation quality. */
export function tessellate(
  geom: THREE.BufferGeometry,
  quality: TessellationQuality
): THREE.BufferGeometry {
  // M1: quality flags are advisory. Three.js has no general-purpose remesh in
  // core; treat "coarse" as merging near-duplicate vertices (cheap LOD) and
  // "fine" as computing per-vertex normals for smoother shading. "normal" is
  // pass-through. Replicad TODO: drive tessellation from BREP curvature.
  const out = geom.clone();
  if (quality === "coarse") {
    // Drop the index to simplify, then let downstream re-index if needed.
    const pos = out.getAttribute("position");
    if (pos && out.getIndex()) {
      const nonIndexed = out.toNonIndexed();
      return nonIndexed;
    }
    return out;
  }
  if (quality === "fine") {
    out.computeVertexNormals();
  }
  return out;
}

/* ------------------------------------------------------------------ export */

/**
 * Serialize a BufferGeometry to binary STL (default) or ASCII STL bytes.
 * Hand-rolled — avoids pulling the three/examples subpath which is ESM-only
 * and tricky to import in Next.js server routes.
 */
export function exportSTL(geom: THREE.BufferGeometry, binary = true): Uint8Array {
  const pos = geom.getAttribute("position");
  // Empty-project guard: if the feature tree has no geometry yet, emit a
  // valid-but-empty STL so the browser-side STLLoader doesn't throw
  // "Offset is outside the bounds of the DataView" on a zero-byte response.
  // Binary STL minimum = 80-byte header + uint32 triangle count = 84 bytes.
  if (!pos || pos.count === 0) {
    if (binary) {
      const buf = new ArrayBuffer(84);
      new DataView(buf).setUint32(80, 0, true);
      return new Uint8Array(buf);
    }
    return new TextEncoder().encode("solid opencad\nendsolid opencad\n");
  }
  const idx = geom.getIndex();
  const triCount = idx ? idx.count / 3 : pos.count / 3;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  if (binary) {
    const buf = new ArrayBuffer(84 + triCount * 50);
    const view = new DataView(buf);
    // 80-byte header, then uint32 triangle count.
    view.setUint32(80, triCount, true);
    let offset = 84;
    for (let t = 0; t < triCount; t += 1) {
      const i0 = idx ? idx.getX(t * 3 + 0) : t * 3 + 0;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(pos, i0);
      b.fromBufferAttribute(pos, i1);
      c.fromBufferAttribute(pos, i2);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      n.crossVectors(ab, ac).normalize();
      view.setFloat32(offset + 0,  n.x, true);
      view.setFloat32(offset + 4,  n.y, true);
      view.setFloat32(offset + 8,  n.z, true);
      view.setFloat32(offset + 12, a.x, true);
      view.setFloat32(offset + 16, a.y, true);
      view.setFloat32(offset + 20, a.z, true);
      view.setFloat32(offset + 24, b.x, true);
      view.setFloat32(offset + 28, b.y, true);
      view.setFloat32(offset + 32, b.z, true);
      view.setFloat32(offset + 36, c.x, true);
      view.setFloat32(offset + 40, c.y, true);
      view.setFloat32(offset + 44, c.z, true);
      view.setUint16(offset + 48, 0, true); // attribute byte count
      offset += 50;
    }
    return new Uint8Array(buf);
  }

  // ASCII path — small models only (debugging / readability).
  let out = "solid opencad\n";
  for (let t = 0; t < triCount; t += 1) {
    const i0 = idx ? idx.getX(t * 3 + 0) : t * 3 + 0;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac).normalize();
    out += `facet normal ${n.x} ${n.y} ${n.z}\n outer loop\n`;
    out += `  vertex ${a.x} ${a.y} ${a.z}\n`;
    out += `  vertex ${b.x} ${b.y} ${b.z}\n`;
    out += `  vertex ${c.x} ${c.y} ${c.z}\n`;
    out += ` endloop\nendfacet\n`;
  }
  out += "endsolid opencad\n";
  return new TextEncoder().encode(out);
}

/* ------------------------------------------------------- serialization */

/** Serialize a geometry into the SerializedGeometry shape stored in cache. */
export function serializeGeometry(geom: THREE.BufferGeometry): {
  position: Float32Array;
  normal?: Float32Array;
  index: Uint32Array;
  bbox: { min: [number, number, number]; max: [number, number, number] };
  volumeMm3: number;
} {
  const pos = geom.getAttribute("position");
  const norm = geom.getAttribute("normal");
  const idx = geom.getIndex();
  const position = new Float32Array(pos ? (pos.array as Float32Array) : []);
  const normal = norm ? new Float32Array(norm.array as Float32Array) : undefined;
  const index = idx
    ? new Uint32Array(idx.array as Uint32Array | Uint16Array)
    : new Uint32Array(0);
  const bb = exportBoundingBox(geom);
  return {
    position,
    normal,
    index,
    bbox: { min: [bb.min.x, bb.min.y, bb.min.z], max: [bb.max.x, bb.max.y, bb.max.z] },
    volumeMm3: computeVolumeMm3(geom),
  };
}

/** Inflate a SerializedGeometry back into a Three.BufferGeometry. */
export function deserializeGeometry(s: {
  position: Float32Array;
  normal?: Float32Array;
  index: Uint32Array;
}): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(s.position, 3));
  if (s.normal) g.setAttribute("normal", new THREE.BufferAttribute(s.normal, 3));
  if (s.index.length > 0) g.setIndex(new THREE.BufferAttribute(s.index, 1));
  g.computeBoundingBox();
  return g;
}
