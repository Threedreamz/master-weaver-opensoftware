/**
 * Triangular infill pattern generator.
 *
 * Generates lines at 0, 60, and 120 degrees, cycling through angles each layer.
 * The three-way pattern creates triangular cells that provide good strength
 * in all directions with reasonable material usage.
 */

import type { InfillBounds, InfillPath } from "./types";

const DEG_TO_RAD = Math.PI / 180;
const ANGLES = [0, 60, 120]; // degrees

export function generateTrianglesInfill(
  bounds: InfillBounds,
  layerIndex: number,
  spacing: number,
  extrusionWidth: number,
): InfillPath[] {
  const clampedSpacing = Math.max(spacing, extrusionWidth);
  // Each layer uses one of the three angles
  const angleDeg = ANGLES[layerIndex % 3];

  return generateAngledLines(bounds, angleDeg, clampedSpacing);
}

/**
 * Generate parallel lines at a given angle within rectangular bounds.
 * Lines are clipped to the bounding rectangle.
 */
function generateAngledLines(
  bounds: InfillBounds,
  angleDeg: number,
  spacing: number,
): InfillPath[] {
  const paths: InfillPath[] = [];

  if (angleDeg === 0) {
    // Horizontal lines (parallel to X)
    let idx = 0;
    for (let y = bounds.minY + spacing; y < bounds.maxY; y += spacing) {
      const goRight = idx % 2 === 0;
      paths.push([
        { x: goRight ? bounds.minX : bounds.maxX, y: r2(y) },
        { x: goRight ? bounds.maxX : bounds.minX, y: r2(y) },
      ]);
      idx++;
    }
    return paths;
  }

  const angleRad = angleDeg * DEG_TO_RAD;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Direction vector along the line
  const dx = cos;
  const dy = sin;
  // Normal vector (perpendicular to the line direction)
  const nx = -sin;
  const ny = cos;

  // Project all four corners onto the normal to find the range of offsets
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];
  const projections = corners.map((c) => c.x * nx + c.y * ny);
  const minProj = Math.min(...projections);
  const maxProj = Math.max(...projections);

  // For each offset along the normal, generate a line and clip to bounds
  let idx = 0;
  for (let d = minProj + spacing; d < maxProj; d += spacing) {
    // Find a point on the line: p = d * normal_unit (since normal is unit)
    const px = d * nx;
    const py = d * ny;

    // Extend the line far enough to cover the bounds
    const diagonal = Math.sqrt(
      (bounds.maxX - bounds.minX) ** 2 + (bounds.maxY - bounds.minY) ** 2,
    );
    const start = { x: px - dx * diagonal, y: py - dy * diagonal };
    const end = { x: px + dx * diagonal, y: py + dy * diagonal };

    // Clip to bounding rectangle
    const clipped = clipLineToRect(start, end, bounds);
    if (clipped) {
      if (idx % 2 === 1) {
        // Reverse alternating lines for continuous printing
        paths.push([clipped[1], clipped[0]]);
      } else {
        paths.push([clipped[0], clipped[1]]);
      }
      idx++;
    }
  }

  return paths;
}

/** Clip a line segment to a rectangle using Cohen-Sutherland algorithm. */
function clipLineToRect(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  bounds: InfillBounds,
): [{ x: number; y: number }, { x: number; y: number }] | null {
  const INSIDE = 0;
  const LEFT = 1;
  const RIGHT = 2;
  const BOTTOM = 4;
  const TOP = 8;

  function outcode(x: number, y: number): number {
    let code = INSIDE;
    if (x < bounds.minX) code |= LEFT;
    else if (x > bounds.maxX) code |= RIGHT;
    if (y < bounds.minY) code |= BOTTOM;
    else if (y > bounds.maxY) code |= TOP;
    return code;
  }

  let x0 = p0.x, y0 = p0.y;
  let x1 = p1.x, y1 = p1.y;
  let code0 = outcode(x0, y0);
  let code1 = outcode(x1, y1);

  for (let iter = 0; iter < 20; iter++) {
    if (!(code0 | code1)) {
      // Both inside
      return [{ x: r2(x0), y: r2(y0) }, { x: r2(x1), y: r2(y1) }];
    }
    if (code0 & code1) {
      // Both outside same side
      return null;
    }

    const codeOut = code0 ? code0 : code1;
    let x = 0, y = 0;

    if (codeOut & TOP) {
      x = x0 + (x1 - x0) * (bounds.maxY - y0) / (y1 - y0);
      y = bounds.maxY;
    } else if (codeOut & BOTTOM) {
      x = x0 + (x1 - x0) * (bounds.minY - y0) / (y1 - y0);
      y = bounds.minY;
    } else if (codeOut & RIGHT) {
      y = y0 + (y1 - y0) * (bounds.maxX - x0) / (x1 - x0);
      x = bounds.maxX;
    } else if (codeOut & LEFT) {
      y = y0 + (y1 - y0) * (bounds.minX - x0) / (x1 - x0);
      x = bounds.minX;
    }

    if (codeOut === code0) {
      x0 = x; y0 = y;
      code0 = outcode(x0, y0);
    } else {
      x1 = x; y1 = y;
      code1 = outcode(x1, y1);
    }
  }

  return null;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
