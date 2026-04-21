/**
 * opencam — face / surfacing operation (raster / zigzag).
 *
 * Produces a raster toolpath parallel to the chosen axis covering a 2D
 * rectangle derived from the input bbox. Zigzag direction alternates per
 * line so the tool doesn't rapid back to the start between lines. Multi-
 * pass in Z for depths beyond a single stepdown. Pure fallback — no jscut.
 */

import type { BBox3, Polyline3 } from "../cam-kernel";
import {
  mergeBBox3,
  polylineBBox,
  estimateDuration,
} from "../cam-kernel";
import type { OpResult, OpCommon } from "./pocket";

export interface FaceInput extends OpCommon {
  bounds: BBox3;
  direction: "x" | "y";
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

/**
 * Generate a facing toolpath — raster lines across a rectangle with
 * zigzag reversal to minimise rapids between passes.
 */
export async function generateFaceToolpath(
  input: FaceInput,
): Promise<OpResult> {
  const warnings: string[] = [];
  const stepover = input.stepoverRatio ?? 0.65;
  const stepdown = input.stepdownMm && input.stepdownMm > 0
    ? input.stepdownMm
    : input.toolDiameterMm * 0.25;
  const spacing = input.toolDiameterMm * stepover;
  if (spacing <= 0) {
    warnings.push("face: invalid tool diameter / stepover — no toolpath produced");
    return {
      kind: "face",
      polylines: [],
      estimatedDurationSec: 0,
      bbox: input.bounds,
      warnings,
    };
  }

  const passZs = computePassZs(input.stockTopZMm, input.targetDepthMm, stepdown);

  const xMin = input.bounds.min.x;
  const xMax = input.bounds.max.x;
  const yMin = input.bounds.min.y;
  const yMax = input.bounds.max.y;

  const polylines: Polyline3[] = [];
  const bboxes: BBox3[] = [];

  for (const z of passZs) {
    if (input.direction === "x") {
      // Raster lines run along X; step in Y.
      const yRange = yMax - yMin;
      const lines = Math.max(1, Math.ceil(yRange / spacing) + 1);
      const actualSpacing = lines > 1 ? yRange / (lines - 1) : 0;
      for (let i = 0; i < lines; i += 1) {
        const y = lines === 1 ? (yMin + yMax) / 2 : yMin + i * actualSpacing;
        const forward = i % 2 === 0;
        const line: Polyline3 = forward
          ? [
              { x: xMin, y, z },
              { x: xMax, y, z },
            ]
          : [
              { x: xMax, y, z },
              { x: xMin, y, z },
            ];
        polylines.push(line);
        bboxes.push(polylineBBox(line));
      }
    } else {
      // Raster lines run along Y; step in X.
      const xRange = xMax - xMin;
      const lines = Math.max(1, Math.ceil(xRange / spacing) + 1);
      const actualSpacing = lines > 1 ? xRange / (lines - 1) : 0;
      for (let i = 0; i < lines; i += 1) {
        const x = lines === 1 ? (xMin + xMax) / 2 : xMin + i * actualSpacing;
        const forward = i % 2 === 0;
        const line: Polyline3 = forward
          ? [
              { x, y: yMin, z },
              { x, y: yMax, z },
            ]
          : [
              { x, y: yMax, z },
              { x, y: yMin, z },
            ];
        polylines.push(line);
        bboxes.push(polylineBBox(line));
      }
    }
  }

  const bbox = bboxes.length > 0 ? mergeBBox3(...bboxes) : input.bounds;
  const estimatedDurationSec = estimateDuration(
    polylines,
    input.feedMmMin,
    input.rapidFeedMmMin ?? 3000,
    passZs.length,
    0.5,
  );

  return {
    kind: "face",
    polylines,
    estimatedDurationSec,
    bbox,
    warnings,
  };
}
