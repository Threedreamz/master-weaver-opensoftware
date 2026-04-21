/**
 * opencad — `shell` 3D operation.
 *
 * Hollows a solid by offsetting its surface inward by `thickness` and
 * subtracting the inner shell from the outer via CSG (three-bvh-csg).
 *
 * Algorithm:
 *   1. Validate (`thickness > 0`, `thickness < shortestBboxEdge / 2`).
 *   2. Clone geometry → ensure vertex normals → offset each vertex inward
 *      by `thickness * vertexNormal`. Area-weighted averaged face normals
 *      (what `computeVertexNormals` produces) approximate a surface
 *      offset; thin/concave features can self-intersect — BREP-exact
 *      shelling requires replicad/OCCT and is a v2 replacement.
 *   3. Lazy-load `three-bvh-csg` via `require()` inside a try/catch — the
 *      intent matches "dynamic import": the module is only resolved when
 *      `shell()` is called, and failures are swallowed with a warning so
 *      the module still loads cleanly in environments without the dep.
 *      (Kept sync to preserve the `SolidResult` return shape; swap to
 *      `await import(...)` + `Promise<SolidResult>` is a one-liner.)
 *   4. Optional: drop triangles whose averaged face normal matches any
 *      `openFaceNormals` direction within 5° — used to cut open faces
 *      (e.g. an open-top box).
 *   5. Return `SolidResult` (bbox + volume recomputed).
 *
 * Units: mm. Node-compatible (no DOM).
 */
import * as THREE from "three";
import { computeVolumeMm3, exportBoundingBox, type BBox3, type SolidResult } from "../cad-kernel";

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

/** Lazy require so missing dep degrades gracefully. */
function loadCsg(): CsgLib | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("three-bvh-csg") as CsgLib;
    return mod;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- helpers */

/** Bundle a BufferGeometry into a SolidResult with bbox + volume. */
function toSolid(geom: THREE.BufferGeometry): SolidResult {
  geom.computeVertexNormals();
  return {
    mesh: geom,
    bbox: exportBoundingBox(geom),
    volumeMm3: computeVolumeMm3(geom),
  };
}

/** Shortest edge of an axis-aligned bbox. */
function shortestEdge(bbox: BBox3): number {
  const dx = bbox.max.x - bbox.min.x;
  const dy = bbox.max.y - bbox.min.y;
  const dz = bbox.max.z - bbox.min.z;
  return Math.min(dx, dy, dz);
}

/** Offset each vertex inward along its vertex normal by `t` millimetres. */
function offsetInward(geom: THREE.BufferGeometry, t: number): THREE.BufferGeometry {
  const out = geom.clone();
  out.computeVertexNormals();
  const pos = out.getAttribute("position") as THREE.BufferAttribute;
  const nrm = out.getAttribute("normal") as THREE.BufferAttribute;
  if (!pos || !nrm) return out;
  for (let i = 0; i < pos.count; i += 1) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const nx = nrm.getX(i);
    const ny = nrm.getY(i);
    const nz = nrm.getZ(i);
    pos.setXYZ(i, px - t * nx, py - t * ny, pz - t * nz);
  }
  pos.needsUpdate = true;
  out.computeVertexNormals();
  return out;
}

/**
 * Drop triangles whose averaged face normal matches any open-face direction
 * within ~5°. Works on non-indexed geometry (and converts to non-indexed if
 * needed — CSG output from three-bvh-csg is typically non-indexed already).
 */
