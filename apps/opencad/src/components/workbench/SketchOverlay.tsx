"use client";

/**
 * opencad — SketchOverlay
 *
 * 2D SVG overlay that sits on top of the R3F canvas when a sketch is active.
 * Renders points, lines, arcs, circles, and constraint adornment glyphs.
 * Emits a single onCommit(action) event — parent decides how to apply it
 * (typically via the workbench store).
 */

import { useCallback, useMemo, useRef, useState } from "react";

export type SketchTool =
  | "select"
  | "point"
  | "line"
  | "arc"
  | "circle"
  | "dimension";

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

export type SketchEntity = SketchPoint | SketchLine | SketchArc | SketchCircle;

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

/** Build a cheap lookup for points by id. */
function indexPoints(entities: SketchEntity[]): Map<string, SketchPoint> {
  const map = new Map<string, SketchPoint>();
  for (const e of entities) if (e.kind === "point") map.set(e.id, e);
  return map;
}

export function SketchOverlay({
  entities,
  constraints,
  activeTool,
  width = 800,
  height = 600,
  onCommit,
  selectedId = null,
}: SketchOverlayProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pendingStart, setPendingStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const points = useMemo(() => indexPoints(entities), [entities]);

  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
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
      if (!pendingStart) return;
      setCursor(toSvgCoords(e.clientX, e.clientY));
    },
    [pendingStart, toSvgCoords],
  );

  const cursorClass =
    activeTool === "select"
      ? "cursor-default"
      : activeTool === "dimension"
      ? "cursor-help"
      : "cursor-crosshair";

  return (
    <svg
      ref={svgRef}
      className={`pointer-events-auto absolute inset-0 h-full w-full ${cursorClass}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      onClick={handleClick}
      onMouseMove={handleMove}
      role="img"
      aria-label="Sketch overlay"
    >
      {/* Preview for in-progress line/circle */}
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
