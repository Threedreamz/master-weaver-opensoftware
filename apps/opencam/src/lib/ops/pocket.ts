/**
 * opencam — 2.5D pocket clearing operation.
 *
 * Generates a multi-pass pocket toolpath by repeatedly calling jscut.pocket
 * at each Z-level. Without jscut this op degrades gracefully: it returns
 * an empty toolpath with `notImplemented: true` and a warning, mirroring
 * the "optional peer dep" pattern in `cam-kernel.ts`.
 *
 * Units: millimeters throughout. Stock top is at Z=stockTopZMm, cuts go
 * DOWNWARD to Z = stockTopZMm - targetDepthMm.
 */

import type { BBox3, Point2, Polyline3 } from "../cam-kernel";
import {
  loadJscut,
  mergeBBox3,
  polylineBBox,
  estimateDuration,
} from "../cam-kernel";

export interface OpCommon {
  toolDiameterMm: number;
  feedMmMin: number;
  plungeFeedMmMin?: number;
  rapidFeedMmMin?: number;
  spindleRpm: number;
  safeZMm: number;
  stockTopZMm: number;
  stepoverRatio?: number;
  stepdownMm?: number;
  targetDepthMm: number;
}

export interface PocketInput extends OpCommon {
  outline: Point2[];
  islands?: Point2[][];
}

export interface OpResult {
  kind: "pocket" | "contour" | "face";
  polylines: Polyline3[];
  estimatedDurationSec: number;
  bbox: BBox3;
  warnings: string[];
  notImplemented?: boolean;
}

/** Compute the list of Z-levels for multi-pass depth stepping. */
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
  // Final pass at exact target depth.
  zs.push(stockTopZMm - targetDepthMm);
  return zs;
}

/** Drop a 2D polyline onto a fixed Z plane to produce a 3D polyline. */
function liftTo3D(poly: Point2[], z: number): Polyline3 {
  return poly.map((p) => ({ x: p.x, y: p.y, z }));
}

/**
 * Generate a 2.5D pocket toolpath.
 *
 * Requires jscut for robust offset / pocket fill. If jscut is absent, the
 * op returns `notImplemented: true` with an empty polyline list so UIs can
 * surface a "pocket unavailable — install jscut" banner.
 */
export async function generatePocketToolpath(
  input: PocketInput,
): Promise<OpResult> {
  const warnings: string[] = [];
  const jscut = loadJscut();

  const stepdown = input.stepdownMm && input.stepdownMm > 0
    ? input.stepdownMm
    : input.toolDiameterMm * 0.25;
  const stepover = input.stepoverRatio ?? 0.4;
  const passZs = computePassZs(input.stockTopZMm, input.targetDepthMm, stepdown);

  if (!jscut || typeof jscut.pocket !== "function") {
    // Fallback: outline bbox drives the result bbox so downstream sims have
    // something to show. Empty polylines signal "not implemented".
    const outlineBBox = polylineBBox(liftTo3D(input.outline, input.stockTopZMm));
    return {
      kind: "pocket",
      polylines: [],
      estimatedDurationSec: 0,
      bbox: outlineBBox,
      warnings: ["jscut not installed — pocket requires optional dep"],
      notImplemented: true,
    };
  }

  const polylines: Polyline3[] = [];
  const bboxes: BBox3[] = [];

  for (const z of passZs) {
    let loops: Point2[][] = [];
    try {
      loops = jscut.pocket(input.outline, input.toolDiameterMm, stepover) ?? [];
    } catch (err) {
      warnings.push(
        `jscut.pocket threw at z=${z.toFixed(3)}: ${(err as Error).message}`,
      );
      continue;
    }
    for (const loop of loops) {
      if (!loop || loop.length === 0) continue;
      const line = liftTo3D(loop, z);
      polylines.push(line);
      bboxes.push(polylineBBox(line));
    }
  }

  if (polylines.length === 0) {
    warnings.push("jscut.pocket returned no toolpath — check outline validity");
  }

  const bbox = bboxes.length > 0
    ? mergeBBox3(...bboxes)
    : polylineBBox(liftTo3D(input.outline, input.stockTopZMm));

  const estimatedDurationSec = estimateDuration(
    polylines,
    input.feedMmMin,
    input.rapidFeedMmMin ?? 3000,
    passZs.length,
    0.5,
  );

  return {
    kind: "pocket",
    polylines,
    estimatedDurationSec,
    bbox,
    warnings,
  };
}
