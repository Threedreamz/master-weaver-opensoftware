/**
 * opencad — draft (face-taper) operation.
 *
 * Per-vertex mesh taper: vertices on the drafted side of the `neutralValue`
 * plane (measured along `pullAxis`) are contracted inward toward the
 * bounding-box-center axis by `|delta| * tan(angleRad)`, where `delta` is
 * the signed distance from the neutral plane along the pull axis.
 *
 * This is a pure-mesh approximation — real Fusion-360-grade draft requires
 * a BREP kernel (replicad / OCCT) with per-face neutral edges. See
 * `cad-kernel.ts` — when the kernel is upgraded, this op should delegate
 * to the BREP implementation and the public signature stays compatible.
 *
 * Units: millimeters. Angle input is degrees.
 */
import * as THREE from "three";
import { type SolidResult, exportBoundingBox, computeVolumeMm3 } from "../cad-kernel";

export interface DraftOptions {
  /** Pull axis — the "stroke" direction of the draft. Default "z". */
  pullAxis?: "x" | "y" | "z";
  /** Which side of the neutral plane to draft. Default "positive". */
  direction?: "positive" | "negative";
}

/**
 * Apply a face-taper draft to a geometry.
 *
 * @param geom         input geometry (NOT mutated — cloned internally)
 * @param neutralValue value along `pullAxis` that defines the unchanged plane
 * @param angleDeg     draft angle in degrees; |angleDeg| must be < 60
 * @param options      pullAxis + direction
 *
 * @throws if |angleDeg| >= 60 (unrealistic mold-draft angle)
 * @returns cloned geometry with tapered vertices, bbox + volume recomputed
 */
export function draft(
  geom: THREE.BufferGeometry,
  neutralValue: number,
  angleDeg: number,
  options: DraftOptions = {},
): SolidResult {
  const pullAxis = options.pullAxis ?? "z";
  const direction = options.direction ?? "positive";

  if (Math.abs(angleDeg) >= 60) {
    throw new Error(
      `draft: angleDeg ${angleDeg} unrealistic (|angle| must be < 60)`,
    );
  }
  if (angleDeg === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      "[opencad:draft] angleDeg=0 — no-op, returning unchanged geometry",
    );
    const unchanged = geom.clone();
    unchanged.computeVertexNormals();
    return {
      mesh: unchanged,
      bbox: exportBoundingBox(unchanged),
      volumeMm3: computeVolumeMm3(unchanged),
    };
  }

  const angleRad = (angleDeg * Math.PI) / 180;
  const tanA = Math.tan(angleRad);

  const out = geom.clone();
  const pos = out.getAttribute("position") as THREE.BufferAttribute | undefined;
  if (!pos) throw new Error("draft: geometry has no position attribute");

  // Reference centerline: bbox center projected onto plane perpendicular to pullAxis.
  out.computeBoundingBox();
  const bb = out.boundingBox ?? new THREE.Box3();
  const center = new THREE.Vector3();
  bb.getCenter(center);

  const axisIdx: Record<"x" | "y" | "z", 0 | 1 | 2> = { x: 0, y: 1, z: 2 };
  const pa = axisIdx[pullAxis];
  const perp: (0 | 1 | 2)[] = ([0, 1, 2] as const).filter(
    (i) => i !== pa,
  ) as (0 | 1 | 2)[];

  const centerArr: [number, number, number] = [center.x, center.y, center.z];

  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const axialVal = v.getComponent(pa);
    const delta = axialVal - neutralValue;

    // Gate by direction: only taper vertices on the selected side of neutral.
    if (direction === "positive" && delta <= 0) continue;
    if (direction === "negative" && delta >= 0) continue;

    const taperAmount = Math.abs(delta) * tanA; // inward distance (mm), always >= 0 when |angle| < 60

    // Contract perpendicular components toward the bbox-center axis.
    for (const k of perp) {
      const cur = v.getComponent(k);
      const centerK = centerArr[k];
      const diff = cur - centerK;
      if (diff === 0) continue;
      const magnitude = Math.abs(diff);
      // Clamp the step so a vertex never crosses the axis (prevents inverted geometry).
      const step = Math.min(taperAmount, magnitude);
      const sign = Math.sign(diff);
      v.setComponent(k, cur - sign * step);
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  pos.needsUpdate = true;
  out.computeVertexNormals();
  out.computeBoundingBox();

  return {
    mesh: out,
    bbox: exportBoundingBox(out),
    volumeMm3: computeVolumeMm3(out),
  };
}
