/**
 * opencam — pure-JS CAM kernel (M1).
 *
 * Toolpath generation primitives for the CAM companion to opencad. Unlike
 * cad-kernel.ts (which works in BufferGeometry solids), the CAM kernel works
 * in polylines (ordered point sequences) — the vocabulary native to G-code.
 *
 * All public functions are Node-compatible: no `window`, no `document`, no
 * DOM-dependent helpers. Units: millimeters (mm), feedrate in mm/min.
 *
 * Optional-peer pattern: `jscut` is used for 2.5D pocket / offset routines
 * when available — see `loadJscut()` below. Without it, adaptive / pocket
 * ops should return HTTP 501.
 */

/* ---------------------------------------------------------------- types */

export interface BBox3 {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface Point2 {
  x: number;
  y: number;
}

export type Polyline3 = { x: number; y: number; z: number }[];

export interface ToolpathResult {
  polylines: Polyline3[];
  estimatedDurationSec: number;
  bbox: BBox3;
}

/* ------------------------------------------------------------- optional jscut */

/**
 * Minimal surface of the jscut library used by pocket / adaptive routines.
 * Expanded as operators pull in more entry points.
 */
export interface JscutLib {
  /** Offset a closed polygon (in mm) by `delta` (mm). Positive = outward. */
  offset?: (polygon: Point2[], delta: number) => Point2[][];
  /** Generate a pocket-fill toolpath (stepover = tool diam × overlap). */
  pocket?: (
    outline: Point2[],
    toolDiameterMm: number,
    overlap: number,
  ) => Point2[][];
  // Extend as needed. Keep optional — callers MUST null-check.
}

let cachedJscut: JscutLib | null | undefined = undefined;

/**
 * Lazily load jscut; returns null if the package isn't installed.
 *
 * M1 tolerates a missing dep and ops that need it should 501. This mirrors
 * the three-bvh-csg pattern in apps/opencad/src/lib/cad-kernel.ts.
 */
export function loadJscut(): JscutLib | null {
  if (cachedJscut !== undefined) return cachedJscut;
  try {
    // jscut is in optionalDependencies and may not resolve in production builds.
    // Use an indirect require so Turbopack/webpack don't try to statically
    // resolve the module at build time (which fails the build with
    // `Module not found: Can't resolve 'jscut'`). Indirect eval hides the
    // require call from the bundler's static analyzer; only the runtime sees it.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const dynRequire = new Function("m", "return require(m)") as (m: string) => unknown;
    const mod = dynRequire("jscut") as JscutLib;
    cachedJscut = mod;
    return mod;
  } catch {
    // eslint-disable-next-line no-console
    console.warn("[opencam:kernel] jscut not installed — pocket/adaptive ops will 501");
    cachedJscut = null;
    return null;
  }
}

/* ---------------------------------------------------------------- helpers */

/** Euclidean length of a 3D polyline in mm. */
export function polylineLengthMm(p: Polyline3): number {
  let len = 0;
  for (let i = 1; i < p.length; i += 1) {
    const dx = p[i].x - p[i - 1].x;
    const dy = p[i].y - p[i - 1].y;
    const dz = p[i].z - p[i - 1].z;
    len += Math.hypot(dx, dy, dz);
  }
  return len;
}

/** Union of multiple bboxes. Returns a zero-bbox for empty input. */
export function mergeBBox3(...bs: BBox3[]): BBox3 {
  if (bs.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  }
  const out: BBox3 = {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
  };
  for (const b of bs) {
    if (b.min.x < out.min.x) out.min.x = b.min.x;
    if (b.min.y < out.min.y) out.min.y = b.min.y;
    if (b.min.z < out.min.z) out.min.z = b.min.z;
    if (b.max.x > out.max.x) out.max.x = b.max.x;
    if (b.max.y > out.max.y) out.max.y = b.max.y;
    if (b.max.z > out.max.z) out.max.z = b.max.z;
  }
  return out;
}

/** AABB of a single polyline. Zero-bbox for empty input. */
export function polylineBBox(p: Polyline3): BBox3 {
  if (p.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  }
  const out: BBox3 = {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
  };
  for (const v of p) {
    if (v.x < out.min.x) out.min.x = v.x;
    if (v.y < out.min.y) out.min.y = v.y;
    if (v.z < out.min.z) out.min.z = v.z;
    if (v.x > out.max.x) out.max.x = v.x;
    if (v.y > out.max.y) out.max.y = v.y;
    if (v.z > out.max.z) out.max.z = v.z;
  }
  return out;
}

/**
 * Estimate total cycle time (seconds) for a sequence of cut polylines.
 * Rapids between polylines are charged at `rapidMmMin`, cuts at `feedMmMin`,
 * and every plunge adds `plungeSec` of overhead.
 */
export function estimateDuration(
  polylines: Polyline3[],
  feedMmMin: number,
  rapidMmMin = 3000,
  plunges = 0,
  plungeSec = 0.5,
): number {
  if (feedMmMin <= 0) return 0;
  let cutLen = 0;
  let rapidLen = 0;
  let last: { x: number; y: number; z: number } | null = null;
  for (const p of polylines) {
    if (p.length === 0) continue;
    if (last) {
      const dx = p[0].x - last.x;
      const dy = p[0].y - last.y;
      const dz = p[0].z - last.z;
      rapidLen += Math.hypot(dx, dy, dz);
    }
    cutLen += polylineLengthMm(p);
    last = p[p.length - 1];
  }
  const feedSec = (cutLen / feedMmMin) * 60;
  const rapidSec = rapidMmMin > 0 ? (rapidLen / rapidMmMin) * 60 : 0;
  return feedSec + rapidSec + plunges * plungeSec;
}

/* ------------------------------------------------------------- 2D offset */

/**
 * Naive edge-offset for a closed 2D polygon (M1 stub).
 *
 * For each edge, shifts in the inward normal direction by `offsetMm`; joins
 * are line-intersection (miter) with a fallback to the raw shifted corner
 * when parallel. Warns on self-intersection without attempting repair —
 * pocket ops should use jscut when available.
 *
 * Replicad TODO: swap to Clipper2-WASM for production-grade offsets.
 */
export function offsetPolygon2D(polygon: Point2[], offsetMm: number): Point2[] {
  if (polygon.length < 3 || offsetMm === 0) return polygon.slice();

  const n = polygon.length;
  // Compute signed area → determine polygon orientation (CCW = positive).
  let signed = 0;
  for (let i = 0; i < n; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    signed += (b.x - a.x) * (b.y + a.y);
  }
  const inwardSign = signed > 0 ? -1 : 1; // shoelace positive => CW here

  // Shift each edge by offset along its inward normal.
  const shifted: { a: Point2; b: Point2 }[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * offsetMm * inwardSign;
    const ny = (dx / len) * offsetMm * inwardSign;
    shifted.push({ a: { x: a.x + nx, y: a.y + ny }, b: { x: b.x + nx, y: b.y + ny } });
  }

  // Intersect consecutive shifted edges to get corner points.
  const out: Point2[] = [];
  for (let i = 0; i < n; i += 1) {
    const prev = shifted[(i - 1 + n) % n];
    const curr = shifted[i];
    const p = intersectLines(prev.a, prev.b, curr.a, curr.b);
    out.push(p ?? curr.a);
  }

  if (detectSelfIntersection(out)) {
    // eslint-disable-next-line no-console
    console.warn("[opencam:kernel] offsetPolygon2D produced self-intersection — use jscut for robust offset");
  }
  return out;
}

function intersectLines(
  p0: Point2,
  p1: Point2,
  p2: Point2,
  p3: Point2,
): Point2 | null {
  const s1x = p1.x - p0.x;
  const s1y = p1.y - p0.y;
  const s2x = p3.x - p2.x;
  const s2y = p3.y - p2.y;
  const denom = -s2x * s1y + s1x * s2y;
  if (Math.abs(denom) < 1e-9) return null;
  const t = (s2x * (p0.y - p2.y) - s2y * (p0.x - p2.x)) / denom;
  return { x: p0.x + t * s1x, y: p0.y + t * s1y };
}

function detectSelfIntersection(poly: Point2[]): boolean {
  const n = poly.length;
  for (let i = 0; i < n; i += 1) {
    const a0 = poly[i];
    const a1 = poly[(i + 1) % n];
    for (let j = i + 2; j < n; j += 1) {
      // Skip adjacent / wrap-adjacent segments.
      if (i === 0 && j === n - 1) continue;
      const b0 = poly[j];
      const b1 = poly[(j + 1) % n];
      if (segmentsIntersect(a0, a1, b0, b1)) return true;
    }
  }
  return false;
}

function segmentsIntersect(p1: Point2, p2: Point2, p3: Point2, p4: Point2): boolean {
  const d1 = cross(p4.x - p3.x, p4.y - p3.y, p1.x - p3.x, p1.y - p3.y);
  const d2 = cross(p4.x - p3.x, p4.y - p3.y, p2.x - p3.x, p2.y - p3.y);
  const d3 = cross(p2.x - p1.x, p2.y - p1.y, p3.x - p1.x, p3.y - p1.y);
  const d4 = cross(p2.x - p1.x, p2.y - p1.y, p4.x - p1.x, p4.y - p1.y);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

/* ------------------------------------------------------------- refine */

/**
 * Subdivide polyline edges so no segment exceeds `maxSegmentMm`.
 * Useful before simulation / G-code emission to avoid chord error on arcs
 * or long linear moves that an emulator might discretize coarsely.
 */
export function tessellatePolylines(
  polylines: Polyline3[],
  maxSegmentMm: number,
): Polyline3[] {
  if (maxSegmentMm <= 0) return polylines.map((p) => p.slice());
  return polylines.map((p) => {
    const out: { x: number; y: number; z: number }[] = [];
    if (p.length === 0) return out;
    out.push({ ...p[0] });
    for (let i = 1; i < p.length; i += 1) {
      const a = p[i - 1];
      const b = p[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dy, dz);
      const steps = Math.max(1, Math.ceil(len / maxSegmentMm));
      for (let s = 1; s <= steps; s += 1) {
        const t = s / steps;
        out.push({ x: a.x + dx * t, y: a.y + dy * t, z: a.z + dz * t });
      }
    }
    return out;
  });
}
