/**
 * opencam — 2D contour / profile operation.
 *
 * Follows an outline with the tool offset to one side (inside / outside / on)
 * in multiple Z passes. Uses `offsetPolygon2D` from the kernel — a pure
 * fallback that does NOT require jscut, so contour ALWAYS works.
 */

import type { BBox3, Point2, Polyline3 } from "../cam-kernel";
import {
  mergeBBox3,
  polylineBBox,
  estimateDuration,
  offsetPolygon2D,
} from "../cam-kernel";
import type { OpResult, OpCommon } from "./pocket";

export interface ContourInput extends OpCommon {
  outline: Point2[];
  side: "inside" | "outside" | "on";
  closed: boolean;
}

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

function liftTo3D(poly: Point2[], z: number, closed: boolean): Polyline3 {
  const pts = poly.map((p) => ({ x: p.x, y: p.y, z }));
  if (closed && pts.length > 0) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first.x !== last.x || first.y !== last.y) {
      pts.push({ x: first.x, y: first.y, z });
    }
  }
  return pts;
}

/**
 * Generate a 2D contour toolpath.
 *
 * side="on"      → no offset (centerline follow)
 * side="inside"  → offset inward by toolRadius (cut pocket boundary from inside)
 * side="outside" → offset outward by toolRadius (cut part perimeter from outside)
 */
export async function generateContourToolpath(
  input: ContourInput,
): Promise<OpResult> {
  const warnings: string[] = [];
  const toolRadius = input.toolDiameterMm / 2;
  const stepdown = input.stepdownMm && input.stepdownMm > 0
    ? input.stepdownMm
    : input.toolDiameterMm * 0.25;
  const passZs = computePassZs(input.stockTopZMm, input.targetDepthMm, stepdown);

  let offset2D: Point2[];
  if (input.side === "on") {
    offset2D = input.outline.slice();
  } else {
    // offsetPolygon2D convention: positive delta shifts INWARD (shrinks),
    // negative delta shifts OUTWARD (grows). So inside = +toolRadius, outside = -toolRadius.
    const sign = input.side === "outside" ? -1 : +1;
    offset2D = offsetPolygon2D(input.outline, toolRadius * sign);
  }

  if (offset2D.length === 0) {
    warnings.push("contour offset produced empty polyline");
  }

  const polylines: Polyline3[] = [];
  const bboxes: BBox3[] = [];

  for (const z of passZs) {
    const line = liftTo3D(offset2D, z, input.closed);
    if (line.length < 2) continue;
    polylines.push(line);
    bboxes.push(polylineBBox(line));
  }

  const bbox = bboxes.length > 0
    ? mergeBBox3(...bboxes)
    : polylineBBox(liftTo3D(input.outline, input.stockTopZMm, input.closed));

  const estimatedDurationSec = estimateDuration(
    polylines,
    input.feedMmMin,
    input.rapidFeedMmMin ?? 3000,
    passZs.length,
    0.5,
  );

  return {
    kind: "contour",
    polylines,
    estimatedDurationSec,
    bbox,
    warnings,
  };
}
