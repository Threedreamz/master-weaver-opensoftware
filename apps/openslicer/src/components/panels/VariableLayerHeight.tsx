"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { X, RotateCcw, Check } from "lucide-react";
import { useSlicerStore } from "../../stores/slicer-store";

interface ControlPoint {
  z: number;
  height: number;
}

const MIN_LAYER_HEIGHT = 0.04;
const MAX_LAYER_HEIGHT = 0.4;
const Y_STEP = 0.05; // grid line every 0.05mm on Y axis
const X_STEP = 10; // grid line every 10mm on Z axis

const CANVAS_PADDING = { top: 20, right: 20, bottom: 32, left: 48 };
const POINT_RADIUS = 6;
const POINT_HIT_RADIUS = 12;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolateHeight(points: ControlPoint[], z: number): number {
  if (points.length === 0) return 0.2;
  if (points.length === 1) return points[0].height;
  if (z <= points[0].z) return points[0].height;
  if (z >= points[points.length - 1].z) return points[points.length - 1].height;

  for (let i = 0; i < points.length - 1; i++) {
    if (z >= points[i].z && z <= points[i + 1].z) {
      const t = (z - points[i].z) / (points[i + 1].z - points[i].z);
      return lerp(points[i].height, points[i + 1].height, t);
    }
  }
  return points[points.length - 1].height;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function VariableLayerHeight({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    models,
    sliceOverrides,
    variableLayerProfile,
    setVariableLayerProfile,
  } = useSlicerStore();

  // Derive model height from loaded models
  const modelMaxZ = models.reduce((max, m) => {
    const h = m.boundingBox?.z ?? 0;
    return Math.max(max, h);
  }, 0);
  const maxZ = Math.max(modelMaxZ, 20); // fallback 20mm minimum

  const defaultHeight = sliceOverrides.layerHeight ?? 0.2;

  // Local editable points (sorted by z)
  const [points, setPoints] = useState<ControlPoint[]>(() => {
    if (variableLayerProfile && variableLayerProfile.length > 0) {
      return [...variableLayerProfile].sort((a, b) => a.z - b.z);
    }
    return [
      { z: 0, height: defaultHeight },
      { z: maxZ, height: defaultHeight },
    ];
  });

  // Reset local state when opening
  useEffect(() => {
    if (open) {
      if (variableLayerProfile && variableLayerProfile.length > 0) {
        setPoints([...variableLayerProfile].sort((a, b) => a.z - b.z));
      } else {
        setPoints([
          { z: 0, height: defaultHeight },
          { z: maxZ, height: defaultHeight },
        ]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ z: number; height: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 300 });

  // Responsive canvas sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setCanvasSize({ width: Math.max(400, width), height: 280 });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Coordinate transforms
  const graphWidth = canvasSize.width - CANVAS_PADDING.left - CANVAS_PADDING.right;
  const graphHeight = canvasSize.height - CANVAS_PADDING.top - CANVAS_PADDING.bottom;

  const zToX = useCallback(
    (z: number) => CANVAS_PADDING.left + (z / maxZ) * graphWidth,
    [maxZ, graphWidth]
  );
  const heightToY = useCallback(
    (h: number) =>
      CANVAS_PADDING.top +
      graphHeight -
      ((h - MIN_LAYER_HEIGHT) / (MAX_LAYER_HEIGHT - MIN_LAYER_HEIGHT)) * graphHeight,
    [graphHeight]
  );
  const xToZ = useCallback(
    (x: number) => clamp(((x - CANVAS_PADDING.left) / graphWidth) * maxZ, 0, maxZ),
    [maxZ, graphWidth]
  );
  const yToHeight = useCallback(
    (y: number) =>
      clamp(
        MIN_LAYER_HEIGHT +
          ((CANVAS_PADDING.top + graphHeight - y) / graphHeight) *
            (MAX_LAYER_HEIGHT - MIN_LAYER_HEIGHT),
        MIN_LAYER_HEIGHT,
        MAX_LAYER_HEIGHT
      ),
    [graphHeight]
  );

  // Drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    // Clear
    ctx.fillStyle = "#18181b"; // zinc-900
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw grid
    ctx.strokeStyle = "#27272a"; // zinc-800
    ctx.lineWidth = 1;

    // Vertical grid lines (Z positions)
    for (let z = 0; z <= maxZ; z += X_STEP) {
      const x = zToX(z);
      ctx.beginPath();
      ctx.moveTo(x, CANVAS_PADDING.top);
      ctx.lineTo(x, CANVAS_PADDING.top + graphHeight);
      ctx.stroke();

      // Label
      ctx.fillStyle = "#71717a"; // zinc-500
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${z}`, x, CANVAS_PADDING.top + graphHeight + 14);
    }

    // Horizontal grid lines (Height values)
    for (
      let h = MIN_LAYER_HEIGHT;
      h <= MAX_LAYER_HEIGHT + 0.001;
      h += Y_STEP
    ) {
      const y = heightToY(h);
      ctx.beginPath();
      ctx.strokeStyle = "#27272a";
      ctx.moveTo(CANVAS_PADDING.left, y);
      ctx.lineTo(CANVAS_PADDING.left + graphWidth, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = "#71717a";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${h.toFixed(2)}`, CANVAS_PADDING.left - 6, y + 3);
    }

    // Axis labels
    ctx.fillStyle = "#a1a1aa"; // zinc-400
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Z Height (mm)", CANVAS_PADDING.left + graphWidth / 2, canvasSize.height - 2);
    ctx.save();
    ctx.translate(12, CANVAS_PADDING.top + graphHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Layer Height (mm)", 0, 0);
    ctx.restore();

    // Draw graph border
    ctx.strokeStyle = "#3f3f46"; // zinc-700
    ctx.lineWidth = 1;
    ctx.strokeRect(
      CANVAS_PADDING.left,
      CANVAS_PADDING.top,
      graphWidth,
      graphHeight
    );

    // Draw model silhouette (thin bar on left margin)
    if (modelMaxZ > 0) {
      const silWidth = 6;
      const silX = CANVAS_PADDING.left - silWidth - 20;
      // Simple gradient bar representing the model height
      const gradTop = heightToY(MAX_LAYER_HEIGHT);
      const gradBottom = heightToY(MIN_LAYER_HEIGHT);
      const modelTop =
        CANVAS_PADDING.top +
        graphHeight -
        (modelMaxZ / maxZ) * graphHeight;
      const modelBottom = CANVAS_PADDING.top + graphHeight;

      ctx.fillStyle = "#3f3f46";
      ctx.fillRect(silX, modelTop, silWidth, modelBottom - modelTop);

      // Outline
      ctx.strokeStyle = "#52525b";
      ctx.lineWidth = 1;
      ctx.strokeRect(silX, modelTop, silWidth, modelBottom - modelTop);
    }

    // Draw the interpolated curve (dense sampling)
    ctx.beginPath();
    ctx.strokeStyle = "#6366f1"; // indigo-500
    ctx.lineWidth = 2.5;
    const steps = Math.max(200, graphWidth);
    for (let i = 0; i <= steps; i++) {
      const z = (i / steps) * maxZ;
      const h = interpolateHeight(points, z);
      const x = zToX(z);
      const y = heightToY(h);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill under curve with translucent
    ctx.lineTo(zToX(maxZ), heightToY(MIN_LAYER_HEIGHT));
    ctx.lineTo(zToX(0), heightToY(MIN_LAYER_HEIGHT));
    ctx.closePath();
    ctx.fillStyle = "rgba(99, 102, 241, 0.08)";
    ctx.fill();

    // Draw control points
    points.forEach((pt, idx) => {
      const x = zToX(pt.z);
      const y = heightToY(pt.height);

      // Outer ring
      ctx.beginPath();
      ctx.arc(x, y, POINT_RADIUS + 1, 0, Math.PI * 2);
      ctx.fillStyle =
        draggingIdx === idx ? "#818cf8" : "#6366f1"; // indigo-400 / indigo-500
      ctx.fill();

      // Inner dot
      ctx.beginPath();
      ctx.arc(x, y, POINT_RADIUS - 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    });

    // Cursor readout
    if (hoverPos) {
      const text = `Z: ${hoverPos.z.toFixed(1)}mm  H: ${hoverPos.height.toFixed(2)}mm`;
      ctx.fillStyle = "#e4e4e7"; // zinc-200
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      const tx = zToX(hoverPos.z) + 12;
      const ty = heightToY(hoverPos.height) - 10;
      // Background
      const metrics = ctx.measureText(text);
      ctx.fillStyle = "rgba(24, 24, 27, 0.85)";
      ctx.fillRect(tx - 4, ty - 11, metrics.width + 8, 16);
      ctx.fillStyle = "#e4e4e7";
      ctx.fillText(text, tx, ty);
    }
  }, [
    canvasSize,
    maxZ,
    graphWidth,
    graphHeight,
    points,
    draggingIdx,
    hoverPos,
    zToX,
    heightToY,
    modelMaxZ,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse handlers
  const getCanvasPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },
    []
  );

  const findPointAt = useCallback(
    (cx: number, cy: number): number | null => {
      for (let i = 0; i < points.length; i++) {
        const px = zToX(points[i].z);
        const py = heightToY(points[i].height);
        const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2);
        if (dist <= POINT_HIT_RADIUS) return i;
      }
      return null;
    },
    [points, zToX, heightToY]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasPos(e);
      const idx = findPointAt(x, y);
      if (idx !== null) {
        setDraggingIdx(idx);
      }
    },
    [getCanvasPos, findPointAt]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasPos(e);
      const z = xToZ(x);
      const h = yToHeight(y);
      setHoverPos({ z, height: h });

      if (draggingIdx !== null) {
        setPoints((prev) => {
          const updated = [...prev];
          const newZ = clamp(z, 0, maxZ);
          const newH = clamp(h, MIN_LAYER_HEIGHT, MAX_LAYER_HEIGHT);
          // First and last points: only adjust height, keep z fixed
          if (draggingIdx === 0) {
            updated[0] = { z: 0, height: newH };
          } else if (draggingIdx === prev.length - 1) {
            updated[prev.length - 1] = { z: maxZ, height: newH };
          } else {
            // Constrain z between neighbors
            const minZ = updated[draggingIdx - 1].z + 0.1;
            const maxZNeighbor = updated[draggingIdx + 1].z - 0.1;
            updated[draggingIdx] = {
              z: clamp(newZ, minZ, maxZNeighbor),
              height: newH,
            };
          }
          return updated;
        });
      }
    },
    [getCanvasPos, draggingIdx, xToZ, yToHeight, maxZ]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingIdx(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setDraggingIdx(null);
    setHoverPos(null);
  }, []);

  // Click to add point
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasPos(e);
      // Don't add if clicking on existing point
      if (findPointAt(x, y) !== null) return;

      const z = xToZ(x);
      const h = yToHeight(y);
      if (
        z < 0.1 ||
        z > maxZ - 0.1 ||
        h < MIN_LAYER_HEIGHT ||
        h > MAX_LAYER_HEIGHT
      )
        return;

      setPoints((prev) => {
        const newPoints = [...prev, { z, height: h }];
        newPoints.sort((a, b) => a.z - b.z);
        return newPoints;
      });
    },
    [getCanvasPos, findPointAt, xToZ, yToHeight, maxZ]
  );

  // Double-click to remove point (not first or last)
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasPos(e);
      const idx = findPointAt(x, y);
      if (idx !== null && idx !== 0 && idx !== points.length - 1) {
        setPoints((prev) => prev.filter((_, i) => i !== idx));
      }
    },
    [getCanvasPos, findPointAt, points.length]
  );

  const handleReset = useCallback(() => {
    setPoints([
      { z: 0, height: defaultHeight },
      { z: maxZ, height: defaultHeight },
    ]);
  }, [defaultHeight, maxZ]);

  const handleApply = useCallback(() => {
    setVariableLayerProfile(points.length > 2 ? points : null);
    onClose();
  }, [points, setVariableLayerProfile, onClose]);

  const handleClear = useCallback(() => {
    setVariableLayerProfile(null);
    onClose();
  }, [setVariableLayerProfile, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[700px] max-w-[95vw] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-700 px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Variable Layer Height
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-[11px] text-zinc-500">
            Click on the graph to add control points. Drag points to adjust.
            Double-click a point to remove it. First and last points stay
            anchored to Z=0 and Z={maxZ.toFixed(0)}.
          </p>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="px-5 py-3">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair rounded border border-zinc-800"
            style={{ height: canvasSize.height }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
          />
        </div>

        {/* Point count */}
        <div className="px-5 pb-2">
          <span className="text-[10px] text-zinc-500">
            {points.length} control points
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-zinc-700 px-5 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
            {variableLayerProfile && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1.5 rounded-md border border-red-800/50 bg-red-900/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/40"
              >
                <X className="h-3 w-3" />
                Remove Profile
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            <Check className="h-3 w-3" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
