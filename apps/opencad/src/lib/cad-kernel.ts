/**
 * opencad — pure-JS CAD kernel (M1).
 *
 * Uses Three.js primitives for mesh construction and boolean CSG via
 * `three-bvh-csg` (optional dep — falls back to no-op + warning if missing,
 * so the module loads cleanly before the install has landed).
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

/** Lazily load three-bvh-csg; returns null if the package isn't installed. */
function loadCsg(): CsgLib | null {
  if (cachedCsg !== undefined) return cachedCsg;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("three-bvh-csg") as CsgLib;
    cachedCsg = mod;
    return mod;
  } catch {
    // eslint-disable-next-line no-console
    console.warn("[opencad:kernel] three-bvh-csg not installed — booleanOp will return lhs");
    cachedCsg = null;
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

/** CSG boolean — requires three-bvh-csg. Falls back to `a` if lib missing. */
export function booleanOp(
  a: THREE.BufferGeometry,
  b: THREE.BufferGeometry,
  op: BooleanOpKind
): SolidResult {
  const lib = loadCsg();
  if (!lib) {
    // eslint-disable-next-line no-console
    console.warn(`[opencad:kernel] booleanOp(${op}) skipped — three-bvh-csg missing`);
    return toSolid(a.clone());
  }
  const brushA = new lib.Brush(a) as unknown as { updateMatrixWorld: () => void };
  const brushB = new lib.Brush(b) as unknown as { updateMatrixWorld: () => void };
  brushA.updateMatrixWorld();
  brushB.updateMatrixWorld();
  const opCode =
    op === "union" ? lib.ADDITION : op === "subtract" ? lib.SUBTRACTION : lib.INTERSECTION;
  const evaluator = new lib.Evaluator();
  const result = evaluator.evaluate(brushA, brushB, opCode) as { geometry: THREE.BufferGeometry };
  return toSolid(result.geometry);
}

/* ----------------------------------------------------------- fillet/chamfer */

/**
 * Edge fillet (M1 stub — BREP-exact fillets require replicad/OCCT).
 * Current impl: approximate with a bevelled-extrude style subdivision on
 * the bounding geometry; returns input unchanged with a warning when the
 * approximation can't be applied. Signature is stable for M2 replacement.
 */
export function fillet(
  geom: THREE.BufferGeometry,
  edgeRadius: number,
  _edgeSelector?: (edgeIndex: number) => boolean
): SolidResult {
  if (edgeRadius <= 0) return toSolid(geom.clone());
  // eslint-disable-next-line no-console
  console.warn(
    "[cad-kernel] fillet: replicad not loaded, no geometry change applied (radius=" +
      edgeRadius +
      "mm). Install `replicad` + `replicad-opencascadejs` to enable BREP-exact fillets."
  );
  // Approximate: use `toNonIndexed` + smooth normals so downstream rendering
  // at least gets softened shading. Real fillet needs edge topology.
  const soft = geom.clone();
  soft.computeVertexNormals();
  return toSolid(soft);
}

/**
 * Edge chamfer (M1 stub — see fillet notes). Returns input + warning.
 */
export function chamfer(geom: THREE.BufferGeometry, distance: number): SolidResult {
  if (distance <= 0) return toSolid(geom.clone());
  // eslint-disable-next-line no-console
  console.warn(
    "[cad-kernel] chamfer: replicad not loaded, no geometry change applied (distance=" +
      distance +
      "mm). Install `replicad` + `replicad-opencascadejs` to enable BREP-exact chamfers."
  );
  return toSolid(geom.clone());
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
  if (!pos) return new Uint8Array(0);
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
