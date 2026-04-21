/**
 * opencad — sketch/rectangle.ts
 *
 * Generator for a 2-point (diagonally-opposite corners) rectangle primitive.
 * Produces sketch entities + constraints ready to append to a sketch's
 * entities/constraints arrays (matches the shapes defined in api-contracts.ts
 * → SketchEntity / SketchConstraint — point, line, horizontal, vertical).
 *
 * Pure, deterministic, zero dependencies. Output corner order is normalised:
 *   p0 = bottom-left, p1 = bottom-right, p2 = top-right, p3 = top-left.
 * Sides are emitted in the same order (bottom, right, top, left), with the
 * bottom + top receiving `horizontal` constraints and the right + left
 * receiving `vertical` constraints.
 */

export interface Point2 {
  x: number;
  y: number;
}

export interface SketchEntityLike {
  id: string;
  kind: string;
  [k: string]: unknown;
}

export interface SketchConstraintLike {
  id: string;
  kind: string;
  [k: string]: unknown;
}

export interface RectangleResult {
  /** 4 point entities (corners) + 4 line entities (sides). */
  entities: SketchEntityLike[];
  /** 2 horizontal (top/bottom) + 2 vertical (left/right) constraints. */
  constraints: SketchConstraintLike[];
}

export interface CreateRectangleOptions {
  /** ID prefix for generated entities/constraints. Default "rect-". */
  idPrefix?: string;
}

/**
 * Build a rectangle from two diagonally-opposite corners.
 *
 * Corner order is normalised so that regardless of which diagonal the caller
 * supplies, the output always lists the bottom-left corner first, then goes
 * counter-clockwise: bottom-left → bottom-right → top-right → top-left.
 */
export function createRectangle(
  corner1: Point2,
  corner2: Point2,
  options: CreateRectangleOptions = {},
): RectangleResult {
  const prefix = options.idPrefix ?? "rect-";

  // Normalise to axis-aligned bounding box so corner order is deterministic.
  const minX = Math.min(corner1.x, corner2.x);
  const maxX = Math.max(corner1.x, corner2.x);
  const minY = Math.min(corner1.y, corner2.y);
  const maxY = Math.max(corner1.y, corner2.y);

  // Corners in counter-clockwise order starting at bottom-left.
  const p0Id = `${prefix}p0`; // bottom-left
  const p1Id = `${prefix}p1`; // bottom-right
  const p2Id = `${prefix}p2`; // top-right
  const p3Id = `${prefix}p3`; // top-left

  const points: SketchEntityLike[] = [
    { id: p0Id, kind: "point", x: minX, y: minY, fixed: false },
    { id: p1Id, kind: "point", x: maxX, y: minY, fixed: false },
    { id: p2Id, kind: "point", x: maxX, y: maxY, fixed: false },
    { id: p3Id, kind: "point", x: minX, y: maxY, fixed: false },
  ];

  // Sides: bottom, right, top, left.
  const lBottomId = `${prefix}l0`; // bottom: p0 → p1 (horizontal)
  const lRightId = `${prefix}l1`; //  right:  p1 → p2 (vertical)
  const lTopId = `${prefix}l2`; //    top:    p2 → p3 (horizontal)
  const lLeftId = `${prefix}l3`; //   left:   p3 → p0 (vertical)

  const lines: SketchEntityLike[] = [
    { id: lBottomId, kind: "line", p0: p0Id, p1: p1Id },
    { id: lRightId, kind: "line", p0: p1Id, p1: p2Id },
    { id: lTopId, kind: "line", p0: p2Id, p1: p3Id },
    { id: lLeftId, kind: "line", p0: p3Id, p1: p0Id },
  ];

  const constraints: SketchConstraintLike[] = [
    { id: `${prefix}c0`, kind: "horizontal", entity: lBottomId },
    { id: `${prefix}c1`, kind: "horizontal", entity: lTopId },
    { id: `${prefix}c2`, kind: "vertical", entity: lRightId },
    { id: `${prefix}c3`, kind: "vertical", entity: lLeftId },
  ];

  return {
    entities: [...points, ...lines],
    constraints,
  };
}
