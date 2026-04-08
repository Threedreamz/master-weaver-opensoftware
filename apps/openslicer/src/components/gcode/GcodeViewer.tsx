"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ToolpathData, ToolpathSegment } from "@opensoftware/slicer-core";
import { MOVE_TYPE_COLORS, SCALAR_GRADIENTS, type GcodeColorMode } from "../../lib/gcode-colors";
import type { GcodeVisibility } from "../../stores/slicer-store";

interface GcodeViewerProps {
  gcodeData: ToolpathData;
  currentLayer: number;
  colorMode: GcodeColorMode;
  visibility: GcodeVisibility;
  showRetractions: boolean;
}

/**
 * Compute min/max of a numeric field across extrusion segments for gradient mapping.
 */
function computeRange(segments: ToolpathSegment[], field: 'speed' | 'flowRate' | 'temperature') {
  let min = Infinity;
  let max = -Infinity;
  for (const seg of segments) {
    if (seg.type !== "extrude") continue;
    const val = seg[field];
    if (val < min) min = val;
    if (val > max) max = val;
  }
  if (min === Infinity) min = 0;
  if (max === -Infinity) max = 1;
  if (min === max) max = min + 1;
  return { min, max };
}

/**
 * Get the color for a segment based on the active color mode.
 */
function getSegmentColor(
  seg: ToolpathSegment,
  colorMode: GcodeColorMode,
  range: { min: number; max: number },
  colorLow: THREE.Color,
  colorHigh: THREE.Color,
  tmpColor: THREE.Color,
): THREE.Color {
  if (colorMode === 'type') {
    const hex = MOVE_TYPE_COLORS[seg.moveType] ?? MOVE_TYPE_COLORS.custom;
    tmpColor.set(hex);
    return tmpColor;
  }

  // Scalar gradient modes
  const fieldMap: Record<Exclude<GcodeColorMode, 'type'>, 'speed' | 'flowRate' | 'temperature'> = {
    speed: 'speed',
    flowRate: 'flowRate',
    temperature: 'temperature',
  };
  const val = seg[fieldMap[colorMode]];
  const t = Math.max(0, Math.min(1, (val - range.min) / (range.max - range.min)));
  tmpColor.copy(colorLow).lerp(colorHigh, t);
  return tmpColor;
}

/**
 * R3F component that renders G-code toolpath line segments.
 * Supports color-by-type (Bambu/OrcaSlicer style), speed, flow rate, and temperature gradients.
 * Renders retraction markers as small red spheres.
 * Must be used inside a Canvas context.
 *
 * Layer clipping: uses useEffect to imperatively update geometry when currentLayer
 * changes, ensuring Three.js picks up the new buffer data reliably.
 */
