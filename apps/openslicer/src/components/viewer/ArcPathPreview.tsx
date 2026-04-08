"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { ArcPath, ArcSegment } from "@opensoftware/slicer-core";

const ARC_COLOR = new THREE.Color("#22d3ee");
const LINE_COLOR = new THREE.Color("#71717a");
const ARC_INTERPOLATION_STEPS = 16;

interface ArcPathPreviewProps {
  arcPaths: ArcPath[];
  visible: boolean;
}

/**
 * Interpolate an arc segment into a series of points for rendering.
 */
function arcSegmentToPoints(
  seg: ArcSegment,
  z: number
): THREE.Vector3[] {
  if (seg.type === "line") {
    return [
      new THREE.Vector3(seg.start[0], seg.start[1], z),
      new THREE.Vector3(seg.end[0], seg.end[1], z),
    ];
  }

  // Arc segment — interpolate along the arc
  if (!seg.center || !seg.radius) {
    return [
      new THREE.Vector3(seg.start[0], seg.start[1], z),
      new THREE.Vector3(seg.end[0], seg.end[1], z),
    ];
  }

  const cx = seg.center[0];
  const cy = seg.center[1];
  const startAngle = Math.atan2(seg.start[1] - cy, seg.start[0] - cx);
  let endAngle = Math.atan2(seg.end[1] - cy, seg.end[0] - cx);

  // Handle winding direction
  if (seg.clockwise) {
    if (endAngle >= startAngle) endAngle -= 2 * Math.PI;
  } else {
    if (endAngle <= startAngle) endAngle += 2 * Math.PI;
  }

  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= ARC_INTERPOLATION_STEPS; i++) {
    const t = i / ARC_INTERPOLATION_STEPS;
    const angle = startAngle + t * (endAngle - startAngle);
    const x = cx + seg.radius * Math.cos(angle);
    const y = cy + seg.radius * Math.sin(angle);
    points.push(new THREE.Vector3(x, y, z));
  }

  return points;
}

export function ArcPathPreview({ arcPaths, visible }: ArcPathPreviewProps) {
  const { arcLines, lineLines } = useMemo(() => {
    const arcPoints: THREE.Vector3[] = [];
    const linePoints: THREE.Vector3[] = [];

    for (const path of arcPaths) {
      for (const seg of path.segments) {
        const pts = arcSegmentToPoints(seg, path.layerZ);
        if (seg.type === "arc") {
          // Add pairs of points for line segments rendering
          for (let i = 0; i < pts.length - 1; i++) {
            arcPoints.push(pts[i], pts[i + 1]);
          }
        } else {
          for (let i = 0; i < pts.length - 1; i++) {
            linePoints.push(pts[i], pts[i + 1]);
          }
        }
      }
    }

    const arcGeo = new THREE.BufferGeometry();
    if (arcPoints.length > 0) {
      arcGeo.setFromPoints(arcPoints);
    }

    const lineGeo = new THREE.BufferGeometry();
    if (linePoints.length > 0) {
      lineGeo.setFromPoints(linePoints);
    }

    return { arcLines: arcGeo, lineLines: lineGeo };
  }, [arcPaths]);

  if (!visible) return null;

  return (
    <group>
      {arcLines.getAttribute("position") && (
        <lineSegments geometry={arcLines} renderOrder={2}>
          <lineBasicMaterial
            color={ARC_COLOR}
            linewidth={1}
            transparent
            opacity={0.85}
          />
        </lineSegments>
      )}
      {lineLines.getAttribute("position") && (
        <lineSegments geometry={lineLines} renderOrder={2}>
          <lineBasicMaterial
            color={LINE_COLOR}
            linewidth={1}
            transparent
            opacity={0.6}
          />
        </lineSegments>
      )}
    </group>
  );
}
