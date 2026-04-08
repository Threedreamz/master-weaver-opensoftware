/**
 * Rectilinear infill pattern generator.
 *
 * Generates parallel lines alternating between 0 and 90 degrees each layer.
 * This is the simplest and most widely-used infill pattern.
 */

import type { InfillBounds, InfillPath } from "./types";

export function generateRectilinearInfill(
  bounds: InfillBounds,
  layerIndex: number,
  spacing: number,
  extrusionWidth: number,
): InfillPath[] {
  const paths: InfillPath[] = [];
  const clampedSpacing = Math.max(spacing, extrusionWidth);

  if (layerIndex % 2 === 0) {
    // Lines parallel to X axis
    let lineIdx = 0;
    for (let y = bounds.minY + clampedSpacing; y < bounds.maxY; y += clampedSpacing) {
      const goRight = lineIdx % 2 === 0;
      const startX = goRight ? bounds.minX : bounds.maxX;
      const endX = goRight ? bounds.maxX : bounds.minX;
      paths.push([
        { x: startX, y: r2(y) },
        { x: endX, y: r2(y) },
      ]);
      lineIdx++;
    }
  } else {
    // Lines parallel to Y axis
    let lineIdx = 0;
    for (let x = bounds.minX + clampedSpacing; x < bounds.maxX; x += clampedSpacing) {
      const goUp = lineIdx % 2 === 0;
      const startY = goUp ? bounds.minY : bounds.maxY;
      const endY = goUp ? bounds.maxY : bounds.minY;
      paths.push([
        { x: r2(x), y: startY },
        { x: r2(x), y: endY },
      ]);
      lineIdx++;
    }
  }

  return paths;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
