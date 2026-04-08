"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// --- Preset positions (same distance conventions as old CameraPresets) ---
const DIST = 200;
const HALF = DIST * 0.707; // ~cos(45deg)

interface CameraPreset {
  position: [number, number, number];
}

const FACE_PRESETS: Record<string, CameraPreset> = {
  Front:  { position: [0, 50, DIST] },
  Back:   { position: [0, 50, -DIST] },
  Top:    { position: [0, 250, 0.01] },
  Bottom: { position: [0, -150, 0.01] },
  Right:  { position: [DIST, 50, 0] },
  Left:   { position: [-DIST, 50, 0] },
};

const EDGE_PRESETS: Record<string, CameraPreset> = {
  "Front-Right": { position: [HALF, 50, HALF] },
  "Front-Left":  { position: [-HALF, 50, HALF] },
  "Back-Right":  { position: [HALF, 50, -HALF] },
  "Back-Left":   { position: [-HALF, 50, -HALF] },
  "Top-Front":   { position: [0, HALF + 50, HALF] },
  "Top-Back":    { position: [0, HALF + 50, -HALF] },
  "Top-Right":   { position: [HALF, HALF + 50, 0] },
  "Top-Left":    { position: [-HALF, HALF + 50, 0] },
  "Bottom-Front": { position: [0, -HALF + 50, HALF] },
  "Bottom-Back":  { position: [0, -HALF + 50, -HALF] },
  "Bottom-Right": { position: [HALF, -HALF + 50, 0] },
  "Bottom-Left":  { position: [-HALF, -HALF + 50, 0] },
};

const CORNER_PRESETS: Record<string, CameraPreset> = {
  "Top-Front-Right":    { position: [HALF, HALF + 50, HALF] },
  "Top-Front-Left":     { position: [-HALF, HALF + 50, HALF] },
  "Top-Back-Right":     { position: [HALF, HALF + 50, -HALF] },
  "Top-Back-Left":      { position: [-HALF, HALF + 50, -HALF] },
  "Bottom-Front-Right": { position: [HALF, -HALF + 50, HALF] },
  "Bottom-Front-Left":  { position: [-HALF, -HALF + 50, HALF] },
  "Bottom-Back-Right":  { position: [HALF, -HALF + 50, -HALF] },
  "Bottom-Back-Left":   { position: [-HALF, -HALF + 50, -HALF] },
};

// --- Camera rotation reader ---
// Reads the main R3F camera's spherical position and converts to euler-ish angles
// for the CSS cube. We expose a global so CameraPresetController can push updates.
interface CameraAngles {
  rx: number; // elevation in degrees (CSS rotateX)
  ry: number; // azimuth in degrees (CSS rotateY)
}

function getCameraAngles(): CameraAngles {
  const getter = (window as unknown as Record<string, unknown>).__openslicerCameraAngles;
  if (typeof getter === "function") {
    return (getter as () => CameraAngles)();
  }
  // Default: isometric-ish
  return { rx: -25, ry: -45 };
}