function cullOpenFaces(
  geom: THREE.BufferGeometry,
  openFaceNormals: readonly { x: number; y: number; z: number }[]
): THREE.BufferGeometry {
  if (openFaceNormals.length === 0) return geom;
  const COS5 = Math.cos((5 * Math.PI) / 180); // ~0.996195

  // Normalise + guard against zero vectors.
  const dirs: THREE.Vector3[] = [];
  for (const d of openFaceNormals) {
    const v = new THREE.Vector3(d.x, d.y, d.z);
    if (v.lengthSq() > 1e-12) dirs.push(v.normalize());
  }
  if (dirs.length === 0) return geom;

  const src = geom.getIndex() ? geom.toNonIndexed() : geom.clone();
  const pos = src.getAttribute("position") as THREE.BufferAttribute;
  if (!pos) return src;
  const triCount = pos.count / 3;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();

  const keep: number[] = [];
  for (let t = 0; t < triCount; t += 1) {
    a.fromBufferAttribute(pos, t * 3 + 0);
    b.fromBufferAttribute(pos, t * 3 + 1);
    c.fromBufferAttribute(pos, t * 3 + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac);
    if (n.lengthSq() < 1e-20) continue; // degenerate
    n.normalize();

    let matches = false;
    for (const d of dirs) {
      if (n.dot(d) >= COS5) {
        matches = true;
        break;
      }
    }
    if (!matches) keep.push(t);
  }

  // Rebuild a fresh non-indexed geometry from the kept triangles.
  const newPositions = new Float32Array(keep.length * 9);
  for (let k = 0; k < keep.length; k += 1) {
    const t = keep[k];
    for (let v = 0; v < 3; v += 1) {
      newPositions[k * 9 + v * 3 + 0] = pos.getX(t * 3 + v);
      newPositions[k * 9 + v * 3 + 1] = pos.getY(t * 3 + v);
      newPositions[k * 9 + v * 3 + 2] = pos.getZ(t * 3 + v);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(newPositions, 3));
  out.computeVertexNormals();
  return out;
}

/* ------------------------------------------------------------------ public */

export interface ShellOptions {
  /**
   * World-space outward-facing normals of faces to leave open (triangles
   * matching any direction within 5° are dropped from the result).
   */
  openFaceNormals?: readonly { x: number; y: number; z: number }[];
}

/**
 * Hollow `geom` by offsetting its surface inward by `thickness` mm and
 * subtracting the inner shell via CSG.
 *
 * Throws if `thickness <= 0` or `thickness >= shortestBboxEdge / 2`.
 * Falls back to the original geometry (with a warning) if `three-bvh-csg`
 * is not installed.
 */
export function shell(
  geom: THREE.BufferGeometry,
  thickness: number,
  options: ShellOptions = {}
): SolidResult {
  if (!(thickness > 0)) {
    throw new Error("shell: thickness must be > 0");
  }
  const bbox = exportBoundingBox(geom);
  const edge = shortestEdge(bbox);
  if (thickness >= edge / 2) {
    throw new Error(
      `shell: thickness too large — ${thickness}mm >= ${(edge / 2).toFixed(3)}mm (half the shortest bbox edge of ${edge.toFixed(3)}mm)`
    );
  }

  const lib = loadCsg();
  const openFaces = options.openFaceNormals ?? [];

  if (!lib) {
    // eslint-disable-next-line no-console
    console.warn("[opencad:shell] three-bvh-csg missing — returning original geometry");
    const base = geom.clone();
    const result = openFaces.length > 0 ? cullOpenFaces(base, openFaces) : base;
    return toSolid(result);
  }

  // Build inner offset shell.
  const inner = offsetInward(geom, thickness);

  // CSG: outer − inner.
  let hollow: THREE.BufferGeometry;
  try {
    const outerBrush = new lib.Brush(geom.clone()) as unknown as {
      updateMatrixWorld: () => void;
    };
    const innerBrush = new lib.Brush(inner) as unknown as {
      updateMatrixWorld: () => void;
    };
    outerBrush.updateMatrixWorld();
    innerBrush.updateMatrixWorld();
    const evaluator = new lib.Evaluator();
    const res = evaluator.evaluate(outerBrush, innerBrush, lib.SUBTRACTION) as {
      geometry: THREE.BufferGeometry;
    };
    hollow = res.geometry;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[opencad:shell] CSG evaluation failed (${(err as Error).message}) — returning original geometry`
    );
    const base = geom.clone();
    const fallback = openFaces.length > 0 ? cullOpenFaces(base, openFaces) : base;
    return toSolid(fallback);
  }

  const finalGeom = openFaces.length > 0 ? cullOpenFaces(hollow, openFaces) : hollow;
  return toSolid(finalGeom);
}
