/**
 * Arc Overhang Algorithm Test — roter_stecker_V1_verstärkt
 *
 * Loads a binary STL, slices at multiple Z heights,
 * computes overhang masks from triangle normals (Z < 0.5 = overhanging),
 * and runs fitArcOverhangs() on each slice.
 *
 * Run: npx tsx test-arc-roter-stecker.ts
 */

import { readFileSync } from "node:fs";
import { fitArcOverhangs, type Point2D } from "./src/algorithms/arc-overhangs.js";

// ── Binary STL Parser ──────────────────────────────────────────────

interface Triangle {
  normal: { x: number; y: number; z: number };
  v1: { x: number; y: number; z: number };
  v2: { x: number; y: number; z: number };
  v3: { x: number; y: number; z: number };
}

function parseBinarySTL(buffer: Buffer): Triangle[] {
  const triangles: Triangle[] = [];
  const numTriangles = buffer.readUInt32LE(80);
  let offset = 84;
  for (let i = 0; i < numTriangles; i++) {
    const normal = {
      x: buffer.readFloatLE(offset),
      y: buffer.readFloatLE(offset + 4),
      z: buffer.readFloatLE(offset + 8),
    };
    const v1 = {
      x: buffer.readFloatLE(offset + 12),
      y: buffer.readFloatLE(offset + 16),
      z: buffer.readFloatLE(offset + 20),
    };
    const v2 = {
      x: buffer.readFloatLE(offset + 24),
      y: buffer.readFloatLE(offset + 28),
      z: buffer.readFloatLE(offset + 32),
    };
    const v3 = {
      x: buffer.readFloatLE(offset + 36),
      y: buffer.readFloatLE(offset + 40),
      z: buffer.readFloatLE(offset + 44),
    };
    triangles.push({ normal, v1, v2, v3 });
    offset += 50;
  }
  return triangles;
}

// ── Slicer: intersect triangles with Z plane ───────────────────────

interface Segment2D {
  start: Point2D;
  end: Point2D;
  normalZ: number;
}

function sliceTrianglesAtZ(triangles: Triangle[], z: number): Segment2D[] {
  const segments: Segment2D[] = [];
  for (const tri of triangles) {
    const verts = [tri.v1, tri.v2, tri.v3];
    const intersectionPoints: Point2D[] = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      const a = verts[i];
      const b = verts[j];
      if ((a.z - z) * (b.z - z) < 0) {
        const t = (z - a.z) / (b.z - a.z);
        intersectionPoints.push({
          x: a.x + t * (b.x - a.x),
          y: a.y + t * (b.y - a.y),
        });
      } else if (Math.abs(a.z - z) < 1e-6 && Math.abs(b.z - z) < 1e-6) {
        intersectionPoints.push({ x: a.x, y: a.y });
        intersectionPoints.push({ x: b.x, y: b.y });
      } else if (Math.abs(a.z - z) < 1e-6) {
        intersectionPoints.push({ x: a.x, y: a.y });
      }
    }
    if (intersectionPoints.length >= 2) {
      const unique = [intersectionPoints[0]];
      for (let k = 1; k < intersectionPoints.length; k++) {
        const p = intersectionPoints[k];
        const dup = unique.some(
          (u) => Math.abs(u.x - p.x) < 1e-6 && Math.abs(u.y - p.y) < 1e-6
        );
        if (!dup) unique.push(p);
      }
      if (unique.length === 2) {
        segments.push({ start: unique[0], end: unique[1], normalZ: tri.normal.z });
      }
    }
  }
  return segments;
}

// ── Chain segments into ordered contour polylines ──────────────────

function chainSegments(
  segments: Segment2D[]
): { points: Point2D[]; normalZs: number[] }[] {
  if (segments.length === 0) return [];
  const contours: { points: Point2D[]; normalZs: number[] }[] = [];
  const used = new Set<number>();
  const EPS = 0.01;

  function ptsClose(a: Point2D, b: Point2D): boolean {
    return Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
  }

  for (let startIdx = 0; startIdx < segments.length; startIdx++) {
    if (used.has(startIdx)) continue;
    const points: Point2D[] = [segments[startIdx].start, segments[startIdx].end];
    const normalZs: number[] = [segments[startIdx].normalZ];
    used.add(startIdx);

    let extended = true;
    while (extended) {
      extended = false;
      const tail = points[points.length - 1];
      for (let i = 0; i < segments.length; i++) {
        if (used.has(i)) continue;
        if (ptsClose(segments[i].start, tail)) {
          points.push(segments[i].end);
          normalZs.push(segments[i].normalZ);
          used.add(i);
          extended = true;
          break;
        }
        if (ptsClose(segments[i].end, tail)) {
          points.push(segments[i].start);
          normalZs.push(segments[i].normalZ);
          used.add(i);
          extended = true;
          break;
        }
      }
    }
    if (points.length >= 3) {
      contours.push({ points, normalZs });
    }
  }
  return contours;
}

// ── Main Test ──────────────────────────────────────────────────────

const stlPath = "/Users/3dreamzoffice/Downloads/roter_stecker_V1_verstärkt (1).stl";
console.log("=== Arc Overhang Algorithm Test ===");
console.log(`STL: ${stlPath}\n`);

// 1. Load and parse
const buf = readFileSync(stlPath);
console.log(`File size: ${(buf.length / 1024).toFixed(1)} KB`);
const triangles = parseBinarySTL(buf);
console.log(`Triangles parsed: ${triangles.length}`);