// --- ViewCube Component ---
export function ViewCube() {
  const [angles, setAngles] = useState<CameraAngles>({ rx: -25, ry: -45 });
  const [hoveredFace, setHoveredFace] = useState<string | null>(null);
  const rafRef = useRef<number>(0);

  // Poll camera angles at ~30fps
  useEffect(() => {
    let active = true;
    const poll = () => {
      if (!active) return;
      setAngles(getCameraAngles());
      rafRef.current = requestAnimationFrame(poll);
    };
    rafRef.current = requestAnimationFrame(poll);
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const applyPreset = useCallback((pos: [number, number, number]) => {
    const fn = (window as unknown as Record<string, unknown>).__openslicerCameraPreset;
    if (typeof fn === "function") {
      (fn as (pos: [number, number, number]) => void)(pos);
    }
  }, []);

  const SIZE = 80;
  const HALF_SIZE = SIZE / 2;
  const EDGE_THICK = 8;
  const CORNER_SIZE = 10;

  // Face definitions: label, CSS transform
  const faces: { label: string; transform: string }[] = [
    { label: "Front",  transform: `rotateY(0deg) translateZ(${HALF_SIZE}px)` },
    { label: "Back",   transform: `rotateY(180deg) translateZ(${HALF_SIZE}px)` },
    { label: "Right",  transform: `rotateY(90deg) translateZ(${HALF_SIZE}px)` },
    { label: "Left",   transform: `rotateY(-90deg) translateZ(${HALF_SIZE}px)` },
    { label: "Top",    transform: `rotateX(90deg) translateZ(${HALF_SIZE}px)` },
    { label: "Bottom", transform: `rotateX(-90deg) translateZ(${HALF_SIZE}px)` },
  ];

  // Edge hit-zones: positioned on each edge of the cube
  // Horizontal edges (front/back top/bottom)
  const edges: { key: string; transform: string; width: number; height: number }[] = [
    // Front face edges
    { key: "Top-Front",    transform: `rotateY(0deg) translateZ(${HALF_SIZE}px) translateY(${-HALF_SIZE + EDGE_THICK / 2}px)`, width: SIZE - CORNER_SIZE * 2, height: EDGE_THICK },
    { key: "Bottom-Front", transform: `rotateY(0deg) translateZ(${HALF_SIZE}px) translateY(${HALF_SIZE - EDGE_THICK / 2}px)`, width: SIZE - CORNER_SIZE * 2, height: EDGE_THICK },
    { key: "Front-Right",  transform: `rotateY(0deg) translateZ(${HALF_SIZE}px) translateX(${HALF_SIZE - EDGE_THICK / 2}px)`, width: EDGE_THICK, height: SIZE - CORNER_SIZE * 2 },
    { key: "Front-Left",   transform: `rotateY(0deg) translateZ(${HALF_SIZE}px) translateX(${-HALF_SIZE + EDGE_THICK / 2}px)`, width: EDGE_THICK, height: SIZE - CORNER_SIZE * 2 },
    // Back face edges
    { key: "Top-Back",     transform: `rotateY(180deg) translateZ(${HALF_SIZE}px) translateY(${-HALF_SIZE + EDGE_THICK / 2}px)`, width: SIZE - CORNER_SIZE * 2, height: EDGE_THICK },
    { key: "Bottom-Back",  transform: `rotateY(180deg) translateZ(${HALF_SIZE}px) translateY(${HALF_SIZE - EDGE_THICK / 2}px)`, width: SIZE - CORNER_SIZE * 2, height: EDGE_THICK },
    { key: "Back-Right",   transform: `rotateY(180deg) translateZ(${HALF_SIZE}px) translateX(${HALF_SIZE - EDGE_THICK / 2}px)`, width: EDGE_THICK, height: SIZE - CORNER_SIZE * 2 },
    { key: "Back-Left",    transform: `rotateY(180deg) translateZ(${HALF_SIZE}px) translateX(${-HALF_SIZE + EDGE_THICK / 2}px)`, width: EDGE_THICK, height: SIZE - CORNER_SIZE * 2 },
    // Top face side edges
    { key: "Top-Right",    transform: `rotateX(90deg) translateZ(${HALF_SIZE}px) translateX(${HALF_SIZE - EDGE_THICK / 2}px)`, width: EDGE_THICK, height: SIZE - CORNER_SIZE * 2 },
    { key: "Top-Left",     transform: `rotateX(90deg) translateZ(${HALF_SIZE}px) translateX(${-HALF_SIZE + EDGE_THICK / 2}px)`, width: EDGE_THICK, height: SIZE - CORNER_SIZE * 2 },
    // Bottom face side edges
    { key: "Bottom-Right", transform: `rotateX(-90deg) translateZ(${HALF_SIZE}px) translateX(${HALF_SIZE - EDGE_THICK / 2}px)`, width: EDGE_THICK, height: SIZE - CORNER_SIZE * 2 },
    { key: "Bottom-Left",  transform: `rotateX(-90deg) translateZ(${HALF_SIZE}px) translateX(${-HALF_SIZE + EDGE_THICK / 2}px)`, width: EDGE_THICK, height: SIZE - CORNER_SIZE * 2 },
  ];

  // Axis line endpoints (XYZ in CSS 3D space, same rotation as cube)
  const AXIS_LEN = SIZE * 0.7;
  const axisLines = [
    { label: "X", color: "#ef4444", dx: AXIS_LEN, dy: 0, dz: 0 },   // red
    { label: "Y", color: "#22c55e", dx: 0, dy: -AXIS_LEN, dz: 0 },  // green (up)
    { label: "Z", color: "#3b82f6", dx: 0, dy: 0, dz: AXIS_LEN },   // blue
  ];

  return (
    <div
      className="absolute bottom-16 right-16 z-10 select-none"
      style={{ width: SIZE + 40, height: SIZE + 40 }}
      title="ViewCube"
    >
      {/* XYZ Axis Gizmo — rendered behind/below the cube */}
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 20,
          width: SIZE,
          height: SIZE,
          perspective: 250,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: SIZE,
            height: SIZE,
            position: "relative",
            transformStyle: "preserve-3d",
            transform: `rotateX(${angles.rx}deg) rotateY(${angles.ry}deg)`,
            transition: "transform 0.05s linear",
          }}
        >
          {axisLines.map((axis) => {
            // Line from center to endpoint using a thin rotated div
            const len = Math.sqrt(axis.dx ** 2 + axis.dy ** 2 + axis.dz ** 2);
            return (
              <div key={axis.label}>
                {/* Axis line */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 2,
                    height: len,
                    background: axis.color,
                    transformOrigin: "top center",
                    transform: `translate(-50%, 0) translate3d(${axis.dx / 2}px, ${axis.dy / 2}px, ${axis.dz / 2}px)`,
                    opacity: 0.8,
                  }}
                />
                {/* Axis label ball */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: axis.color,
                    transform: `translate(-50%, -50%) translate3d(${axis.dx}px, ${axis.dy}px, ${axis.dz}px)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {axis.label}
                </div>
              </div>
            );
          })}
          {/* Center dot */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#888",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>

      {/* ViewCube */}
      <div style={{ position: "absolute", left: 20, top: 20, width: SIZE, height: SIZE, perspective: 250 }}>
      <div
        style={{
          width: SIZE,
          height: SIZE,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(${angles.rx}deg) rotateY(${angles.ry}deg)`,
          transition: "transform 0.05s linear",
        }}
      >
        {/* Faces */}
        {faces.map((face) => {
          const isHovered = hoveredFace === face.label;
          return (
            <div
              key={face.label}
              onClick={() => {
                const preset = FACE_PRESETS[face.label];
                if (preset) applyPreset(preset.position);
              }}
              onMouseEnter={() => setHoveredFace(face.label)}
              onMouseLeave={() => setHoveredFace(null)}
              style={{
                position: "absolute",
                width: SIZE,
                height: SIZE,
                transform: face.transform,
                backfaceVisibility: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: isHovered ? "#ffffff" : "#b0b0b8",
                background: isHovered
                  ? "rgba(79, 70, 229, 0.55)"
                  : "rgba(35, 35, 42, 0.82)",
                border: "1px solid rgba(100, 100, 115, 0.45)",
                cursor: "pointer",
                userSelect: "none",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {face.label}
            </div>
          );
        })}

        {/* Edge hit-zones (invisible unless hovered) */}
        {edges.map((edge) => {
          const isHovered = hoveredFace === edge.key;
          return (
            <div
              key={edge.key}
              onClick={(e) => {
                e.stopPropagation();
                const preset = EDGE_PRESETS[edge.key];
                if (preset) applyPreset(preset.position);
              }}
              onMouseEnter={() => setHoveredFace(edge.key)}
              onMouseLeave={() => setHoveredFace(null)}
              style={{
                position: "absolute",
                width: edge.width,
                height: edge.height,
                transform: edge.transform,
                backfaceVisibility: "hidden",
                background: isHovered
                  ? "rgba(99, 102, 241, 0.7)"
                  : "transparent",
                borderRadius: 2,
                cursor: "pointer",
                zIndex: 2,
                transition: "background 0.15s",
              }}
              title={edge.key}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
}
