/**
 * opencad — sketch/slot.ts
 *
 * Straight slot primitive: 2 parallel lines + 2 semicircular end-cap arcs.
 *
 * Geometry (y-up, CCW positive):
 *   axis      = end - start
 *   perp      = rotate(axis_unit, +90°) = (-uy, ux)
 *   r         = width / 2
 *   topStart  = start + r·perp   (arc_A ↔ line_top junction)
 *   topEnd    = end   + r·perp   (arc_B ↔ line_top junction)
 *   botStart  = start - r·perp   (arc_A ↔ line_bot junction)
 *   botEnd    = end   - r·perp   (arc_B ↔ line_bot junction)
 *
 *   arc_A     center = start, radius = r, sweeps +π over the side away from end
 *             (from topStart through -axis side to botStart).
 *   arc_B     center = end,   radius = r, sweeps +π over the side away from start
 *             (from botEnd  through +axis side to topEnd).
 *
 * Boundary (CCW):
 *   botStart → botEnd → arc_B(samples) → topEnd(implicit=last arc pt)
 *            → topStart → arc_A(samples) → closing botStart
 *
 * Total boundary points with `arcSamples` samples per arc:
 *   2 (botStart, botEnd) + arcSamples (arc_B, incl. topEnd)
 *   + 1 (topStart) + arcSamples (arc_A, incl. botStart-closing)
 *   = 2·arcSamples + 3, plus an explicit closing botStart
 *   = 2·arcSamples + 4.
 *
 * Zero external deps. Pure function. Deterministic.
 */

export interface Point2 {
  x: number;
  y: number;
}

export interface SlotEntity {
  id: string;
  kind: string;
  [k: string]: unknown;
}

export interface SlotConstraint {
  id: string;
  kind: string;
  [k: string]: unknown;
}

export interface SlotResult {
  entities: SlotEntity[];
  constraints: SlotConstraint[];
  boundary: Point2[];
}

export interface SlotOptions {
  arcSamples?: number;
  idPrefix?: string;
}

/* ------------------------------------------------------------------ helpers */

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
  return Math.sqrt(a.x * a.x + a.y * a.y);
}

/* ------------------------------------------------------------------ public  */

/**
 * createSlot — straight slot sketch primitive.
 *
 * @param start   center of first end-cap arc
 * @param end     center of second end-cap arc (must differ from start)
 * @param width   slot width > 0; arc radius = width / 2
 * @param options arcSamples (default 16), idPrefix (default "slot")
 */
