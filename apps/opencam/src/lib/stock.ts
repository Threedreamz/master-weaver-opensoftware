/**
 * opencam — stock setup + material-removal helpers.
 *
 * Pure functions, no DB access. The M1 removal sim is an approximation —
 * `simulateRemoveVolume` sums swept-cylinder volume across all toolpaths
 * rather than running a voxel grid. M2 will implement voxel-based removal
 * once the kernel can tessellate parts consistently.
 */

import type { BBox3, Polyline3 } from "./cam-kernel";
import { polylineLengthMm, polylineBBox, mergeBBox3 } from "./cam-kernel";

export interface StockSetup {
  bbox: BBox3;
  material?: string;
}

/**
 * Origin-centered rectangular stock. Width is X, depth is Y, height is Z.
 * Z ranges from 0 to +height (work-top on XY plane).
 */
export function rectangularStock(
  widthMm: number,
  depthMm: number,
  heightMm: number,
  material?: string,
): StockSetup {
  if (widthMm <= 0 || depthMm <= 0 || heightMm <= 0) {
    throw new Error("rectangularStock: dimensions must be positive");
  }
  const hx = widthMm / 2;
  const hy = depthMm / 2;
  return {
    bbox: {
      min: { x: -hx, y: -hy, z: 0 },
      max: { x: hx, y: hy, z: heightMm },
    },
    material,
  };
}

/**
 * Compute stock bbox that surrounds a part's bbox with the given offsets.
 * `xy` grows the stock in X and Y equally; `zTop` and `zBottom` extend Z
 * above and below the part.
 */
export function stockFromPartBBox(
  partBbox: BBox3,
  offsets: { xy: number; zTop: number; zBottom: number },
  material?: string,
): StockSetup {
  const { xy, zTop, zBottom } = offsets;
  return {
    bbox: {
      min: { x: partBbox.min.x - xy, y: partBbox.min.y - xy, z: partBbox.min.z - zBottom },
      max: { x: partBbox.max.x + xy, y: partBbox.max.y + xy, z: partBbox.max.z + zTop },
    },
    material,
  };
}

/** Volume (mm³) of an axis-aligned bbox. Returns 0 for degenerate bboxes. */
export function bboxVolumeMm3(b: BBox3): number {
  const dx = Math.max(0, b.max.x - b.min.x);
  const dy = Math.max(0, b.max.y - b.min.y);
  const dz = Math.max(0, b.max.z - b.min.z);
  return dx * dy * dz;
}

/**
 * Intersection of an operation bbox with the stock bbox. Callers should
 * treat a zero-volume result as "toolpath lies outside stock" and warn.
 */
export function clampToStock(bbox: BBox3, stock: BBox3): BBox3 {
  return {
    min: {
      x: Math.max(bbox.min.x, stock.min.x),
      y: Math.max(bbox.min.y, stock.min.y),
      z: Math.max(bbox.min.z, stock.min.z),
    },
    max: {
      x: Math.min(bbox.max.x, stock.max.x),
      y: Math.min(bbox.max.y, stock.max.y),
      z: Math.min(bbox.max.z, stock.max.z),
    },
  };
}

/**
 * Estimate material removed by a set of toolpaths (M1 stub).
 *
 * For each toolpath we approximate the swept volume as
 *   length × π × (toolDiameterMm / 2)²
 * then cap the total at the stock bounding volume. This ignores overlap
 * between toolpaths, plunge plunges, and partial engagement — fine for
 * first-order UI feedback but NOT accurate enough for costing. M2 replaces
 * this with a voxelised remove-and-report pass.
 */
export function simulateRemoveVolume(
  stock: BBox3,
  toolpaths: { polylines: Polyline3[]; toolDiameterMm: number }[],
): { removedVolumeMm3: number; finalBbox: BBox3; frames: number } {
  const stockVol = bboxVolumeMm3(stock);
  let removed = 0;
  const bboxes: BBox3[] = [];
  let frames = 0;
  for (const tp of toolpaths) {
    if (tp.toolDiameterMm <= 0) continue;
    const radius = tp.toolDiameterMm / 2;
    const area = Math.PI * radius * radius;
    for (const line of tp.polylines) {
      if (line.length < 2) continue;
      removed += polylineLengthMm(line) * area;
      bboxes.push(polylineBBox(line));
      frames += Math.max(1, line.length - 1);
    }
  }
  const cappedRemoved = Math.min(removed, stockVol);
  const finalBbox = bboxes.length > 0 ? mergeBBox3(...bboxes, stock) : stock;
  return {
    removedVolumeMm3: cappedRemoved,
    finalBbox,
    frames,
  };
}
