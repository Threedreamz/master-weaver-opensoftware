/**
 * Infill pattern generator dispatcher.
 *
 * Provides a unified interface for generating infill toolpaths for any
 * supported pattern type. Each pattern generator takes the same bounding
 * parameters and returns an array of polyline paths.
 */

export type { InfillBounds, InfillPath, InfillPattern } from "./types";

export { generateRectilinearInfill } from "./rectilinear";
export { generateGridInfill } from "./grid";
export { generateTrianglesInfill } from "./triangles";
export { generateHoneycombInfill } from "./honeycomb";
export { generateGyroidInfill } from "./gyroid";
export { generateCubicInfill } from "./cubic";

import type { InfillBounds, InfillPath, InfillPattern } from "./types";
import { generateRectilinearInfill } from "./rectilinear";
import { generateGridInfill } from "./grid";
import { generateTrianglesInfill } from "./triangles";
import { generateHoneycombInfill } from "./honeycomb";
import { generateGyroidInfill } from "./gyroid";
import { generateCubicInfill } from "./cubic";

/**
 * Generate infill paths for a given pattern, bounds, and layer parameters.
 *
 * @param pattern - The infill pattern type
 * @param bounds - Rectangular XY bounds for the infill region
 * @param layerIndex - Current layer number (0-based)
 * @param layerHeight - Layer height in mm
 * @param density - Infill density 0-100 (percentage)
 * @param extrusionWidth - Nozzle/extrusion width in mm
 * @returns Array of polyline paths, each being an ordered list of XY points
 */
export function generateInfill(
  pattern: InfillPattern,
  bounds: InfillBounds,
  layerIndex: number,
  layerHeight: number,
  density: number,
  extrusionWidth: number,
): InfillPath[] {
  if (density <= 0) return [];

  // Convert density percentage to line spacing in mm
  // Higher density = smaller spacing
  const spacing = extrusionWidth / (density / 100);

  switch (pattern) {
    case "rectilinear":
      return generateRectilinearInfill(bounds, layerIndex, spacing, extrusionWidth);

    case "grid":
      return generateGridInfill(bounds, layerIndex, spacing, extrusionWidth);

    case "triangles":
      return generateTrianglesInfill(bounds, layerIndex, spacing, extrusionWidth);

    case "honeycomb":
      return generateHoneycombInfill(bounds, layerIndex, spacing, extrusionWidth);

    case "gyroid":
      return generateGyroidInfill(bounds, layerIndex, spacing, layerHeight, extrusionWidth);

    case "cubic":
      return generateCubicInfill(bounds, layerIndex, spacing, layerHeight, extrusionWidth);

    case "lightning":
      // Lightning infill is highly complex (tree-based, material-minimal).
      // Fall back to rectilinear as a placeholder — a full implementation
      // would require a separate tree-growth algorithm.
      return generateRectilinearInfill(bounds, layerIndex, spacing, extrusionWidth);

    default: {
      // Exhaustive check
      const _exhaustive: never = pattern;
      return generateRectilinearInfill(bounds, layerIndex, spacing, extrusionWidth);
    }
  }
}