export function createSlot(
  start: Point2,
  end: Point2,
  width: number,
  options?: SlotOptions,
): SlotResult {
  const axis = sub(end, start);
  const axisLen = length(axis);
  if (axisLen < 1e-9) {
    throw new Error("createSlot: start and end must be distinct points");
  }
  if (!(width > 0) || !isFinite(width)) {
    throw new Error("createSlot: width must be a positive finite number");
  }

  const arcSamples = Math.max(2, Math.floor(options?.arcSamples ?? 16));
  const prefix = options?.idPrefix ?? "slot";

  const r = width / 2;

  // Unit axis + +90° CCW perpendicular.
  const ux = axis.x / axisLen;
  const uy = axis.y / axisLen;
  const perp: Point2 = { x: -uy, y: ux };
  const rPerp = scale(perp, r);

  // Four line/arc junction points.
  const topStart = add(start, rPerp);
  const topEnd = add(end, rPerp);
  const botStart = sub(start, rPerp);
  const botEnd = sub(end, rPerp);

  /* -------------------------------------------------------- entities */

  const entities: SlotEntity[] = [
    { id: `${prefix}-center-a`, kind: "point", x: start.x, y: start.y },
    { id: `${prefix}-center-b`, kind: "point", x: end.x, y: end.y },

    { id: `${prefix}-p-top-a`, kind: "point", x: topStart.x, y: topStart.y },
    { id: `${prefix}-p-top-b`, kind: "point", x: topEnd.x, y: topEnd.y },
    { id: `${prefix}-p-bot-a`, kind: "point", x: botStart.x, y: botStart.y },
    { id: `${prefix}-p-bot-b`, kind: "point", x: botEnd.x, y: botEnd.y },

    {
      id: `${prefix}-line-top`,
      kind: "line",
      p0: { x: topStart.x, y: topStart.y },
      p1: { x: topEnd.x, y: topEnd.y },
    },
    {
      id: `${prefix}-line-bot`,
      kind: "line",
      p0: { x: botStart.x, y: botStart.y },
      p1: { x: botEnd.x, y: botEnd.y },
    },

    {
      id: `${prefix}-arc-a`,
      kind: "arc",
      center: { x: start.x, y: start.y },
      radius: r,
      startPoint: { x: topStart.x, y: topStart.y },
      endPoint: { x: botStart.x, y: botStart.y },
      sweep: Math.PI,
    },
    {
      id: `${prefix}-arc-b`,
      kind: "arc",
      center: { x: end.x, y: end.y },
      radius: r,
      startPoint: { x: botEnd.x, y: botEnd.y },
      endPoint: { x: topEnd.x, y: topEnd.y },
      sweep: Math.PI,
    },
  ];

  /* ------------------------------------------------------ constraints */

  const constraints: SlotConstraint[] = [
    {
      id: `${prefix}-c-parallel`,
      kind: "parallel",
      a: `${prefix}-line-top`,
      b: `${prefix}-line-bot`,
    },
    {
      id: `${prefix}-c-equal-radius`,
      kind: "equal-radius",
      a: `${prefix}-arc-a`,
      b: `${prefix}-arc-b`,
    },
    // Tangency is approximated via coincidence of the arc endpoints with the
    // line endpoints — the solver's coincident residual drives them together
    // and the arc's sweep + radius forces the tangency geometrically.
    {
      id: `${prefix}-c-tangent-top-a`,
      kind: "coincident",
      a: `${prefix}-p-top-a`,
      b: { entity: `${prefix}-arc-a`, role: "startPoint" },
      note: "tangent: arc-a ↔ line-top at start-side",
    },
    {
      id: `${prefix}-c-tangent-top-b`,
      kind: "coincident",
      a: `${prefix}-p-top-b`,
      b: { entity: `${prefix}-arc-b`, role: "endPoint" },
      note: "tangent: arc-b ↔ line-top at end-side",
    },
    {
      id: `${prefix}-c-tangent-bot-a`,
      kind: "coincident",
      a: `${prefix}-p-bot-a`,
      b: { entity: `${prefix}-arc-a`, role: "endPoint" },
      note: "tangent: arc-a ↔ line-bot at start-side",
    },
    {
      id: `${prefix}-c-tangent-bot-b`,
      kind: "coincident",
      a: `${prefix}-p-bot-b`,
      b: { entity: `${prefix}-arc-b`, role: "startPoint" },
      note: "tangent: arc-b ↔ line-bot at end-side",
    },
  ];

  /* --------------------------------------------------------- boundary */

  // Angles of perp / -perp measured from each arc center.
  const perpAngle = Math.atan2(perp.y, perp.x);
  const negPerpAngle = Math.atan2(-perp.y, -perp.x);

  const boundary: Point2[] = [];

  // 1. Bottom line corners (botStart, botEnd).
  boundary.push({ x: botStart.x, y: botStart.y });
  boundary.push({ x: botEnd.x, y: botEnd.y });

  // 2. arc_B: sweep +π CCW from -perp to +perp around `end` (through the +axis
  //    half-plane — the side away from `start`). The final sample lands on topEnd.
  for (let i = 1; i <= arcSamples; i++) {
    const t = i / arcSamples;
    const a = negPerpAngle + t * Math.PI;
    boundary.push({
      x: end.x + r * Math.cos(a),
      y: end.y + r * Math.sin(a),
    });
  }

  // 3. Top line: topStart corner (topEnd is already the last arc_B sample).
  boundary.push({ x: topStart.x, y: topStart.y });

  // 4. arc_A: sweep +π CCW from +perp to -perp around `start` (through the -axis
  //    half-plane — the side away from `end`). The final sample lands on botStart.
  for (let i = 1; i <= arcSamples; i++) {
    const t = i / arcSamples;
    const a = perpAngle + t * Math.PI;
    boundary.push({
      x: start.x + r * Math.cos(a),
      y: start.y + r * Math.sin(a),
    });
  }

  // 5. Explicit closing vertex (== botStart) so the boundary has exactly
  //    2·arcSamples + 4 points, one for each of the 4 corners + arc samples.
  boundary.push({ x: botStart.x, y: botStart.y });

  return { entities, constraints, boundary };
}
