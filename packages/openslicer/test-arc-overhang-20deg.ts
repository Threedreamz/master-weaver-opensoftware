/**
 * Arc Overhang Algorithm Test — OverhangingAngleTest_20Deg.stl
 *
 * 1. Parse binary STL (read file, extract triangles with normals)
 * 2. Slice at 0.2mm layer height across Z range
 * 3. For each slice contour, build overhangMask (normal Z < 0.5)
 * 4. Run fitArcOverhangs() from ./src/algorithms/arc-overhangs.ts
 * 5. Report: triangles, slices, arc count, linear count, arc coverage %, errors
 *
 * Run: npx tsx test-arc-overhang-20deg.ts
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
        segments.push({
          start: unique[0],
          end: unique[1],
          normalZ: tri.normal.z,
        });
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

const LAYER_HEIGHT = 0.2; // mm
const stlPath = "/tmp/thingiverse-arc-tests/10-cura-overhanging-wall/files/OverhangingAngleTest_20Deg.stl";

console.log(`Loading: ${stlPath}`);
const buf = readFileSync(stlPath);
console.log(`File size: ${(buf.length / 1024).toFixed(1)} KB`);

const triangles = parseBinarySTL(buf);
console.log(`Triangles: ${triangles.length}`);

// Find bounding box
let zMin = Infinity, zMax = -Infinity;
let xMin = Infinity, xMax = -Infinity;
let yMin = Infinity, yMax = -Infinity;
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
console.log(`Bounding box:`);
console.log(`  X: ${xMin.toFixed(2)} — ${xMax.toFixed(2)} (${(xMax - xMin).toFixed(2)} mm)`);
console.log(`  Y: ${yMin.toFixed(2)} — ${yMax.toFixed(2)} (${(yMax - yMin).toFixed(2)} mm)`);
console.log(`  Z: ${zMin.toFixed(2)} — ${zMax.toFixed(2)} (${(zMax - zMin).toFixed(2)} mm)`);

// Compute slice heights at 0.2mm layer height
const zHeights: number[] = [];
for (let z = zMin + LAYER_HEIGHT; z < zMax; z += LAYER_HEIGHT) {
  zHeights.push(z);
}
console.log(`\nSlicing at ${LAYER_HEIGHT}mm layer height → ${zHeights.length} slices\n`);

// Accumulators
let totalSlices = 0;
let slicesWithOverhangs = 0;
let slicesWithArcs = 0;
let totalArcSegments = 0;
let totalLinearSegments = 0;
let totalOutputSegments = 0;
let totalOverhangInputSegments = 0;
let totalInputSegments = 0;
const errors: string[] = [];
const timings: number[] = [];

console.log(
  "Z(mm)".padEnd(10) +
  "Contours".padEnd(10) +
  "OvhSeg".padEnd(8) +
  "Ovh%".padEnd(8) +
  "Arcs".padEnd(8) +
  "Linear".padEnd(8) +
  "ArcRatio".padEnd(10) +
  "Time(ms)".padEnd(10)
);
console.log("-".repeat(72));

for (const z of zHeights) {
  totalSlices++;
  const rawSegments = sliceTrianglesAtZ(triangles, z);
  if (rawSegments.length === 0) continue;

  const contours = chainSegments(rawSegments);

  let sliceArcs = 0;
  let sliceLinear = 0;
  let sliceOverhangInput = 0;
  let sliceTotalInput = 0;
  let hasOverhang = false;

  const t0 = performance.now();

  for (const contour of contours) {
    const { points, normalZs } = contour;
    if (points.length < 3) continue;

    // Build overhang mask: normalZ < 0.5 means overhanging
    const overhangMask: boolean[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const nz = i < normalZs.length ? normalZs[i] : 1;
      const isOverhang = nz < 0.5;
      overhangMask.push(isOverhang);
      if (isOverhang) {
        hasOverhang = true;
        sliceOverhangInput++;
      }
      sliceTotalInput++;
    }

    try {
      const result = fitArcOverhangs(points, overhangMask, 0.1, 15);
      for (const seg of result) {
        if (seg.type === "arc") sliceArcs++;
        else sliceLinear++;
      }
    } catch (err: any) {
      errors.push(`z=${z.toFixed(2)}: ${err.message}`);
    }
  }

  const elapsed = performance.now() - t0;
  timings.push(elapsed);

  totalArcSegments += sliceArcs;
  totalLinearSegments += sliceLinear;
  totalOutputSegments += sliceArcs + sliceLinear;
  totalOverhangInputSegments += sliceOverhangInput;
  totalInputSegments += sliceTotalInput;

  if (hasOverhang) slicesWithOverhangs++;
  if (sliceArcs > 0) slicesWithArcs++;

  const ovhPct = sliceTotalInput > 0
    ? ((sliceOverhangInput / sliceTotalInput) * 100).toFixed(1)
    : "0.0";
  const arcRatio = (sliceArcs + sliceLinear) > 0
    ? ((sliceArcs / (sliceArcs + sliceLinear)) * 100).toFixed(1) + "%"
    : "N/A";

  console.log(
    z.toFixed(2).padEnd(10) +
    contours.length.toString().padEnd(10) +
    sliceOverhangInput.toString().padEnd(8) +
    (ovhPct + "%").padEnd(8) +
    sliceArcs.toString().padEnd(8) +
    sliceLinear.toString().padEnd(8) +
    arcRatio.padEnd(10) +
    elapsed.toFixed(1).padEnd(10)
  );
}

// ── Summary ──────────────────────────────────────────────────────────

const avgTime = timings.length > 0
  ? (timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(1)
  : "N/A";
const maxTime = timings.length > 0 ? Math.max(...timings).toFixed(1) : "N/A";

console.log("\n" + "=".repeat(72));
console.log("  ARC OVERHANG TEST — OverhangingAngleTest_20Deg.stl");
console.log("=".repeat(72));
console.log(`  Triangles:                     ${triangles.length}`);
console.log(`  Total slices (0.2mm):          ${totalSlices}`);
console.log(`  Slices with overhangs:         ${slicesWithOverhangs}`);
console.log(`  Slices with arcs fitted:       ${slicesWithArcs}`);
console.log(`  Total input segments:          ${totalInputSegments}`);
console.log(`  Overhang input segments:       ${totalOverhangInputSegments}`);
console.log(`  Total output segments:         ${totalOutputSegments}`);
console.log(`    Arc segments:                ${totalArcSegments}`);
console.log(`    Linear segments:             ${totalLinearSegments}`);

const arcCoverage = totalOutputSegments > 0
  ? ((totalArcSegments / totalOutputSegments) * 100).toFixed(1)
  : "N/A";
const ovhRatio = totalInputSegments > 0
  ? ((totalOverhangInputSegments / totalInputSegments) * 100).toFixed(1)
  : "N/A";

console.log(`  Arc coverage (of output):      ${arcCoverage}%`);
console.log(`  Overhang ratio (of input):     ${ovhRatio}%`);
console.log(`  Avg slice time:                ${avgTime} ms`);
console.log(`  Max slice time:                ${maxTime} ms`);
console.log(`  Errors:                        ${errors.length}`);

if (errors.length > 0) {
  console.log("\n  Error details (first 10):");
  for (const e of errors.slice(0, 10)) {
    console.log(`    - ${e}`);
  }
}

console.log("=".repeat(72));

// Verdict
if (errors.length > 0) {
  console.log("\n  VERDICT: ISSUES FOUND — see errors above");
} else if (totalArcSegments === 0 && slicesWithOverhangs > 0) {
  console.log("\n  VERDICT: WARNING — overhangs detected but no arcs fitted");
  console.log("  (contour curvature may be below minArcAngle=15 deg threshold)");
} else if (totalArcSegments > 0) {
  console.log(`\n  VERDICT: PASS — ${totalArcSegments} arc segments fitted across ${slicesWithArcs} slices`);
} else {
  console.log("\n  VERDICT: NO OVERHANGS — model is fully self-supporting");
}