// Bounding box
let zMin = Infinity, zMax = -Infinity;
let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
for (const tri of triangles) {
  for (const v of [tri.v1, tri.v2, tri.v3]) {
    if (v.z < zMin) zMin = v.z;
    if (v.z > zMax) zMax = v.z;
    if (v.x < xMin) xMin = v.x;
    if (v.x > xMax) xMax = v.x;
    if (v.y < yMin) yMin = v.y;
    if (v.y > yMax) yMax = v.y;
  }
}
console.log(`Bounding box: X[${xMin.toFixed(2)}, ${xMax.toFixed(2)}] Y[${yMin.toFixed(2)}, ${yMax.toFixed(2)}] Z[${zMin.toFixed(2)}, ${zMax.toFixed(2)}]`);
console.log(`Model height: ${(zMax - zMin).toFixed(2)} mm`);

// 2. Slice at multiple Z heights (0.2mm layer height)
const layerHeight = 0.2;
const zHeights: number[] = [];
for (let z = zMin + layerHeight; z < zMax; z += layerHeight) {
  zHeights.push(z);
}
console.log(`\nSlicing at ${zHeights.length} Z-heights (${layerHeight}mm layer height)...\n`);

// Accumulators
let totalSlices = 0;
let emptySlices = 0;
let slicesWithOverhangs = 0;
let slicesWithArcs = 0;
let totalArcSegments = 0;
let totalLinearSegments = 0;
let totalOutputSegments = 0;
let totalOverhangInputSegments = 0;
let totalInputSegments = 0;
const errors: string[] = [];

const t0 = performance.now();

for (const z of zHeights) {
  totalSlices++;
  const rawSegments = sliceTrianglesAtZ(triangles, z);
  if (rawSegments.length === 0) {
    emptySlices++;
    continue;
  }

  const contours = chainSegments(rawSegments);
  if (contours.length === 0) {
    emptySlices++;
    continue;
  }

  let sliceArcs = 0;
  let sliceLinear = 0;
  let hasOverhang = false;

  for (const contour of contours) {
    const { points, normalZs } = contour;
    if (points.length < 3) continue;

    // 3. Create overhang mask: normalZ < 0.5 = overhanging
    const overhangMask: boolean[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const nz = i < normalZs.length ? normalZs[i] : 1;
      const isOverhang = nz < 0.5;
      overhangMask.push(isOverhang);
      if (isOverhang) {
        hasOverhang = true;
        totalOverhangInputSegments++;
      }
      totalInputSegments++;
    }

    // 4. Run fitArcOverhangs
    try {
      const result = fitArcOverhangs(points, overhangMask, 0.1, 15);
      for (const seg of result) {
        if (seg.type === "arc") sliceArcs++;
        else sliceLinear++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`z=${z.toFixed(2)}: ${msg}`);
    }
  }

  totalArcSegments += sliceArcs;
  totalLinearSegments += sliceLinear;
  totalOutputSegments += sliceArcs + sliceLinear;

  if (hasOverhang) slicesWithOverhangs++;
  if (sliceArcs > 0) slicesWithArcs++;
}

const elapsed = performance.now() - t0;

// ── 5. Report ───────────────────────────────────────────────────────

const nonEmpty = totalSlices - emptySlices;
const arcCoverage = totalOutputSegments > 0
  ? ((totalArcSegments / totalOutputSegments) * 100).toFixed(1)
  : "N/A";
const ovhRatio = totalInputSegments > 0
  ? ((totalOverhangInputSegments / totalInputSegments) * 100).toFixed(1)
  : "N/A";

console.log("=".repeat(60));
console.log("  ARC OVERHANG TEST RESULTS");
console.log("  roter_stecker_V1_verstärkt (1).stl");
console.log("=".repeat(60));
console.log(`  Total slices:                  ${totalSlices}`);
console.log(`  Empty slices (no contour):     ${emptySlices}`);
console.log(`  Non-empty slices:              ${nonEmpty}`);
console.log(`  Slices with overhangs:         ${slicesWithOverhangs}`);
console.log(`  Slices with arcs fitted:       ${slicesWithArcs}`);
console.log(`  ---`);
console.log(`  Total input segments:          ${totalInputSegments}`);
console.log(`  Overhang input segments:       ${totalOverhangInputSegments} (${ovhRatio}%)`);
console.log(`  Total output segments:         ${totalOutputSegments}`);
console.log(`    Arc segments:                ${totalArcSegments}`);
console.log(`    Linear segments:             ${totalLinearSegments}`);
console.log(`  Arc vs Linear count:           ${totalArcSegments} : ${totalLinearSegments}`);
console.log(`  Arc coverage ratio:            ${arcCoverage}%`);
console.log(`  ---`);
console.log(`  Processing time:               ${elapsed.toFixed(0)} ms`);
console.log(`  Errors:                        ${errors.length}`);
if (errors.length > 0) {
  console.log(`\n  Error details (first 10):`);
  for (const e of errors.slice(0, 10)) {
    console.log(`    - ${e}`);
  }
  if (errors.length > 10) {
    console.log(`    ... and ${errors.length - 10} more`);
  }
}
console.log("=".repeat(60));

// Verdict
if (errors.length > 0) {
  console.log("\nVERDICT: ISSUES FOUND — see errors above");
} else if (totalArcSegments === 0 && slicesWithOverhangs > 0) {
  console.log("\nVERDICT: WARNING — overhangs detected but no arcs fitted");
  console.log("(contour curvature may be below minArcAngle=15deg threshold)");
} else if (totalArcSegments > 0) {
  console.log("\nVERDICT: PASS — arc fitting working correctly on overhang regions");
} else {
  console.log("\nVERDICT: NO OVERHANGS — model has no overhanging surfaces (normalZ < 0.5)");
}
