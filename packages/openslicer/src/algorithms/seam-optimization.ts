/**
 * Seam Placement Optimization
 *
 * Determines where each perimeter loop starts/ends (the "seam") to minimize
 * visual artifacts on the printed surface. Different strategies trade off
 * between speed, visual quality, and consistency.
 */

import type { SeamPosition } from "../types";

export type Point2D = { x: number; y: number };

export interface PerimeterLoop {
  /** Ordered points forming a closed perimeter loop */
  points: Point2D[];
  /** Layer index this perimeter belongs to */
  layerIndex: number;
}

export interface SeamResult {
  /** Index into the perimeter's points array where the seam should start */
  startIndex: number;
  /** The seam point */
  point: Point2D;
}

/**
 * Choose seam position for a perimeter loop based on the selected strategy.
 *
 * @param perimeter - The perimeter loop
 * @param strategy - Seam placement strategy
 * @param previousSeam - Previous layer's seam point (for 'aligned' strategy)
 * @param backPoint - Reference "back" point (for 'back' strategy, typically max Y or user-specified)
 */
export function chooseSeamPosition(
  perimeter: PerimeterLoop,
  strategy: SeamPosition,
  previousSeam?: Point2D,
  backPoint?: Point2D,
): SeamResult {
  const points = perimeter.points;
  if (points.length === 0) {
    return { startIndex: 0, point: { x: 0, y: 0 } };
  }

  switch (strategy) {
    case "nearest":
      return seamNearest(points, previousSeam);
    case "back":
      return seamBack(points, backPoint);
    case "random":
      return seamRandom(points, perimeter.layerIndex);
    case "aligned":
      return seamAligned(points, previousSeam);
  }
}

/**
 * Nearest strategy: place seam at the point closest to the previous seam
 * (or closest to origin if no previous seam). Minimizes travel distance
 * but may create a visible seam line.
 */
function seamNearest(points: Point2D[], previous?: Point2D): SeamResult {
  const ref = previous ?? { x: 0, y: 0 };
  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - ref.x;
    const dy = points[i].y - ref.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  return { startIndex: bestIndex, point: points[bestIndex] };
}

/**
 * Back strategy: place seam at the point closest to a "back" reference
 * point (typically the maximum Y of the build plate). Hides the seam
 * on the back of the model.
 */
function seamBack(points: Point2D[], backPoint?: Point2D): SeamResult {
  // Default "back" is max Y among perimeter points
  const ref = backPoint ?? { x: centroidX(points), y: Math.max(...points.map((p) => p.y)) + 100 };

  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - ref.x;
    const dy = points[i].y - ref.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  return { startIndex: bestIndex, point: points[bestIndex] };
}

/**
 * Random strategy: pseudo-random seam placement per layer.
 * Uses layer index as seed for deterministic randomness.
 * Distributes seam artifacts across the surface, making them less visible.
 */
function seamRandom(points: Point2D[], layerIndex: number): SeamResult {
  // Simple deterministic hash from layer index
  const hash = ((layerIndex * 2654435761) >>> 0) % points.length;
  return { startIndex: hash, point: points[hash] };
}

/**
 * Aligned strategy: try to place seam in the same position as the previous
 * layer's seam. When the geometry shifts, find the closest concave corner
 * to hide the seam.
 */
function seamAligned(points: Point2D[], previousSeam?: Point2D): SeamResult {
  if (!previousSeam) {
    // First layer: pick a concave corner if available, else index 0
    const concaveIdx = findBestConcaveCorner(points);
    return { startIndex: concaveIdx, point: points[concaveIdx] };
  }

  // Find point closest to previous seam
  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - previousSeam.x;
    const dy = points[i].y - previousSeam.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }

  // If close enough, use it; otherwise search for a nearby concave corner
  if (bestDist < 1.0) {
    return { startIndex: bestIndex, point: points[bestIndex] };
  }

  // Search near the closest point for concave corners
  const searchRadius = Math.min(10, Math.floor(points.length / 4));
  let bestCornerIndex = bestIndex;
  let bestConcavity = 0;

  for (let offset = -searchRadius; offset <= searchRadius; offset++) {
    const idx = ((bestIndex + offset) % points.length + points.length) % points.length;
    const concavity = cornerConcavity(points, idx);
    if (concavity > bestConcavity) {
      bestConcavity = concavity;
      bestCornerIndex = idx;
    }
  }

  return { startIndex: bestCornerIndex, point: points[bestCornerIndex] };
}

/**
 * Find the most concave corner in the perimeter for seam hiding.
 */
function findBestConcaveCorner(points: Point2D[]): number {
  let bestIndex = 0;
  let bestConcavity = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const c = cornerConcavity(points, i);
    if (c > bestConcavity) {
      bestConcavity = c;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Calculate concavity at a corner point. Positive = concave (good for hiding seam).
 */
function cornerConcavity(points: Point2D[], index: number): number {
  const n = points.length;
  const prev = points[((index - 1) % n + n) % n];
  const curr = points[index];
  const next = points[(index + 1) % n];

  // Cross product of vectors (prev->curr) x (curr->next)
  const ax = curr.x - prev.x;
  const ay = curr.y - prev.y;
  const bx = next.x - curr.x;
  const by = next.y - curr.y;

  const cross = ax * by - ay * bx;

  // Also factor in the angle sharpness
  const dot = ax * bx + ay * by;
  const lenA = Math.sqrt(ax * ax + ay * ay);
  const lenB = Math.sqrt(bx * bx + by * by);
  if (lenA < 1e-10 || lenB < 1e-10) return 0;

  const cosAngle = dot / (lenA * lenB);
  const sharpness = 1 - cosAngle; // 0 = straight, 2 = U-turn

  // Positive cross = concave (for CCW winding), weighted by sharpness
  return cross > 0 ? sharpness : -sharpness;
}

function centroidX(points: Point2D[]): number {
  let sum = 0;
  for (const p of points) sum += p.x;
  return sum / points.length;
}
