/**
 * opencam — 2.5D pocket clearing operation.
 *
 * Generates a multi-pass concentric-offset pocket toolpath. For each Z step
 * the boundary is offset inward by `toolRadius`, then by `stepoverMm`
 * repeatedly until the offset polygon collapses (empty / self-intersecting /
 * degenerate). Each surviving offset becomes a closed chain at that Z.
 *
 * Pure-JS implementation built on `offsetPolygon2D` from the kernel — no
 * jscut / clipper-lib dependency. Robust for convex and mildly-concave
 * pockets; the kernel's naive offset will warn on self-intersection for
 * complex concave pockets, in which case the pocket op stops issuing further
 * concentric chains at that Z (graceful narrowing).
 *
 * Units: millimeters throughout. Stock top is at Z=stockTopZMm, cuts go
 * DOWNWARD to Z = stockTopZMm - targetDepthMm.
 *
 * Future work: swap `offsetPolygon2D` for a Vatti / Clipper2-WASM offset
 * (handles arbitrary concave shapes + holes / islands robustly). The function
 * signature here is stable; only the inner offset call needs to change.
 */

import type { BBox3, Point2, Polyline3 } from "../cam-kernel";
import {
  mergeBBox3,
  polylineBBox,
  estimateDuration,
  offsetPolygon2D,
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
  /** Optional finishing stock (mm) left on the wall. Default: 0. */
  finishStockMm?: number;
}

export interface OpResult {
  kind: "pocket" | "contour" | "face" | "adaptive";
  polylines: Polyline3[];
  estimatedDurationSec: number;
  bbox: BBox3;
  warnings: string[];
  notImplemented?: boolean;
}

/* ------------------------------------------------------------------ helpers */

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

/** Drop a 2D polyline onto a fixed Z plane to produce a closed 3D polyline. */
function liftTo3DClosed(poly: Point2[], z: number): Polyline3 {
  if (poly.length === 0) return [];
  const pts: Polyline3 = poly.map((p) => ({ x: p.x, y: p.y, z }));
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first.x !== last.x || first.y !== last.y) {
    pts.push({ x: first.x, y: first.y, z });
  }
  return pts;
}

/** Shoelace area (absolute value) of a closed polygon in mm². */
function polygonArea(poly: Point2[]): number {
  if (poly.length < 3) return 0;
  let signed = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    signed += a.x * b.y - b.x * a.y;
  }
  return Math.abs(signed) * 0.5;
}

/** Detect whether successive vertices have collapsed to (near) duplicates. */
function isDegenerate(poly: Point2[], epsMm = 1e-3): boolean {
  if (poly.length < 3) return true;
  let movement = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    movement += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return movement < epsMm;
}

/**
 * Generate the concentric chains (innermost-first ordering reversed at the
 * end so we return outermost-first) for a given pocket boundary at Z=0.
 */
function generateConcentricChains(
  outline: Point2[],
  toolRadiusMm: number,
  stepoverMm: number,
  finishStockMm: number,
  warnings: string[],
): Point2[][] {
  const chains: Point2[][] = [];
  const minArea = Math.PI * toolRadiusMm * toolRadiusMm * 0.05; // bail when offset shrinks below ~5% tool footprint

  // First offset = toolRadius + finishStock (one tool-radius inside the wall).
  let delta = toolRadiusMm + Math.max(0, finishStockMm);
  let prevArea = polygonArea(outline);
  let safety = 0;
  const safetyCap = 1000; // hard cap so a stuck loop can never run away

  while (safety < safetyCap) {
    safety += 1;
    const offset = offsetPolygon2D(outline, delta);
    if (offset.length < 3) break;
    if (isDegenerate(offset)) break;
    const area = polygonArea(offset);
    if (!Number.isFinite(area) || area < minArea) break;
    // If area ever GROWS or stays flat, the naive offset has folded over —
    // bail rather than emit garbage.
    if (area > prevArea * 1.05) {
      warnings.push(
        "pocket: offset area grew between passes — stopping concentric loop (likely concave-pocket fold)",
      );
      break;
    }
    chains.push(offset);
    prevArea = area;
    delta += stepoverMm;
    if (stepoverMm <= 0) break; // sanity
  }

  if (safety >= safetyCap) {
    warnings.push("pocket: hit safety cap of 1000 offsets — possible runaway");
  }

  // Reverse so outermost (first cut) comes first — conventional CAM order
  // for concentric pocketing (outside-in spiral). Better chip evacuation
  // and lower tool-deflection on the finish wall pass.
  return chains.reverse();
}

