/**
 * 2D corner fillet: replace a line-line corner with a tangent arc of given radius.
 *
 * Given two line segments sharing a corner (lineA ends at corner, lineB starts at
 * corner), returns the two shortened lines and the tangent arc that joins them.
 *
 * Math:
 *   Let u = unit vector from corner back along lineA (toward lineA.p0)
 *   Let v = unit vector from corner along lineB (toward lineB.p1)
 *   halfAngle = angle between u and v, halved
 *   tangentLen = radius / tan(halfAngle)
 *   centerDist = radius / sin(halfAngle)
 *   bisector   = normalize(u + v)
 *   center     = corner + bisector * centerDist
 *   tangentA   = corner + u * tangentLen   (new endpoint of lineA)
 *   tangentB   = corner + v * tangentLen   (new startpoint of lineB)
 */

export interface Point2 {
  x: number;
  y: number;
}

export interface Arc2 {
  center: Point2;
  radius: number;
  startAngleDeg: number;
  endAngleDeg: number;
}

export interface FilletResult {
  lineA: { p0: Point2; p1: Point2 };
  arc: Arc2;
  lineB: { p0: Point2; p1: Point2 };
}

const EPS = 1e-6;

function sub(a: Point2, b: Point2): Point2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Point2, b: Point2): Point2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(a: Point2, s: number): Point2 {
  return { x: a.x * s, y: a.y * s };
}

function length(a: Point2): number {
  return Math.hypot(a.x, a.y);
}

function normalize(a: Point2): Point2 {
  const L = length(a);
  if (L < EPS) throw new Error("cannot normalize zero-length vector");
  return { x: a.x / L, y: a.y / L };
}

function pointsEqual(a: Point2, b: Point2, tol = EPS): boolean {
  return Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function filletCorner(
  lineA: { p0: Point2; p1: Point2 },
  lineB: { p0: Point2; p1: Point2 },
  radius: number,
): FilletResult {
  if (!(radius > 0)) {
    throw new Error("radius must be > 0");
  }
  if (!pointsEqual(lineA.p1, lineB.p0, 1e-6)) {
    throw new Error("lines do not share an endpoint at the corner");
  }

  const corner = lineA.p1;

  // u: unit vector from corner back along lineA (toward lineA.p0)
  // v: unit vector from corner along lineB (toward lineB.p1)
  const uRaw = sub(lineA.p0, corner);
  const vRaw = sub(lineB.p1, corner);

  const uLen = length(uRaw);
  const vLen = length(vRaw);

  if (uLen < EPS || vLen < EPS) {
    throw new Error("zero-length input line");
  }

  const u = scale(uRaw, 1 / uLen);
  const v = scale(vRaw, 1 / vLen);

  // Angle between u and v (the interior angle at the corner, between the two
  // segments as viewed going out from the corner along each).
  const dot = u.x * v.x + u.y * v.y;
  const clamped = Math.max(-1, Math.min(1, dot));
  const fullAngle = Math.acos(clamped);

  if (fullAngle < EPS) {
    throw new Error("lines are colinear — cannot fillet");
  }
  if (Math.abs(fullAngle - Math.PI) < EPS) {
    throw new Error("lines are anti-parallel — cannot fillet");
  }

  const halfAngle = fullAngle / 2;
  const tangentLen = radius / Math.tan(halfAngle);
  const centerDist = radius / Math.sin(halfAngle);

  if (tangentLen > uLen + EPS || tangentLen > vLen + EPS) {
    throw new Error("radius too large for corner");
  }

  // Bisector points INTO the angle (between u and v, on the concave side)
  const bisectorRaw = add(u, v);
  if (length(bisectorRaw) < EPS) {
    throw new Error("lines are anti-parallel — cannot fillet");
  }
  const bisector = normalize(bisectorRaw);

  const center = add(corner, scale(bisector, centerDist));
  const tangentA = add(corner, scale(u, tangentLen));
  const tangentB = add(corner, scale(v, tangentLen));

  // Arc angles: from center to each tangent point
  const aVec = sub(tangentA, center);
  const bVec = sub(tangentB, center);
  const startAngleRad = Math.atan2(aVec.y, aVec.x);
  const endAngleRad = Math.atan2(bVec.y, bVec.x);

  const arc: Arc2 = {
    center,
    radius,
    startAngleDeg: toDeg(startAngleRad),
    endAngleDeg: toDeg(endAngleRad),
  };

  return {
    lineA: { p0: lineA.p0, p1: tangentA },
    arc,
    lineB: { p0: tangentB, p1: lineB.p1 },
  };
}
