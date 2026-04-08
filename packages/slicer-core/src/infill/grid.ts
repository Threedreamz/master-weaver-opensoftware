/**
 * Grid infill pattern generator.
 *
 * Generates perpendicular lines (both 0 and 90 degrees) on every layer,
 * creating a cross-hatched grid. Provides excellent strength in all
 * horizontal directions at the cost of slightly more material than rectilinear.
 */

import type { InfillBounds, InfillPath } from "./types";

export function generateGridInfill(
  bounds: InfillBounds,
  layerIndex: number,
  spacing: number,
  extrusionWidth: number,
): InfillPath[] {
  const paths: InfillPath[] = [];
  const clampedSpacing = Math.max(spacing, extrusionWidth);
  // Grid uses wider spacing per direction since both are printed each layer
  const gridSpacing = clampedSpacing * 2;

  // Lines parallel to X axis
  let lineIdx = 0;
  for (let y = bounds.minY + gridSpacing; y < bounds.maxY; y += gridSpacing) {
    const goRight = lineIdx % 2 === 0;
    const startX = goRight ? bounds.minX : bounds.maxX;
    const endX = goRight ? bounds.maxX : bounds.minX;
    paths.push([
      { x: startX, y: r2(y) },
      { x: endX, y: r2(y) },
    ]);
    lineIdx++;
  }

  // Lines parallel to Y axis
  lineIdx = 0;
  for (let x = bounds.minX + gridSpacing; x < bounds.maxX; x += gridSpacing) {
    const goUp = lineIdx % 2 === 0;
    const startY = goUp ? bounds.minY : bounds.maxY;
    const endY = goUp ? bounds.maxY : bounds.minY;
    paths.push([
      { x: r2(x), y: startY },
      { x: r2(x), y: endY },
    ]);
    lineIdx++;
  }

  return paths;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
