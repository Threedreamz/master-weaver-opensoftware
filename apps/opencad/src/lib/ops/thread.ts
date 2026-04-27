/**
 * opencad — `thread` operation.
 *
 * Cuts a helical thread into (or onto) a cylindrical solid by sweeping a
 * V-shaped cutting tool along a hand-rolled helix and boolean-subtracting
 * it from the cylinder.
 *
 * Design notes & limitations:
 *   - Modelled thread, not cosmetic: adds real helical geometry. Slicer /
 *     STL exporters see true threads. Triangle count scales with
 *     `segments * turns` (default 64 pts/turn).
 *   - Cutting tool is an isoceles 60° V-profile — approximates ISO metric
 *     and UN unified threads (both specify 60° included angle). Engaged
 *     depth constant is 0.6134 * pitch (standard modelling simplification
 *     of 5H/8 where H = p·√3/2 ≈ 0.5413p; we round up slightly for a
 *     cleaner cut at coarse segmentation).
 *   - Cylinder axis is assumed to be +Z (matches `createCylinder` in
 *     `cad-kernel.ts`). Radius is derived from the geometry's bbox and an
 *     aspect-ratio heuristic rejects strongly non-circular inputs.
 *   - Internal threads (`external: false`) expect the caller to have
 *     pre-bored the hole — we do NOT infer an inner radius automatically.
 *     The tool is still placed at the bbox-derived radius, so for internal
 *     threading you must pass a hollow tube whose outer wall sits at the
 *     desired minor diameter.
 *   - If `three-bvh-csg` is not installed, we warn and return the cylinder
 *     unchanged (matches the kernel's `booleanOp` fallback contract).
 *   - Coarse helix: self-intersections can occur at very tight pitches
 *     (< 0.5mm). Accepted tradeoff for v1 — increase `segments` if needed.
 */
import * as THREE from "three";
import {
  SolidResult,
  booleanOp,
  exportBoundingBox,
} from "../cad-kernel";

export type ThreadStandard = "ISO" | "UN" | "custom";

export interface ThreadOptions {
  /** Thread standard. Default `"ISO"`. ISO and UN both use a 60° V-profile. */
  standard?: ThreadStandard;
  /** Required when `standard === "custom"`. Depth (mm) of the V-cut into the flank. */
  depthOverride?: number;
  /** `true` = cut threads on the outside of a rod. `false` = cut threads into a pre-bored hole. Default `true`. */
  external?: boolean;
  /** Helix points per turn. Default `64`. Higher = finer crests, more triangles. */
  segments?: number;
  /** Number of turns. Default = `length / pitch`. Can be fractional. */
  turns?: number;
}

/**
 * Cut a helical thread into/onto a cylindrical solid.
 *
 * @param cyl    Input cylindrical BufferGeometry (Z-axis, bbox-derived radius).
 * @param pitch  Distance (mm) between adjacent thread crests along the axis.
 * @param length Axial length (mm) of the threaded region. Starts at `bbox.min.z`.
 * @param options See {@link ThreadOptions}.
 *
 * @throws If `pitch <= 0`, `length <= 0`, cylinder is too non-circular,
 *         cylinder height < length, or `standard === "custom"` without a
 *         valid `depthOverride`.
 *
 * @example
 *   const rod = createCylinder(5, 20);            // ∅10mm × 20mm rod
 *   const m10 = thread(rod.mesh, 1.5, 15);        // ISO M10, 15mm of thread
 *   // → SolidResult with helical thread grooves cut into the outer surface
 */
