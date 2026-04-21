/**
 * opencad — sketch/polygon.ts
 *
 * Regular n-gon primitive generator for the 2D sketch layer.
 *
 * Emits a bundle of sketch entities + constraints compatible with
 * `../sketch-constraints.ts` and the `SketchSolveBody` contract in
 * `../api-contracts.ts` (point/line entities, distance/equal constraints).
 *
 * Geometry:
 *   - inscribed    — vertices sit ON the reference circle (corner-radius = r)
 *   - circumscribed — edges are TANGENT to the reference circle
 *                     (corner-radius = r / cos(π/N), apothem = r)
 *
 * Constraints emitted:
 *   - N distance(center, corner_i) = effectiveRadius
 *   - (N-1) equal(edge_i, edge_{i+1}) — propagates equal-length across the loop
 *
 * Zero dependencies, deterministic, pure — Vitest-friendly.
 */

export interface Point2 {
  x: number;
  y: number;
}

export interface PolygonResult {
  entities: { id: string; kind: string; [k: string]: unknown }[];
  constraints: { id: string; kind: string; [k: string]: unknown }[];
}

export type PolygonMode = "inscribed" | "circumscribed";

export interface PolygonOptions {
  idPrefix?: string;
  rotationDeg?: number;
}

/**
 * Create a regular n-gon as a bundle of sketch entities + constraints.
 *
 * @param sides    number of edges (≥ 3)
 * @param center   center point of the polygon
 * @param radius   reference radius (vertex radius if inscribed, apothem if circumscribed)
 * @param mode     "inscribed" (default) — vertices on the reference circle.
 *                 "circumscribed" — edges tangent to the reference circle.
 * @param options  { idPrefix?: string; rotationDeg?: number }
 * @returns        { entities, constraints }
 */
export function createRegularPolygon(
  sides: number,
  center: Point2,
  radius: number,
  mode: PolygonMode = "inscribed",
  options: PolygonOptions = {},
): PolygonResult {
  if (!Number.isFinite(sides) || sides < 3) {
    throw new Error(`createRegularPolygon: sides must be an integer ≥ 3 (got ${sides})`);
  }
  if (!Number.isInteger(sides)) {
    throw new Error(`createRegularPolygon: sides must be an integer (got ${sides})`);
  }
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error(`createRegularPolygon: radius must be > 0 (got ${radius})`);
  }
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) {
    throw new Error("createRegularPolygon: center must have finite x/y");
  }

  const prefix = options.idPrefix ?? "poly";
  const rotationRad = ((options.rotationDeg ?? 0) * Math.PI) / 180;

  // Effective corner-radius — inscribed uses r, circumscribed uses r/cos(π/N).
  const effectiveRadius =
    mode === "circumscribed" ? radius / Math.cos(Math.PI / sides) : radius;

  const entities: { id: string; kind: string; [k: string]: unknown }[] = [];
  const constraints: { id: string; kind: string; [k: string]: unknown }[] = [];

  // 1. Center point — marked fixed so the solver anchors the polygon.
  const centerId = `${prefix}-center`;
  entities.push({
    id: centerId,
    kind: "point",
    x: center.x,
    y: center.y,
    fixed: true,
  });

  // 2. N corner points, distributed evenly around the center.
  const cornerIds: string[] = [];
  for (let i = 0; i < sides; i++) {
    const theta = rotationRad + (2 * Math.PI * i) / sides;
    const cornerId = `${prefix}-corner-${i}`;
    cornerIds.push(cornerId);
    entities.push({
      id: cornerId,
      kind: "point",
      x: center.x + effectiveRadius * Math.cos(theta),
      y: center.y + effectiveRadius * Math.sin(theta),
      fixed: false,
    });
  }

  // 3. N edges — line from corner_i to corner_{(i+1) mod N}.
  const edgeIds: string[] = [];
  for (let i = 0; i < sides; i++) {
    const edgeId = `${prefix}-edge-${i}`;
    edgeIds.push(edgeId);
    entities.push({
      id: edgeId,
      kind: "line",
      p0: cornerIds[i],
      p1: cornerIds[(i + 1) % sides],
    });
  }

  // 4. N distance constraints: center → corner_i == effectiveRadius.
  for (let i = 0; i < sides; i++) {
    constraints.push({
      id: `${prefix}-radius-${i}`,
      kind: "distance",
      a: centerId,
      b: cornerIds[i],
      value: effectiveRadius,
    });
  }

  // 5. (N-1) equal-length constraints between adjacent edges — propagates around the loop.
  for (let i = 0; i < sides - 1; i++) {
    constraints.push({
      id: `${prefix}-equal-${i}`,
      kind: "equal",
      a: edgeIds[i],
      b: edgeIds[i + 1],
    });
  }

  return { entities, constraints };
}
