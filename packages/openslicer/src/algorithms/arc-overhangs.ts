/**
 * Arc Overhang Optimization
 *
 * Converts linear overhang perimeter segments into arc moves (G2/G3)
 * that self-support at steep angles. By printing arcs instead of
 * straight lines over unsupported areas, the filament bridges in a
 * catenary-like shape that maintains structural integrity.
 */

export type Point2D = { x: number; y: number };

export interface ArcSegment {
  /** Arc center point */
  center: Point2D;
  /** Arc radius */
  radius: number;
  /** Start angle in radians */
  startAngle: number;
  /** End angle in radians */
  endAngle: number;
  /** True for clockwise (G2), false for counter-clockwise (G3) */
  clockwise: boolean;
}

export interface LinearSegment {
  start: Point2D;
  end: Point2D;
}

export type OverhangSegment =
  | { type: "arc"; arc: ArcSegment }
  | { type: "linear"; segment: LinearSegment };

/**
 * Fit arc segments to overhang perimeter points.
 *
 * Takes a polyline of perimeter points and identifies sections that
 * overhang (no support below), then fits circular arcs to those
 * sections for better self-support.
 *
 * @param points - Perimeter polyline points
 * @param overhangMask - Boolean per segment: true if the segment between points[i] and points[i+1] is overhanging
 * @param maxArcDeviation - Maximum allowed deviation from original path in mm (default 0.1)
 * @param minArcAngle - Minimum arc angle in degrees to justify arc fitting (default 8)
 */
export function fitArcOverhangs(
  points: Point2D[],
  overhangMask: boolean[],
  maxArcDeviation: number = 0.1,
  minArcAngle: number = 8,
): OverhangSegment[] {
  const result: OverhangSegment[] = [];
  let i = 0;

  while (i < points.length - 1) {
    if (!overhangMask[i]) {
      // Non-overhang: emit as linear segment
      result.push({
        type: "linear",
        segment: { start: points[i], end: points[i + 1] },
      });
      i++;
      continue;
    }

    // Collect consecutive overhang points
    const overhangStart = i;
    while (i < points.length - 1 && overhangMask[i]) {
      i++;
    }
    const overhangPoints = points.slice(overhangStart, i + 1);

    // Try to fit arcs to this overhang run
    const arcs = fitArcsToPoints(overhangPoints, maxArcDeviation, minArcAngle);
    result.push(...arcs);
  }

  return result;
}

/**
 * Fit circular arcs to a sequence of points using iterative endpoint fitting.
 *
 * Algorithm:
 * 1. Start with all points as a candidate arc
 * 2. Find the best-fit circle through the endpoints and a midpoint
 * 3. If max deviation exceeds threshold, split and recurse
 * 4. If arc angle is too small, fall back to linear segments
 */
