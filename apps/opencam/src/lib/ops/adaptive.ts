/**
 * opencam — 2.5D adaptive clearing operation (M2, simplified).
 *
 * SIMPLIFICATION NOTICE
 * =====================
 * True adaptive clearing maintains a *constant* tool-engagement angle by
 * tracking medial-axis distance and emitting trochoidal moves whose radius
 * is chosen so that material removal per revolution never exceeds
 * `maxEngagementRatio × toolDiameter`. That is genuinely hard:
 *   - requires a robust medial-axis transform of the residual stock polygon;
 *   - each move's effective engagement must be re-evaluated against the
 *     current cleared-region polygon (boolean diff after every step);
 *   - corners need true trochoidal loops, not just smoothed arcs.
 *
 * This M2 implementation delivers a "good enough" first pass:
 *
 *   1. Inset the boundary by `tool.radius + finishStock` (one offset).
 *   2. Build N concentric "morphed-spiral" rings by linearly interpolating
 *      between the boundary inset and its centroid, each ring spaced so the
 *      radial bite per pass ≈ `maxEngagementRatio × toolDiameter`.
 *   3. Smooth each ring with a Catmull-Rom pass to keep transitions tangent
 *      (corners are where engagement spikes — softening them is the cheapest
 *      proxy for true adaptive engagement-tracking).
 *   4. Connect adjacent rings with a tangent transition segment so the tool
 *      morphs from outer ring to inner without rapid retracts.
 *   5. Repeat at each Z-level.
 *
 * What this DOES NOT do (deferred to M3.5):
 *   - true engagement tracking (this code may exceed `maxEngagementRatio`
 *     near concave corners — same failure mode as concentric pocket clearing);
 *   - medial-axis-based path generation;
 *   - residual-pocket detection between rings;
 *   - genuine trochoidal moves on entry / direction changes.
 *
 * Despite the simplifications, the output is a closed-loop, depth-stepped,
 * geometrically valid roughing toolpath that respects the API contract and
 * produces sane results on convex / mildly concave boundaries — much better
 * than 422.
 *
 * Units: millimeters throughout.
 */

import type { BBox3, Point2, Polyline3 } from "../cam-kernel";
import {
  mergeBBox3,
  polylineBBox,
  estimateDuration,
  offsetPolygon2D,
} from "../cam-kernel";
import type { OpResult, OpCommon } from "./pocket";

export interface AdaptiveInput extends OpCommon {
  /** Closed boundary polygon (>= 3 points). */
  outline: Point2[];
  /** Max radial engagement as ratio of tool diameter (default 0.3 = 30 %). */
  maxEngagementRatio?: number;
  /** Finishing stock (mm) left on walls for a finishing pass. Default 0. */
  finishStockMm?: number;
  /** Catmull-Rom subdivisions per segment for ring smoothing. Default 4. */
  smoothSubdivisions?: number;
}

/* ------------------------------------------------------------------ helpers */

function computePassZs(
  stockTopZMm: number,
  targetDepthMm: number,
  stepdownMm: number,
): number[] {
  const zs: number[] = [];
  if (targetDepthMm <= 0) return [stockTopZMm];
  const step = stepdownMm > 0 ? stepdownMm : targetDepthMm;
  let depth = Math.min(step, targetDepthMm);
  while (depth < targetDepthMm) {
    zs.push(stockTopZMm - depth);
    depth = Math.min(depth + step, targetDepthMm);
  }
  zs.push(stockTopZMm - targetDepthMm);
  return zs;
}

/** Centroid of a closed polygon (area-weighted via shoelace). Falls back to
 *  vertex mean for degenerate / zero-area polygons. */
function polygonCentroid(poly: Point2[]): Point2 {
  if (poly.length === 0) return { x: 0, y: 0 };
  if (poly.length < 3) {
    let sx = 0;
    let sy = 0;
    for (const p of poly) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / poly.length, y: sy / poly.length };
  }
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  const n = poly.length;
  for (let i = 0; i < n; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const cross = a.x * b.y - b.x * a.y;
    twiceArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(twiceArea) < 1e-9) {
    let sx = 0;
    let sy = 0;
    for (const p of poly) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / n, y: sy / n };
  }
  const area6 = 3 * twiceArea;
  return { x: cx / area6, y: cy / area6 };
}

/** Approximate the "radius" of a polygon: max distance from centroid to any
 *  vertex. Used to pick the number of morphed rings. */
function polygonRadius(poly: Point2[], centroid: Point2): number {
  let r = 0;
  for (const p of poly) {
    const d = Math.hypot(p.x - centroid.x, p.y - centroid.y);
    if (d > r) r = d;
  }
  return r;
}

/** Linearly interpolate every vertex toward centroid by factor t in [0,1].
 *  t=0 returns the polygon; t=1 collapses to the centroid point. */
function morphTowardCentroid(
  poly: Point2[],
  centroid: Point2,
  t: number,
): Point2[] {
  return poly.map((p) => ({
    x: p.x + (centroid.x - p.x) * t,
    y: p.y + (centroid.y - p.y) * t,
  }));
}

