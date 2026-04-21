"use client";

/**
 * opencad — SketchOverlay
 *
 * 2D SVG overlay that sits on top of the R3F canvas when a sketch is active.
 * Renders points, lines, arcs, circles, ellipses, cubic Beziers, and B-splines,
 * plus constraint adornment glyphs.
 *
 * Two event surfaces:
 *   - onCommit(action)           — single-entity click flows (point/line/circle).
 *   - onCreateEntities(entities, constraints)  — multi-entity drag-to-sketch
 *     flows for rectangle / polygon / ellipse / slot / bezier / spline. Helpers
 *     from src/lib/sketch/* are NOT imported directly — minimal client-side
 *     generators live inline to avoid pulling server-only code into the bundle.
 */

import { useCallback, useMemo, useRef, useState } from "react";

export type SketchTool =
  | "select"
  | "point"
  | "line"
  | "arc"
  | "circle"
  | "dimension"
  | "rectangle"
  | "polygon"
  | "ellipse"
  | "slot"
  | "bezier"
  | "spline";

export interface SketchPoint {
  kind: "point";
  id: string;
  x: number;
  y: number;
  fixed?: boolean;
}

export interface SketchLine {
  kind: "line";
  id: string;
  p0: string;
  p1: string;
}

export interface SketchArc {
  kind: "arc";
  id: string;
  center: string;
  start: string;
  end: string;
}

export interface SketchCircle {
  kind: "circle";
  id: string;
  center: string;
  radius: number;
}

export interface SketchEllipse {
  kind: "ellipse";
  id: string;
  center: string;
  semiMajor: number;
  semiMinor: number;
  rotationDeg: number;
}

export interface SketchBezierCubic {
  kind: "bezier-cubic";
  id: string;
  p0: string;
  p1: string;
  p2: string;
  p3: string;
}

export interface SketchBSpline {
  kind: "bspline";
  id: string;
  degree: number;
  controlPoints: string[];
}

export type SketchEntity =
  | SketchPoint
  | SketchLine
  | SketchArc
  | SketchCircle
  | SketchEllipse
  | SketchBezierCubic
  | SketchBSpline;

export interface SketchConstraint {
  id?: string;
  kind:
    | "coincident"
    | "horizontal"
    | "vertical"
    | "parallel"
    | "perpendicular"
    | "distance"
    | "angle"
    | "radius"
    | "equal";
  a?: string;
  b?: string;
  entity?: string;
  value?: number;
  degrees?: number;
}

export type SketchAction =
  | { type: "add-point"; x: number; y: number }
  | { type: "add-line"; p0: { x: number; y: number }; p1: { x: number; y: number } }
  | { type: "add-circle"; center: { x: number; y: number }; radius: number }
  | { type: "select"; id: string | null };

export interface SketchOverlayProps {
  entities: SketchEntity[];
  constraints: SketchConstraint[];
  activeTool: SketchTool;
  width?: number;
  height?: number;
  onCommit?: (action: SketchAction) => void;
  onCreateEntities?: (
    entities: SketchEntity[],
    constraints: SketchConstraint[],
  ) => void;
  selectedId?: string | null;
}

const CONSTRAINT_GLYPH: Record<SketchConstraint["kind"], string> = {
  perpendicular: "⊥",
  parallel: "∥",
  equal: "=",
  horizontal: "—",
  vertical: "|",
  coincident: "●",
  distance: "↔",
  angle: "∠",
  radius: "R",
};

const DRAG_TOOLS: ReadonlySet<SketchTool> = new Set([
  "rectangle",
  "polygon",
  "ellipse",
  "slot",
  "bezier",
  "spline",
]);

/** Build a cheap lookup for points by id. */
function indexPoints(entities: SketchEntity[]): Map<string, SketchPoint> {
  const map = new Map<string, SketchPoint>();
  for (const e of entities) if (e.kind === "point") map.set(e.id, e);
  return map;
}

