/**
 * Shared types for infill pattern generators.
 */

/** Rectangular bounds for infill generation (in mm). */
export interface InfillBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** A single infill path — an ordered list of XY points forming a polyline. */
export type InfillPath = { x: number; y: number }[];

/** Supported infill pattern types. */
export type InfillPattern =
  | "rectilinear"
  | "grid"
  | "triangles"
  | "honeycomb"
  | "gyroid"
  | "cubic"
  | "lightning";
