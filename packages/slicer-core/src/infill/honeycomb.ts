/**
 * Honeycomb infill pattern generator.
 *
 * Generates hexagonal cell outlines within bounds. Honeycomb is one of the
 * strongest infill patterns for its weight, providing excellent resistance
 * to compression forces from all horizontal directions.
 *
 * Cell size is derived from infill density: lower density = larger hexagons.
 */

import type { InfillBounds, InfillPath } from "./types";

const SQRT3 = Math.sqrt(3);

export function generateHoneycombInfill(
  bounds: InfillBounds,
  layerIndex: number,
  spacing: number,
  extrusionWidth: number,
): InfillPath[] {
  const paths: InfillPath[] = [];

  // Cell radius (center to vertex) derived from spacing
  // spacing is the infill line spacing; map it to hex cell size
  const cellRadius = Math.max(spacing * 0.8, extrusionWidth * 2);
  const cellWidth = cellRadius * 2;       // width of a hex (flat-to-flat)
  const cellHeight = SQRT3 * cellRadius;  // height of a hex

  // Horizontal and vertical spacing between hex centers
  const colSpacing = cellWidth * 0.75;    // 3/4 of width for interlocking columns
  const rowSpacing = cellHeight;

  // Slight offset every other layer for 3D interlocking
  const layerOffsetX = (layerIndex % 2) * colSpacing * 0.5;
  const layerOffsetY = (layerIndex % 2) * rowSpacing * 0.5;

  // Generate hex cells in a grid
  for (
    let col = bounds.minX - cellWidth + layerOffsetX;
    col < bounds.maxX + cellWidth;
    col += colSpacing
  ) {
    const colIdx = Math.round((col - bounds.minX) / colSpacing);
    const rowOffset = (colIdx % 2) * (rowSpacing / 2);

    for (
      let row = bounds.minY - cellHeight + rowOffset + layerOffsetY;
      row < bounds.maxY + cellHeight;
      row += rowSpacing
    ) {
      const hexPath = generateHexagonPath(col, row, cellRadius, bounds);
      if (hexPath.length >= 2) {
        paths.push(hexPath);
      }
    }
  }

  return paths;
}

/**
 * Generate a hexagon outline centered at (cx, cy) with the given radius.
 * Points outside bounds are clipped — only segments inside are returned.
 */
function generateHexagonPath(
  cx: number,
  cy: number,
  radius: number,
  bounds: InfillBounds,
): InfillPath {
  const points: { x: number; y: number }[] = [];

  // Generate 6 vertices of a regular hexagon (flat-top orientation)
  for (let i = 0; i <= 6; i++) {
    const angleDeg = 60 * (i % 6); // 0, 60, 120, 180, 240, 300
    const angleRad = (Math.PI / 180) * angleDeg;
    const x = cx + radius * Math.cos(angleRad);
    const y = cy + radius * Math.sin(angleRad);
    points.push({ x: r2(x), y: r2(y) });
  }

  // Clip to bounds: keep only points that are inside, and clamp those on edges
  const clipped: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    // Simple segment clipping: if both points are reasonably inside bounds, keep them
    if (isInsideBounds(p0, bounds) || isInsideBounds(p1, bounds)) {
      if (clipped.length === 0 || !ptsEqual(clipped[clipped.length - 1], p0)) {
        clipped.push(clampToBounds(p0, bounds));
      }
      clipped.push(clampToBounds(p1, bounds));
    }
  }

  return clipped;
}

function isInsideBounds(p: { x: number; y: number }, b: InfillBounds): boolean {
  return p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;
}

function clampToBounds(p: { x: number; y: number }, b: InfillBounds): { x: number; y: number } {
  return {
    x: r2(Math.max(b.minX, Math.min(b.maxX, p.x))),
    y: r2(Math.max(b.minY, Math.min(b.maxY, p.y))),
  };
}

function ptsEqual(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return a.x === b.x && a.y === b.y;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