/* --------------------------------------------------------- inline generators
 * Minimal client-side entity/constraint producers. These mirror the shape of
 * src/lib/sketch/* helpers but are INLINED here to avoid pulling server code
 * (uuid, validation, residuals) into the browser bundle.
 * ------------------------------------------------------------------------ */

function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}-${Date.now().toString(36)}`;
}

function genRectangle(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
): { entities: SketchEntity[]; constraints: SketchConstraint[] } {
  const prefix = newId("rect");
  const minX = Math.min(p0.x, p1.x);
  const maxX = Math.max(p0.x, p1.x);
  const minY = Math.min(p0.y, p1.y);
  const maxY = Math.max(p0.y, p1.y);
  const ids = [`${prefix}-p0`, `${prefix}-p1`, `${prefix}-p2`, `${prefix}-p3`];
  const lIds = [`${prefix}-l0`, `${prefix}-l1`, `${prefix}-l2`, `${prefix}-l3`];
  const entities: SketchEntity[] = [
    { kind: "point", id: ids[0], x: minX, y: minY },
    { kind: "point", id: ids[1], x: maxX, y: minY },
    { kind: "point", id: ids[2], x: maxX, y: maxY },
    { kind: "point", id: ids[3], x: minX, y: maxY },
    { kind: "line", id: lIds[0], p0: ids[0], p1: ids[1] },
    { kind: "line", id: lIds[1], p0: ids[1], p1: ids[2] },
    { kind: "line", id: lIds[2], p0: ids[2], p1: ids[3] },
    { kind: "line", id: lIds[3], p0: ids[3], p1: ids[0] },
  ];
  const constraints: SketchConstraint[] = [
    { id: `${prefix}-c0`, kind: "horizontal", entity: lIds[0] },
    { id: `${prefix}-c1`, kind: "horizontal", entity: lIds[2] },
    { id: `${prefix}-c2`, kind: "vertical", entity: lIds[1] },
    { id: `${prefix}-c3`, kind: "vertical", entity: lIds[3] },
  ];
  return { entities, constraints };
}

function genEllipse(
  center: { x: number; y: number },
  corner: { x: number; y: number },
): { entities: SketchEntity[]; constraints: SketchConstraint[] } {
  const prefix = newId("ell");
  const rx = Math.max(1e-6, Math.abs(corner.x - center.x));
  const ry = Math.max(1e-6, Math.abs(corner.y - center.y));
  const semiMajor = Math.max(rx, ry);
  const semiMinor = Math.min(rx, ry);
  // Rotation of 90° if the minor axis sits along +x (ry is bigger).
  const rotationDeg = ry > rx ? 90 : 0;
  const centerId = `${prefix}-center`;
  const entities: SketchEntity[] = [
    { kind: "point", id: centerId, x: center.x, y: center.y, fixed: true },
    {
      kind: "ellipse",
      id: `${prefix}-e`,
      center: centerId,
      semiMajor,
      semiMinor,
      rotationDeg,
    },
  ];
  return { entities, constraints: [] };
}

function genSlot(
  start: { x: number; y: number },
  end: { x: number; y: number },
): { entities: SketchEntity[]; constraints: SketchConstraint[] } {
  const prefix = newId("slot");
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const axisLen = Math.hypot(dx, dy);
  if (axisLen < 1e-9) return { entities: [], constraints: [] };
  // Width defaults to 25% of axis length for a pleasing preview shape.
  const width = Math.max(4, axisLen * 0.25);
  const r = width / 2;
  const ux = dx / axisLen;
  const uy = dy / axisLen;
  const px = -uy;
  const py = ux;
  const centerA = `${prefix}-ca`;
  const centerB = `${prefix}-cb`;
  const topA = `${prefix}-ta`;
  const topB = `${prefix}-tb`;
  const botA = `${prefix}-ba`;
  const botB = `${prefix}-bb`;
  const lineTop = `${prefix}-lt`;
  const lineBot = `${prefix}-lb`;
  const arcA = `${prefix}-aa`;
  const arcB = `${prefix}-ab`;
  const entities: SketchEntity[] = [
    { kind: "point", id: centerA, x: start.x, y: start.y, fixed: true },
    { kind: "point", id: centerB, x: end.x, y: end.y },
    { kind: "point", id: topA, x: start.x + r * px, y: start.y + r * py },
    { kind: "point", id: topB, x: end.x + r * px, y: end.y + r * py },
    { kind: "point", id: botA, x: start.x - r * px, y: start.y - r * py },
    { kind: "point", id: botB, x: end.x - r * px, y: end.y - r * py },
    { kind: "line", id: lineTop, p0: topA, p1: topB },
    { kind: "line", id: lineBot, p0: botA, p1: botB },
    { kind: "arc", id: arcA, center: centerA, start: topA, end: botA },
    { kind: "arc", id: arcB, center: centerB, start: botB, end: topB },
  ];
  const constraints: SketchConstraint[] = [
    { id: `${prefix}-par`, kind: "parallel", a: lineTop, b: lineBot },
  ];
  return { entities, constraints };
}

function genBezier(
  p0: { x: number; y: number },
  p3: { x: number; y: number },
): { entities: SketchEntity[]; constraints: SketchConstraint[] } {
  const prefix = newId("bz");
  const p0Id = `${prefix}-p0`;
  const p1Id = `${prefix}-p1`;
  const p2Id = `${prefix}-p2`;
  const p3Id = `${prefix}-p3`;
  // Default handles at 1/3 and 2/3 along the chord, offset for visibility.
  const dx = p3.x - p0.x;
  const dy = p3.y - p0.y;
  const normX = -dy * 0.25;
  const normY = dx * 0.25;
  const entities: SketchEntity[] = [
    { kind: "point", id: p0Id, x: p0.x, y: p0.y },
    { kind: "point", id: p1Id, x: p0.x + dx / 3 + normX, y: p0.y + dy / 3 + normY },
    { kind: "point", id: p2Id, x: p0.x + (2 * dx) / 3 + normX, y: p0.y + (2 * dy) / 3 + normY },
    { kind: "point", id: p3Id, x: p3.x, y: p3.y },
    { kind: "bezier-cubic", id: `${prefix}-c`, p0: p0Id, p1: p1Id, p2: p2Id, p3: p3Id },
  ];
  return { entities, constraints: [] };
}

function genBSpline(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
): { entities: SketchEntity[]; constraints: SketchConstraint[] } {
  const prefix = newId("bs");
  // Draft open-uniform cubic with 4 control points along the drag vector.
  const ids = [`${prefix}-c0`, `${prefix}-c1`, `${prefix}-c2`, `${prefix}-c3`];
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const entities: SketchEntity[] = [
    { kind: "point", id: ids[0], x: p0.x, y: p0.y },
    { kind: "point", id: ids[1], x: p0.x + dx / 3, y: p0.y + dy / 3 - 20 },
    { kind: "point", id: ids[2], x: p0.x + (2 * dx) / 3, y: p0.y + (2 * dy) / 3 + 20 },
    { kind: "point", id: ids[3], x: p1.x, y: p1.y },
    { kind: "bspline", id: `${prefix}-s`, degree: 3, controlPoints: ids },
  ];
  return { entities, constraints: [] };
}

/* --------------------------------------------------------- inline samplers
 * Used only for rendering — matches evalBezier/openUniform+Cox-de-Boor from
 * src/lib/sketch/spline.ts but slimmed for the client.
 * ------------------------------------------------------------------------ */

interface XY {
  x: number;
  y: number;
}

function evalBezier(p0: XY, p1: XY, p2: XY, p3: XY, t: number): XY {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  return {
    x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
    y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
  };
}

function openUniformKnots(n: number, p: number): number[] {
  const m = n + p + 1;
  const knots = new Array<number>(m);
  for (let i = 0; i < m; i++) {
    if (i <= p) knots[i] = 0;
    else if (i >= n) knots[i] = 1;
    else knots[i] = (i - p) / (n - p);
  }
  return knots;
}

function coxDeBoor(i: number, p: number, t: number, knots: number[]): number {
  const lastKnot = knots[knots.length - 1];
  const N = new Array<number>(p + 1);
  for (let j = 0; j <= p; j++) {
    const k0 = knots[i + j];
    const k1 = knots[i + j + 1];
    let val = 0;
    if (k0 <= t && t < k1) val = 1;
    else if (t === lastKnot && k1 === lastKnot && k0 < k1) val = 1;
    N[j] = val;
  }
  for (let k = 1; k <= p; k++) {
    for (let j = 0; j <= p - k; j++) {
      const d1 = knots[i + j + k] - knots[i + j];
      const d2 = knots[i + j + k + 1] - knots[i + j + 1];
      const a = d1 > 0 ? ((t - knots[i + j]) / d1) * N[j] : 0;
      const b = d2 > 0 ? ((knots[i + j + k + 1] - t) / d2) * N[j + 1] : 0;
      N[j] = a + b;
    }
  }
  return N[0];
}

function sampleBSpline(pts: XY[], degree: number, samples: number): XY[] {
  const n = pts.length;
  const p = Math.min(degree, n - 1);
  if (n < 2) return pts.slice();
  const knots = openUniformKnots(n, p);
  const out: XY[] = new Array(samples);
  const last = samples - 1;
  for (let s = 0; s <= last; s++) {
    const t = s / last;
    let x = 0;
    let y = 0;
    for (let i = 0; i < n; i++) {
      const w = coxDeBoor(i, p, t, knots);
      x += w * pts[i].x;
      y += w * pts[i].y;
    }
    out[s] = { x, y };
  }
  return out;
}

/* ------------------------------------------------------------- component */

export function SketchOverlay({
  entities,
  constraints,
  activeTool,
  width = 800,
  height = 600,
  onCommit,
  onCreateEntities,
  selectedId = null,
}: SketchOverlayProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pendingStart, setPendingStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(
    null,
  );

  const points = useMemo(() => indexPoints(entities), [entities]);

  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!DRAG_TOOLS.has(activeTool)) return;
      const pt = toSvgCoords(e.clientX, e.clientY);
      setDragStart(pt);
      setDragCurrent(pt);
    },
    [activeTool, toSvgCoords],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!DRAG_TOOLS.has(activeTool)) return;
      const pt = toSvgCoords(e.clientX, e.clientY);
      const start = dragStart;
      setDragStart(null);
      setDragCurrent(null);
      if (!start) return;
      // Too small a drag — treat as cancelled click.
      if (Math.hypot(pt.x - start.x, pt.y - start.y) < 3) return;

      switch (activeTool) {
        case "rectangle": {
          const r = genRectangle(start, pt);
          onCreateEntities?.(r.entities, r.constraints);
          return;
        }
        case "ellipse": {
          const r = genEllipse(start, pt);
          onCreateEntities?.(r.entities, r.constraints);
          return;
        }
        case "slot": {
          const r = genSlot(start, pt);
          onCreateEntities?.(r.entities, r.constraints);
          return;
        }
        case "bezier": {
          const r = genBezier(start, pt);
          onCreateEntities?.(r.entities, r.constraints);
          return;
        }
        case "spline": {
          const r = genBSpline(start, pt);
          onCreateEntities?.(r.entities, r.constraints);
          return;
        }
        case "polygon": {
          // Polygon needs a sides count — helper lives server-side and isn't
          // inlined. Emit empty + warn so parent can prompt the user.
          // eslint-disable-next-line no-console
          console.warn(
            "SketchOverlay: polygon tool drag -> no client-side generator; use a dialog to call createRegularPolygon on the server.",
          );
          onCreateEntities?.([], []);
          return;
        }
      }
    },
    [activeTool, dragStart, onCreateEntities, toSvgCoords],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (DRAG_TOOLS.has(activeTool)) return; // handled by mouseup
      const pt = toSvgCoords(e.clientX, e.clientY);
      if (activeTool === "point") {
        onCommit?.({ type: "add-point", x: pt.x, y: pt.y });
        return;
      }
      if (activeTool === "line") {
        if (!pendingStart) {
          setPendingStart(pt);
        } else {
          onCommit?.({ type: "add-line", p0: pendingStart, p1: pt });
          setPendingStart(null);
        }
        return;
      }
      if (activeTool === "circle") {
        if (!pendingStart) {
          setPendingStart(pt);
        } else {
          const dx = pt.x - pendingStart.x;
          const dy = pt.y - pendingStart.y;
          const radius = Math.hypot(dx, dy);
          onCommit?.({ type: "add-circle", center: pendingStart, radius });
          setPendingStart(null);
        }
        return;
      }
      if (activeTool === "select") {
        onCommit?.({ type: "select", id: null });
      }
    },
    [activeTool, onCommit, pendingStart, toSvgCoords],
  );

  const handleMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const pt = toSvgCoords(e.clientX, e.clientY);
      if (pendingStart) setCursor(pt);
      if (dragStart) setDragCurrent(pt);
    },
    [dragStart, pendingStart, toSvgCoords],
  );

  const cursorClass =
    activeTool === "select"
      ? "cursor-default"
      : activeTool === "dimension"
      ? "cursor-help"
      : "cursor-crosshair";

  /* ---------------------------------------------------------- drag previews */

  const dragPreview = (() => {
    if (!dragStart || !dragCurrent) return null;
    const s = dragStart;
    const c = dragCurrent;
    const common = {
      stroke: "#60a5fa",
      strokeDasharray: "4 3",
      strokeWidth: 1.25,
      fill: "none" as const,
    };
    switch (activeTool) {
      case "rectangle": {
        const x = Math.min(s.x, c.x);
        const y = Math.min(s.y, c.y);
        const w = Math.abs(c.x - s.x);
        const h = Math.abs(c.y - s.y);
        return <rect x={x} y={y} width={w} height={h} {...common} />;
      }
      case "ellipse": {
        const rx = Math.max(1, Math.abs(c.x - s.x));
        const ry = Math.max(1, Math.abs(c.y - s.y));
        return <ellipse cx={s.x} cy={s.y} rx={rx} ry={ry} {...common} />;
      }
      case "slot": {
        return (
          <line x1={s.x} y1={s.y} x2={c.x} y2={c.y} stroke="#60a5fa" strokeDasharray="4 3" strokeWidth={1.25} />
        );
      }
      case "polygon": {
        // Circle preview (reference circle) — we don't know the sides yet.
        const r = Math.hypot(c.x - s.x, c.y - s.y);
        return <circle cx={s.x} cy={s.y} r={r} {...common} />;
      }
      case "bezier":
      case "spline": {
        return (
          <line x1={s.x} y1={s.y} x2={c.x} y2={c.y} stroke="#60a5fa" strokeDasharray="4 3" strokeWidth={1.25} />
        );
      }
    }
    return null;
  })();

  return (
    <svg
      ref={svgRef}
      className={`pointer-events-auto absolute inset-0 h-full w-full ${cursorClass}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMove}
      role="img"
      aria-label="Sketch overlay"
    >
      {/* Preview for in-progress click-flow line/circle */}
      {pendingStart && cursor && activeTool === "line" && (
        <line
          x1={pendingStart.x}
          y1={pendingStart.y}
          x2={cursor.x}
          y2={cursor.y}
          stroke="#60a5fa"
          strokeDasharray="4 3"
          strokeWidth={1.25}
        />
      )}
      {pendingStart && cursor && activeTool === "circle" && (
        <circle
          cx={pendingStart.x}
          cy={pendingStart.y}
          r={Math.hypot(cursor.x - pendingStart.x, cursor.y - pendingStart.y)}
          stroke="#60a5fa"
          strokeDasharray="4 3"
          strokeWidth={1.25}
          fill="none"
        />
      )}

      {/* Drag preview for rect/polygon/ellipse/slot/bezier/spline */}
      {dragPreview}

      {/* Lines */}
      {entities.map((e) => {
        if (e.kind !== "line") return null;
        const p0 = points.get(e.p0);
        const p1 = points.get(e.p1);
        if (!p0 || !p1) return null;
        const selected = selectedId === e.id;
        return (
          <line
            key={e.id}
            x1={p0.x}
            y1={p0.y}
            x2={p1.x}
            y2={p1.y}
            stroke={selected ? "#60a5fa" : "#e5e7eb"}
            strokeWidth={selected ? 2 : 1.5}
            onClick={(ev) => {
              ev.stopPropagation();
              onCommit?.({ type: "select", id: e.id });
            }}
            className="pointer-events-auto"
          />
        );
      })}

      {/* Circles */}
      {entities.map((e) => {
        if (e.kind !== "circle") return null;
        const c = points.get(e.center);
        if (!c) return null;
        const selected = selectedId === e.id;
        return (
          <circle
            key={e.id}
            cx={c.x}
            cy={c.y}
            r={e.radius}
            stroke={selected ? "#60a5fa" : "#e5e7eb"}
            strokeWidth={selected ? 2 : 1.5}
            fill="none"
            onClick={(ev) => {
              ev.stopPropagation();
              onCommit?.({ type: "select", id: e.id });
            }}
            className="pointer-events-auto"
          />
        );
      })}

      {/* Ellipses */}
      {entities.map((e) => {
        if (e.kind !== "ellipse") return null;
        const c = points.get(e.center);
        if (!c) return null;
        const selected = selectedId === e.id;
        return (
          <ellipse
            key={e.id}
            cx={c.x}
            cy={c.y}
            rx={e.semiMajor}
            ry={e.semiMinor}
            transform={"rotate(" + e.rotationDeg + " " + c.x + " " + c.y + ")"}
            stroke={selected ? "#60a5fa" : "#e5e7eb"}
            strokeWidth={selected ? 2 : 1.5}
            fill="none"
            onClick={(ev) => {
              ev.stopPropagation();
              onCommit?.({ type: "select", id: e.id });
            }}
            className="pointer-events-auto"
          />
        );
      })}

      {/* Arcs — rendered as a path from start → end through midpoint of the arc */}
      {entities.map((e) => {
        if (e.kind !== "arc") return null;
        const c = points.get(e.center);
        const s = points.get(e.start);
        const t = points.get(e.end);
        if (!c || !s || !t) return null;
        const r = Math.hypot(s.x - c.x, s.y - c.y);
        const d = `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${t.x} ${t.y}`;
        const selected = selectedId === e.id;
        return (
          <path
            key={e.id}
            d={d}
            stroke={selected ? "#60a5fa" : "#e5e7eb"}
            strokeWidth={selected ? 2 : 1.5}
            fill="none"
            onClick={(ev) => {
              ev.stopPropagation();
              onCommit?.({ type: "select", id: e.id });
            }}
            className="pointer-events-auto"
          />
        );
      })}

      {/* Cubic Bezier curves + faint dashed control polygons */}
      {entities.map((e) => {
        if (e.kind !== "bezier-cubic") return null;
        const p0 = points.get(e.p0);
        const p1 = points.get(e.p1);
        const p2 = points.get(e.p2);
        const p3 = points.get(e.p3);
        if (!p0 || !p1 || !p2 || !p3) return null;
        const selected = selectedId === e.id;
        const d = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
        return (
          <g key={e.id}>
            <polyline
              points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
              stroke="#4b5563"
              strokeDasharray="3 3"
              strokeWidth={0.75}
              fill="none"
              aria-label="bezier-hull"
            />
            <path
              d={d}
              stroke={selected ? "#60a5fa" : "#e5e7eb"}
              strokeWidth={selected ? 2 : 1.5}
              fill="none"
              onClick={(ev) => {
                ev.stopPropagation();
                onCommit?.({ type: "select", id: e.id });
              }}
              className="pointer-events-auto"
            />
          </g>
        );
      })}

      {/* B-splines — sample ~32 points via open-uniform Cox-de-Boor, dashed hull */}
      {entities.map((e) => {
        if (e.kind !== "bspline") return null;
        const ctl: XY[] = [];
        for (const pid of e.controlPoints) {
          const p = points.get(pid);
          if (!p) return null;
          ctl.push({ x: p.x, y: p.y });
        }
        if (ctl.length < 2) return null;
        const samples = sampleBSpline(ctl, e.degree ?? 3, 32);
        const selected = selectedId === e.id;
        const ptsStr = samples.map((s) => `${s.x},${s.y}`).join(" ");
        const hullStr = ctl.map((s) => `${s.x},${s.y}`).join(" ");
        return (
          <g key={e.id}>
            <polyline
              points={hullStr}
              stroke="#4b5563"
              strokeDasharray="3 3"
              strokeWidth={0.75}
              fill="none"
              aria-label="bspline-hull"
            />
            <polyline
              points={ptsStr}
              stroke={selected ? "#60a5fa" : "#e5e7eb"}
              strokeWidth={selected ? 2 : 1.5}
              fill="none"
              onClick={(ev) => {
                ev.stopPropagation();
                onCommit?.({ type: "select", id: e.id });
              }}
              className="pointer-events-auto"
            />
          </g>
        );
      })}

      {/* Points (drawn last so they sit on top) */}
      {entities.map((e) => {
        if (e.kind !== "point") return null;
        const selected = selectedId === e.id;
        return (
          <circle
            key={e.id}
            cx={e.x}
            cy={e.y}
            r={selected ? 5 : 3.5}
            fill={e.fixed ? "#f59e0b" : selected ? "#60a5fa" : "#fafafa"}
            stroke="#0a0a0a"
            strokeWidth={1}
            onClick={(ev) => {
              ev.stopPropagation();
              onCommit?.({ type: "select", id: e.id });
            }}
            className="pointer-events-auto"
          />
        );
      })}

      {/* Constraint adornments — label the midpoint of the affected entity */}
      {constraints.map((c, i) => {
        const glyph = CONSTRAINT_GLYPH[c.kind];
        const targetId = c.entity ?? c.a;
        if (!targetId) return null;
        const target = entities.find((e) => e.id === targetId);
        if (!target) return null;

        let cx = 0;
        let cy = 0;
        if (target.kind === "point") {
          cx = target.x + 10;
          cy = target.y - 10;
        } else if (target.kind === "line") {
          const p0 = points.get(target.p0);
          const p1 = points.get(target.p1);
          if (!p0 || !p1) return null;
          cx = (p0.x + p1.x) / 2 + 10;
          cy = (p0.y + p1.y) / 2 - 10;
        } else if (target.kind === "circle") {
          const p = points.get(target.center);
          if (!p) return null;
          cx = p.x + target.radius + 6;
          cy = p.y;
        } else if (target.kind === "arc") {
          const p = points.get(target.center);
          if (!p) return null;
          cx = p.x;
          cy = p.y - 16;
        } else if (target.kind === "ellipse") {
          const p = points.get(target.center);
          if (!p) return null;
          cx = p.x + target.semiMajor + 6;
          cy = p.y;
        } else if (target.kind === "bezier-cubic") {
          const p0 = points.get(target.p0);
          const p3 = points.get(target.p3);
          if (!p0 || !p3) return null;
          cx = (p0.x + p3.x) / 2 + 10;
          cy = (p0.y + p3.y) / 2 - 10;
        } else if (target.kind === "bspline") {
          const first = points.get(target.controlPoints[0]);
          if (!first) return null;
          cx = first.x + 10;
          cy = first.y - 10;
        }

        return (
          <g key={c.id ?? `${c.kind}-${i}`} aria-label={`Constraint ${c.kind}`}>
            <rect
              x={cx - 8}
              y={cy - 9}
              width={16}
              height={16}
              rx={3}
              fill="#1f2937"
              stroke="#374151"
              strokeWidth={0.75}
            />
            <text
              x={cx}
              y={cy + 3}
              textAnchor="middle"
              fontSize={11}
              fontFamily="ui-sans-serif, system-ui"
              fill="#fde68a"
            >
              {glyph}
              {c.value != null ? ` ${c.value}` : ""}
              {c.degrees != null ? ` ${c.degrees}°` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default SketchOverlay;