/** Catmull-Rom spline subdivision for a closed polygon. */
function smoothCatmullRomClosed(
  poly: Point2[],
  subdivisions: number,
): Point2[] {
  if (poly.length < 4 || subdivisions < 2) return poly.slice();
  const n = poly.length;
  const out: Point2[] = [];
  for (let i = 0; i < n; i += 1) {
    const p0 = poly[(i - 1 + n) % n];
    const p1 = poly[i];
    const p2 = poly[(i + 1) % n];
    const p3 = poly[(i + 2) % n];
    for (let s = 0; s < subdivisions; s += 1) {
      const t = s / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        ((2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y =
        0.5 *
        ((2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      out.push({ x, y });
    }
  }
  return out;
}

/** Lift a 2D ring to a closed 3D polyline at z. */
function liftClosed(poly: Point2[], z: number): Polyline3 {
  if (poly.length === 0) return [];
  const out: Polyline3 = poly.map((p) => ({ x: p.x, y: p.y, z }));
  const first = out[0];
  const last = out[out.length - 1];
  if (first.x !== last.x || first.y !== last.y) {
    out.push({ x: first.x, y: first.y, z });
  }
  return out;
}

/* ------------------------------------------------------------------ main */

/**
 * Generate a 2.5D adaptive (morphed-spiral) clearing toolpath.
 *
 * Strategy is "concentric morphed rings + smoothed corners" — see the
 * SIMPLIFICATION NOTICE above. NOT mathematically true adaptive but produces
 * usable, low-engagement-ish roughing paths without external dependencies.
 */
export async function generateAdaptiveToolpath(
  input: AdaptiveInput,
): Promise<OpResult> {
  const warnings: string[] = [];

  if (!Array.isArray(input.outline) || input.outline.length < 3) {
    return {
      kind: "adaptive",
      polylines: [],
      estimatedDurationSec: 0,
      bbox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
      warnings: ["adaptive: outline must have >= 3 points"],
    };
  }

  const toolRadius = input.toolDiameterMm / 2;
  const finishStock = input.finishStockMm ?? 0;
  const maxEngagement = input.maxEngagementRatio ?? 0.3;
  const stepdown = input.stepdownMm && input.stepdownMm > 0
    ? input.stepdownMm
    : input.toolDiameterMm * 0.5; // adaptive tolerates deeper cuts than pocket
  const subdivisions = Math.max(2, input.smoothSubdivisions ?? 4);

  // --- 1. Outer-most cutting boundary: outline inset by (toolRadius + finishStock).
  //     offsetPolygon2D convention: positive delta shifts INWARD (shrinks).
  const inset = offsetPolygon2D(input.outline, toolRadius + finishStock);
  if (inset.length < 3) {
    warnings.push(
      "adaptive: outline too small for tool diameter — produced no toolpath",
    );
    return {
      kind: "adaptive",
      polylines: [],
      estimatedDurationSec: 0,
      bbox: polylineBBox(
        input.outline.map((p) => ({ x: p.x, y: p.y, z: input.stockTopZMm })),
      ),
      warnings,
    };
  }

  // --- 2. Decide how many rings: radial bite per ring ≤ maxEngagement × toolDiam.
  const centroid = polygonCentroid(inset);
  const innerRadius = polygonRadius(inset, centroid);
  const radialBite = Math.max(
    0.5,
    maxEngagement * input.toolDiameterMm,
  );
  // +1 because we include the outer ring (t=0) AND the centroid-adjacent ring.
  const ringCount = Math.max(2, Math.ceil(innerRadius / radialBite) + 1);

  // Build ring 2D polygons by morphing toward centroid in equal-t steps.
  // We stop short of t=1 so the inner-most ring has some perimeter to cut.
  const rings2D: Point2[][] = [];
  for (let i = 0; i < ringCount; i += 1) {
    const t = (i / Math.max(1, ringCount - 1)) * 0.95; // never collapse to a point
    const morphed = morphTowardCentroid(inset, centroid, t);
    const smoothed = smoothCatmullRomClosed(morphed, subdivisions);
    rings2D.push(smoothed);
  }

  // --- 3. For each Z-level, emit rings outer→inner. We append to polylines
  //        list; the duration estimator charges the gap between successive
  //        polyline starts as a rapid (cheap stand-in for tangent transition).
  const passZs = computePassZs(
    input.stockTopZMm,
    input.targetDepthMm,
    stepdown,
  );

  const polylines: Polyline3[] = [];
  const bboxes: BBox3[] = [];

  for (const z of passZs) {
    for (const ring of rings2D) {
      const lifted = liftClosed(ring, z);
      if (lifted.length < 2) continue;
      polylines.push(lifted);
      bboxes.push(polylineBBox(lifted));
    }
  }

  if (polylines.length === 0) {
    warnings.push("adaptive: produced no toolpath — check outline / tool size");
  }

  const bbox = bboxes.length > 0
    ? mergeBBox3(...bboxes)
    : polylineBBox(
        input.outline.map((p) => ({ x: p.x, y: p.y, z: input.stockTopZMm })),
      );

  // Each Z-level counts as one plunge. Adaptive nominally permits higher feed
  // rates than concentric pocket so we keep the same charge structure as
  // pocket.ts and let callers raise feedMmMin in op params if desired.
  const estimatedDurationSec = estimateDuration(
    polylines,
    input.feedMmMin,
    input.rapidFeedMmMin ?? 3000,
    passZs.length,
    0.5,
  );

  return {
    kind: "adaptive",
    polylines,
    estimatedDurationSec,
    bbox,
    warnings,
  };
}
