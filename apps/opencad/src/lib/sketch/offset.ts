export interface Point2 {
  x: number;
  y: number;
}

export interface OffsetOptions {
  /** If true, first and last point are stitched and every vertex is treated as interior. Default: false. */
  closed?: boolean;
  /** Miter length clamp as a multiple of |distance|. Default: 4. */
  miterLimit?: number;
}

interface Vec2 {
  x: number;
  y: number;
}

function sub(a: Point2, b: Point2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/**
 * Left-hand unit normal of the direction vector going from a -> b.
 * For a segment travelling in +x (right), the left normal is +y (up).
 */
function leftNormal(a: Point2, b: Point2): Vec2 {
  const dir = normalize(sub(b, a));
  return { x: -dir.y, y: dir.x };
}

/**
 * Signed area of a closed polygon (shoelace). Positive = CCW in a y-up
 * coordinate system, negative = CW.
 */
function signedArea(points: readonly Point2[]): number {
  let sum = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum * 0.5;
}

/**
 * Offset a 2D polyline by `distance`.
 *
 *  - For OPEN paths: positive distance is to the LEFT of the direction of
 *    travel (y-up convention), negative distance is to the right.
 *  - For CLOSED paths: positive distance expands the polygon outward,
 *    negative distance shrinks it inward — regardless of winding order.
 *    The algorithm detects winding via signed area and flips the internal
 *    sign when the loop is CCW so "outward" is always the same visual side.
 *
 * Pure JS, no dependencies. Algorithm:
 *  - For each segment, compute its unit left-normal.
 *  - At each interior vertex, the miter is (n_i + n_{i+1}) / (1 + n_i . n_{i+1})
 *    scaled by `distance`. Clamp miter vector length to miterLimit * |distance|.
 *  - End vertices on an OPEN path use the adjacent segment's own normal.
 *  - CLOSED paths treat every vertex as interior (wrap-around).
 */
export function offsetPolyline(
  points: readonly Point2[],
  distance: number,
  options?: OffsetOptions,
): Point2[] {
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error("offsetPolyline: need at least 2 points");
  }

  const closed = options?.closed ?? false;
  const miterLimit = options?.miterLimit ?? 4;
  const absD = Math.abs(distance);
  const maxMiter = miterLimit * absD;

  const n = points.length;

  // For closed paths, normalize so positive = outward / negative = inward.
  // Our left-normal convention means on a CW loop, +left points outward; on
  // a CCW loop, +left points inward. Flip the sign on CCW loops so the
  // "outward" semantic is consistent across winding orders.
  let d = distance;
  if (closed && signedArea(points) > 0) {
    d = -distance;
  }

  // Pre-compute the left-unit-normal for each segment i -> i+1.
  // On open paths there are n-1 segments; on closed paths there are n
  // (the last one wraps from point[n-1] back to point[0]).
  const segCount = closed ? n : n - 1;
  const normals: Vec2[] = new Array(segCount);
  for (let i = 0; i < segCount; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    normals[i] = leftNormal(a, b);
  }

  const result: Point2[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const p = points[i];

    let nPrev: Vec2 | null;
    let nNext: Vec2 | null;

    if (closed) {
      // Every vertex is interior on a closed path.
      nPrev = normals[(i - 1 + segCount) % segCount];
      nNext = normals[i % segCount];
    } else if (i === 0) {
      nPrev = null;
      nNext = normals[0];
    } else if (i === n - 1) {
      nPrev = normals[segCount - 1];
      nNext = null;
    } else {
      nPrev = normals[i - 1];
      nNext = normals[i];
    }

    let offset: Vec2;

    if (nPrev && nNext) {
      // Interior vertex: miter bisector.
      const sum: Vec2 = { x: nPrev.x + nNext.x, y: nPrev.y + nNext.y };
      const dot = nPrev.x * nNext.x + nPrev.y * nNext.y;
      const denom = 1 + dot;

      if (Math.abs(denom) < 1e-12) {
        // 180-degree turn-back: fall back to the previous segment's normal.
        offset = { x: nPrev.x * d, y: nPrev.y * d };
      } else {
        const miter: Vec2 = {
          x: (sum.x / denom) * d,
          y: (sum.y / denom) * d,
        };
        const miterLen = length(miter);
        if (maxMiter > 0 && miterLen > maxMiter) {
          const s = maxMiter / miterLen;
          offset = { x: miter.x * s, y: miter.y * s };
        } else {
          offset = miter;
        }
      }
    } else if (nNext) {
      // First vertex on an open path.
      offset = { x: nNext.x * d, y: nNext.y * d };
    } else if (nPrev) {
      // Last vertex on an open path.
      offset = { x: nPrev.x * d, y: nPrev.y * d };
    } else {
      // Unreachable — points.length >= 2 is enforced above.
      offset = { x: 0, y: 0 };
    }

    result[i] = { x: p.x + offset.x, y: p.y + offset.y };
  }

  return result;
}