export function thread(
  cyl: THREE.BufferGeometry,
  pitch: number,
  length: number,
  options: ThreadOptions = {}
): SolidResult {
  /* --- validate ----------------------------------------------------- */
  if (!Number.isFinite(pitch) || pitch <= 0) {
    throw new Error("thread: pitch must be > 0");
  }
  if (!Number.isFinite(length) || length <= 0) {
    throw new Error("thread: length must be > 0");
  }
  const standard: ThreadStandard = options.standard ?? "ISO";
  const external = options.external ?? true;
  const segments = Math.max(8, Math.floor(options.segments ?? 64));

  let depth: number;
  if (standard === "custom") {
    if (
      !options.depthOverride ||
      !Number.isFinite(options.depthOverride) ||
      options.depthOverride <= 0
    ) {
      throw new Error(
        "thread: standard=custom requires a positive depthOverride"
      );
    }
    depth = options.depthOverride;
  } else {
    // ISO & UN — 60° V, engaged depth ≈ 0.6134 * pitch.
    depth = pitch * 0.6134;
  }

  /* --- derive cylinder geometry from bbox --------------------------- */
  const bbox = exportBoundingBox(cyl);
  const radiusX = (bbox.max.x - bbox.min.x) / 2;
  const radiusY = (bbox.max.y - bbox.min.y) / 2;
  const radius = Math.max(radiusX, radiusY);
  const height = bbox.max.z - bbox.min.z;
  const zBase = bbox.min.z;

  if (radius <= 0) {
    throw new Error("thread: cylinder has zero radial extent");
  }
  const radialDelta = Math.abs(radiusX - radiusY) / Math.max(radiusX, radiusY);
  if (radialDelta > 0.2) {
    throw new Error(
      "thread: geometry does not look cylindrical (radii mismatch > 20%)"
    );
  }
  if (height < length) {
    throw new Error(
      `thread: cylinder height (${height.toFixed(3)}mm) < thread length (${length}mm)`
    );
  }

  /* --- three-bvh-csg availability short-circuit --------------------- */
  if (!isCsgAvailable()) {
    // eslint-disable-next-line no-console
    console.warn(
      "[opencad:thread] three-bvh-csg missing — returning cyl unchanged"
    );
    return booleanOp(cyl, cyl, "subtract"); // kernel warns + returns cyl clone
  }

  /* --- build helical V-cutter geometry ------------------------------ */
  const turns = options.turns ?? length / pitch;
  const totalPts = Math.max(2, Math.ceil(segments * turns));
  const positions: number[] = [];

  // Axial half-width of each V cross-section. ISO 60° V has a theoretical
  // base width equal to the pitch, but our helix tool sweeps an extruded
  // prism — if we use the full pitch, adjacent turns overlap and the
  // boolean removes too much material (turning the rod into a spiral
  // ribbon). Use 0.25 * pitch so adjacent turns leave a ~half-pitch gap
  // of uncut material (the thread crest) while still producing a valid
  // V-groove where the tool intersects the surface.
  const axialHalf = pitch * 0.25;

  // Radial placement of the V-cutter:
  //   external: apex points INWARD (toward axis), base sits just outside the outer wall.
  //   internal: apex points OUTWARD, base sits just inside the inner wall.
  // Small overshoot (0.05mm) guarantees the groove fully clears the surface.
  const overshoot = 0.05;
  const apexR = external ? radius - depth : radius + depth;
  const baseR = external ? radius + overshoot : radius - overshoot;

  // Pre-compute ring vertices (apex, baseTop, baseBottom per step).
  // Three points per step; stitched into quads between consecutive steps.
  const rings: Array<{
    apex: THREE.Vector3;
    baseTop: THREE.Vector3;
    baseBot: THREE.Vector3;
  }> = [];

  for (let i = 0; i <= totalPts; i += 1) {
    const t = i / totalPts;
    const theta = 2 * Math.PI * turns * t;
    const z = zBase + length * t;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const apex = new THREE.Vector3(apexR * cosT, apexR * sinT, z);
    const baseTop = new THREE.Vector3(baseR * cosT, baseR * sinT, z + axialHalf);
    const baseBot = new THREE.Vector3(baseR * cosT, baseR * sinT, z - axialHalf);
    rings.push({ apex, baseTop, baseBot });
  }

  // Stitch consecutive rings into quads (each triangular prism between ring
  // i and ring i+1 has 3 quad faces: apex↔baseTop, baseTop↔baseBot, baseBot↔apex).
  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const pushQuad = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    d: THREE.Vector3
  ) => {
    // Quad (a,b,c,d) → two triangles (a,b,c) + (a,c,d).
    pushTri(a, b, c);
    pushTri(a, c, d);
  };

  for (let i = 0; i < rings.length - 1; i += 1) {
    const r0 = rings[i];
    const r1 = rings[i + 1];
    // Face 1: apex-to-baseTop quad.
    pushQuad(r0.apex, r1.apex, r1.baseTop, r0.baseTop);
    // Face 2: baseTop-to-baseBot quad (outer back face).
    pushQuad(r0.baseTop, r1.baseTop, r1.baseBot, r0.baseBot);
    // Face 3: baseBot-to-apex quad (closing the prism).
    pushQuad(r0.baseBot, r1.baseBot, r1.apex, r0.apex);
  }

  // Cap both ends with triangular faces (apex, baseTop, baseBot).
  if (rings.length >= 2) {
    const first = rings[0];
    const last = rings[rings.length - 1];
    pushTri(first.apex, first.baseTop, first.baseBot);
    pushTri(last.apex, last.baseBot, last.baseTop);
  }

  /* --- assemble tool geometry --------------------------------------- */
  const toolGeom = new THREE.BufferGeometry();
  const posArr = new Float32Array(positions);
  toolGeom.setAttribute(
    "position",
    new THREE.BufferAttribute(posArr, 3)
  );
  toolGeom.computeVertexNormals();

  /* --- match attribute schema across both operands ------------------ */
  // three-bvh-csg's default Evaluator expects ['position', 'uv', 'normal']
  // on BOTH operands — any absent attribute crashes with
  // `Cannot read properties of undefined (reading 'array')`. Three's
  // CylinderGeometry ships with `uv`; our hand-built tool doesn't. Add a
  // zero-filled `uv` attribute to the tool so both operand schemas align.
  const vertexCount = posArr.length / 3;
  toolGeom.setAttribute(
    "uv",
    new THREE.BufferAttribute(new Float32Array(vertexCount * 2), 2)
  );

  /* --- subtract from cylinder --------------------------------------- */
  return booleanOp(cyl, toolGeom, "subtract");
}

/** Detect three-bvh-csg availability without triggering the kernel's warning twice. */
function isCsgAvailable(): boolean {
  try {
    // Bare `require` matches the kernel's own dynamic-load pattern and is
    // what vitest's module mocks intercept.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("three-bvh-csg");
    return true;
  } catch {
    return false;
  }
}