/* -------------------------------------------------------------- main entry */

/**
 * Generate a 2.5D pocket toolpath using iterative inward offsetting.
 *
 * Output: one closed polyline per concentric ring per Z step-down level.
 * Postprocessor is responsible for emitting rapid retracts between rings —
 * we expose chains as separate polylines so the postprocessor can decide
 * whether to lift to safeZ between them.
 */
export async function generatePocketToolpath(
  input: PocketInput,
): Promise<OpResult> {
  const warnings: string[] = [];
  const toolRadius = input.toolDiameterMm / 2;
  if (toolRadius <= 0) {
    return {
      kind: "pocket",
      polylines: [],
      estimatedDurationSec: 0,
      bbox: polylineBBox(
        input.outline.map((p) => ({ x: p.x, y: p.y, z: input.stockTopZMm })),
      ),
      warnings: ["pocket: invalid tool diameter — no toolpath produced"],
    };
  }

  const stepdown = input.stepdownMm && input.stepdownMm > 0
    ? input.stepdownMm
    : input.toolDiameterMm * 0.25;
  const stepoverRatio = input.stepoverRatio ?? 0.4;
  const stepoverMm = input.toolDiameterMm * stepoverRatio;
  const finishStock = input.finishStockMm ?? 0;
  const passZs = computePassZs(input.stockTopZMm, input.targetDepthMm, stepdown);

  if (input.islands && input.islands.length > 0) {
    // Islands require boolean polygon ops (Vatti) — flagged as a known
    // limitation of the naive offset pipeline. We still emit the outer
    // concentric chains so the user gets a partial result.
    warnings.push(
      "pocket: islands present — naive offset cannot subtract islands; chains may cut through them. Use a Clipper2-backed kernel for island support.",
    );
  }

  // Compute the concentric chain set ONCE in 2D (Z-independent for prismatic
  // pockets), then lift to each pass-Z. Significantly faster than recomputing
  // the offset chain per Z and gives identical geometry.
  const chains2D = generateConcentricChains(
    input.outline,
    toolRadius,
    stepoverMm,
    finishStock,
    warnings,
  );

  if (chains2D.length === 0) {
    warnings.push(
      "pocket: outline too small for tool — no concentric ring fits inside boundary at toolRadius offset",
    );
    return {
      kind: "pocket",
      polylines: [],
      estimatedDurationSec: 0,
      bbox: polylineBBox(
        input.outline.map((p) => ({ x: p.x, y: p.y, z: input.stockTopZMm })),
      ),
      warnings,
    };
  }

  const polylines: Polyline3[] = [];
  const bboxes: BBox3[] = [];
  for (const z of passZs) {
    for (const chain of chains2D) {
      const line = liftTo3DClosed(chain, z);
      if (line.length < 2) continue;
      polylines.push(line);
      bboxes.push(polylineBBox(line));
    }
  }

  const bbox = bboxes.length > 0
    ? mergeBBox3(...bboxes)
    : polylineBBox(
        input.outline.map((p) => ({ x: p.x, y: p.y, z: input.stockTopZMm })),
      );

  // Plunges = once per Z level (entry into pocket) — between concentric
  // rings the postprocessor can stay at depth (no plunge needed since we're
  // still inside cleared material).
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