function fitArcsToPoints(
  points: Point2D[],
  maxDeviation: number,
  minAngleDeg: number,
): OverhangSegment[] {
  if (points.length < 3) {
    // Not enough points for an arc, emit linear segments
    const result: OverhangSegment[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      result.push({
        type: "linear",
        segment: { start: points[i], end: points[i + 1] },
      });
    }
    return result;
  }

  // Fit circle through three well-spaced points.
  // For closed contours (first ≈ last), using both endpoints gives two
  // identical points which makes the circle-fit degenerate.  Instead
  // pick three evenly-spaced interior points.
  const first = points[0];
  const last = points[points.length - 1];
  const closedThresholdFit = points.length > 4
    ? distance(first, last) < distance(first, points[Math.floor(points.length / 2)]) * 0.02
    : false;

  let fitP1: Point2D, fitP2: Point2D, fitP3: Point2D;
  if (closedThresholdFit) {
    // Closed contour: pick 3 evenly-spaced points (skip the duplicate last)
    const n = points.length - 1; // effective unique count
    fitP1 = points[0];
    fitP2 = points[Math.floor(n / 3)];
    fitP3 = points[Math.floor((2 * n) / 3)];
  } else {
    fitP1 = first;
    fitP2 = points[Math.floor(points.length / 2)];
    fitP3 = last;
  }

  const circle = fitCircleThreePoints(fitP1, fitP2, fitP3);
  if (!circle) {
    // Collinear points — use linear segments
    return linearFallback(points);
  }

  // Check deviation of all points from the fitted circle
  let worstDeviation = 0;
  let worstIndex = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = Math.abs(distance(points[i], circle.center) - circle.radius);
    if (dist > worstDeviation) {
      worstDeviation = dist;
      worstIndex = i;
    }
  }

  if (worstDeviation > maxDeviation) {
    // Split at worst point and recurse
    const left = fitArcsToPoints(points.slice(0, worstIndex + 1), maxDeviation, minAngleDeg);
    const right = fitArcsToPoints(points.slice(worstIndex), maxDeviation, minAngleDeg);
    return [...left, ...right];
  }

  // Determine direction (clockwise vs counter-clockwise) using cross product
  const mid = points[Math.floor(points.length / 2)];
  const cross = (mid.x - first.x) * (last.y - first.y) - (mid.y - first.y) * (last.x - first.x);
  const clockwise = cross < 0;

  // Calculate arc angle, handling closed contours where first ≈ last
  const startAngle = Math.atan2(first.y - circle.center.y, first.x - circle.center.x);
  const endAngle = Math.atan2(last.y - circle.center.y, last.x - circle.center.x);
  const midAngle = Math.atan2(mid.y - circle.center.y, mid.x - circle.center.x);

  let arcAngle: number;
  const closedThreshold = circle.radius * 0.01; // 1% of radius
  const isClosed = distance(first, last) < closedThreshold;

  if (isClosed) {
    // Closed contour: the arc sweeps the full circle through the midpoint.
    // Compute the angle from start to mid, doubled, as an approximation
    // of the full sweep. For a truly closed loop this approaches 2π.
    let halfSweep = midAngle - startAngle;
    if (clockwise) {
      if (halfSweep > 0) halfSweep -= 2 * Math.PI;
    } else {
      if (halfSweep < 0) halfSweep += 2 * Math.PI;
    }
    arcAngle = Math.abs(halfSweep) * 2;
    if (arcAngle > 2 * Math.PI) arcAngle = 2 * Math.PI;
  } else {
    // Open arc: compute the signed sweep through the midpoint
    let sweep = endAngle - startAngle;
    // Ensure sweep goes through the midpoint direction
    let startToMid = midAngle - startAngle;
    if (clockwise) {
      if (sweep > 0) sweep -= 2 * Math.PI;
      if (startToMid > 0) startToMid -= 2 * Math.PI;
    } else {
      if (sweep < 0) sweep += 2 * Math.PI;
      if (startToMid < 0) startToMid += 2 * Math.PI;
    }
    arcAngle = Math.abs(sweep);
  }

  if (arcAngle < (minAngleDeg * Math.PI) / 180) {
    return linearFallback(points);
  }

  return [
    {
      type: "arc",
      arc: {
        center: circle.center,
        radius: circle.radius,
        startAngle,
        endAngle,
        clockwise,
      },
    },
  ];
}

/**
 * Fit a circle through three points.
 * Returns null if points are collinear.
 */
function fitCircleThreePoints(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
): { center: Point2D; radius: number } | null {
  const ax = p1.x, ay = p1.y;
  const bx = p2.x, by = p2.y;
  const cx = p3.x, cy = p3.y;

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-10) return null;

  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;

  const center = { x: ux, y: uy };
  const radius = distance(p1, center);

  return { center, radius };
}

function distance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function linearFallback(points: Point2D[]): OverhangSegment[] {
  const result: OverhangSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    result.push({
      type: "linear",
      segment: { start: points[i], end: points[i + 1] },
    });
  }
  return result;
}