export function GcodeViewer({
  gcodeData,
  currentLayer,
  colorMode,
  visibility,
  showRetractions,
}: GcodeViewerProps) {
  const extrudeRef = useRef<THREE.LineSegments>(null);
  const travelRef = useRef<THREE.LineSegments>(null);
  const extrudeGeoRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());
  const travelGeoRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());

  // Compute scalar range for gradient modes
  const scalarRange = useMemo(() => {
    if (colorMode === 'type') return { min: 0, max: 1 };
    const fieldMap: Record<Exclude<GcodeColorMode, 'type'>, 'speed' | 'flowRate' | 'temperature'> = {
      speed: 'speed',
      flowRate: 'flowRate',
      temperature: 'temperature',
    };
    return computeRange(gcodeData.segments, fieldMap[colorMode]);
  }, [gcodeData.segments, colorMode]);

  // Gradient endpoint colors for scalar modes
  const gradientColors = useMemo(() => {
    if (colorMode === 'type') return { low: new THREE.Color(), high: new THREE.Color() };
    const g = SCALAR_GRADIENTS[colorMode];
    return { low: new THREE.Color(g.low), high: new THREE.Color(g.high) };
  }, [colorMode]);

  // Update extrusion geometry imperatively when dependencies change
  useEffect(() => {
    const geo = extrudeGeoRef.current;
    const positions: number[] = [];
    const colors: number[] = [];
    const tmpColor = new THREE.Color();

    for (const seg of gcodeData.segments) {
      if (seg.type !== "extrude") continue;
      // Layer clipping: only render segments at or below currentLayer
      if (seg.layer > currentLayer) continue;
      // Visibility filtering by move type
      if (!visibility[seg.moveType]) continue;

      positions.push(seg.start[0], seg.start[2], seg.start[1]);
      positions.push(seg.end[0], seg.end[2], seg.end[1]);

      getSegmentColor(seg, colorMode, scalarRange, gradientColors.low, gradientColors.high, tmpColor);
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
      colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
    }

    // Dispose old attributes and set new ones
    geo.deleteAttribute("position");
    geo.deleteAttribute("color");

    if (positions.length > 0) {
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    }

    geo.computeBoundingSphere();

    // Force the LineSegments to pick up the updated geometry
    if (extrudeRef.current) {
      extrudeRef.current.geometry = geo;
    }
  }, [gcodeData.segments, currentLayer, colorMode, scalarRange, gradientColors, visibility]);

  // Update travel geometry imperatively when dependencies change
  useEffect(() => {
    const geo = travelGeoRef.current;

    geo.deleteAttribute("position");
    geo.deleteAttribute("color");

    if (!visibility.travel) {
      geo.computeBoundingSphere();
      return;
    }

    const positions: number[] = [];
    const colors: number[] = [];
    const travelColor = new THREE.Color(MOVE_TYPE_COLORS.travel);

    for (const seg of gcodeData.segments) {
      if (seg.type !== "travel") continue;
      // Layer clipping
      if (seg.layer > currentLayer) continue;

      positions.push(seg.start[0], seg.start[2], seg.start[1]);
      positions.push(seg.end[0], seg.end[2], seg.end[1]);
      colors.push(travelColor.r, travelColor.g, travelColor.b);
      colors.push(travelColor.r, travelColor.g, travelColor.b);
    }

    if (positions.length > 0) {
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    }

    geo.computeBoundingSphere();

    if (travelRef.current) {
      travelRef.current.geometry = geo;
    }
  }, [gcodeData.segments, currentLayer, visibility.travel]);

  // Build retraction point markers
  const retractionPositions = useMemo(() => {
    if (!showRetractions) return [];

    const points: [number, number, number][] = [];
    for (const seg of gcodeData.segments) {
      if (!seg.retraction) continue;
      // Layer clipping
      if (seg.layer > currentLayer) continue;
      // Use the start position of the segment (where retraction occurred)
      points.push([seg.start[0], seg.start[2], seg.start[1]]);
    }
    return points;
  }, [gcodeData.segments, currentLayer, showRetractions]);

  // Retraction instanced mesh geometry
  const retractionMesh = useMemo(() => {
    if (retractionPositions.length === 0) return null;

    const dummy = new THREE.Object3D();
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.3, 6, 6),
      new THREE.MeshBasicMaterial({ color: '#EF4444' }),
      retractionPositions.length,
    );

    for (let i = 0; i < retractionPositions.length; i++) {
      const [px, py, pz] = retractionPositions[i];
      dummy.position.set(px, py, pz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }, [retractionPositions]);

  return (
    <group>
      {/* Extrusion lines with vertex colors — always mounted, geometry updated via useEffect */}
      <lineSegments ref={extrudeRef} geometry={extrudeGeoRef.current}>
        <lineBasicMaterial vertexColors />
      </lineSegments>

      {/* Travel lines (thin, semi-transparent) */}
      {visibility.travel && (
        <lineSegments ref={travelRef} geometry={travelGeoRef.current}>
          <lineBasicMaterial vertexColors transparent opacity={0.3} />
        </lineSegments>
      )}

      {/* Retraction markers (small red spheres) */}
      {showRetractions && retractionMesh && (
        <primitive object={retractionMesh} />
      )}
    </group>
  );
}
