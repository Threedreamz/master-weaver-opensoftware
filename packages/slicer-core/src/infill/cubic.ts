/**
 * Cubic infill pattern generator.
 *
 * Creates a 3D cube-like structure by printing lines at 0, 60, and 120 degrees
 * (like triangles) but with a Z-dependent offset that causes the pattern to
 * shift between layers, forming enclosed cubic cells. This provides excellent
 * strength in all three axes — similar to triangles but with consistent 3D structure.
 *
 * The key difference from triangles: all three angle sets are printed every layer,
 * but each set is offset based on the Z height, creating a continuously shifting
 * triangular grid that forms cubes when stacked.
 */

import type { InfillBounds, InfillPath } from "./types";

const DEG_TO_RAD = Math.PI / 180;
const ANGLES = [0, 60, 120]; // degrees

export function generateCubicInfill(
  bounds: InfillBounds,
  layerIndex: number,
  spacing: number,
  layerHeight: number,
  extrusionWidth: number,
): InfillPath[] {
  const paths: InfillPath[] = [];
  const clampedSpacing = Math.max(spacing, extrusionWidth) * 1.5;

  // Z-dependent offset creates the 3D structure
  const z = layerIndex * layerHeight;
  const zOffset = (z / clampedSpacing) % 1;

  // Generate lines at all three angles, each with Z-dependent offset
  for (const angleDeg of ANGLES) {
    const anglePaths = generateAngledLinesWithOffset(
      bounds,
      angleDeg,
      clampedSpacing,
      zOffset * clampedSpacing,
    );
    paths.push(...anglePaths);
  }

  return paths;
}

/**
 * Generate parallel lines at a given angle with a perpendicular offset.
 */
function generateAngledLinesWithOffset(
  bounds: InfillBounds,
  angleDeg: number,
  spacing: number,
  offset: number,
): InfillPath[] {
  const paths: InfillPath[] = [];

  if (angleDeg === 0) {
    let idx = 0;
    for (let y = bounds.minY + spacing + offset; y < bounds.maxY; y += spacing) {
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

  // Normal to the line direction
  const nx = -sin;
  const ny = cos;

  // Project corners onto normal
  const corners = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];
  const projections = corners.map((c) => c.x * nx + c.y * ny);
  const minProj = Math.min(...projections);
  const maxProj = Math.max(...projections);

  const diagonal = Math.sqrt(
    (bounds.maxX - bounds.minX) ** 2 + (bounds.maxY - bounds.minY) ** 2,
  );

  let idx = 0;
  for (let d = minProj + spacing + offset; d < maxProj; d += spacing) {
    const px = d * nx;
    const py = d * ny;

    const start = { x: px - cos * diagonal, y: py - sin * diagonal };
    const end = { x: px + cos * diagonal, y: py + sin * diagonal };

    const clipped = clipLineToRect(start, end, bounds);
    if (clipped) {
      if (idx % 2 === 1) {
        paths.push([clipped[1], clipped[0]]);
      } else {
        paths.push([clipped[0], clipped[1]]);
      }
      idx++;
    }
  }

  return paths;
}

/** Cohen-Sutherland line clipping to rectangle. */
function clipLineToRect(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  bounds: InfillBounds,
): [{ x: number; y: number }, { x: number; y: number }] | null {
  const INSIDE = 0, LEFT = 1, RIGHT = 2, BOTTOM = 4, TOP = 8;

  function outcode(x: number, y: number): number {
    let code = INSIDE;
    if (x < bounds.minX) code |= LEFT;
    else if (x > bounds.maxX) code |= RIGHT;
    if (y < bounds.minY) code |= BOTTOM;
    else if (y > bounds.maxY) code |= TOP;
    return code;
  }

  let x0 = p0.x, y0 = p0.y, x1 = p1.x, y1 = p1.y;
  let code0 = outcode(x0, y0);
  let code1 = outcode(x1, y1);

  for (let iter = 0; iter < 20; iter++) {
    if (!(code0 | code1)) {
      return [{ x: r2(x0), y: r2(y0) }, { x: r2(x1), y: r2(y1) }];
    }
    if (code0 & code1) return null;

    const codeOut = code0 || code1;
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
