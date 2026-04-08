/**
 * Arc Overhang Algorithm Test — armlehne_ohne_nummer.stl (armrest)
 */

import { readFileSync } from "node:fs";
import { fitArcOverhangs, type Point2D } from "./src/algorithms/arc-overhangs.js";

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

interface Segment2D {
  start: Point2D;
  end: Point2D;
  normalZ: number;
}

function sliceTrianglesAtZ(triangles: Triangle[], z: number): Segment2D[] {
  const segments: Segment2D[] = [];
  for (const tri of triangles) {
    const verts = [tri.v1, tri.v2, tri.v3];
    const pts: Point2D[] = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      const a = verts[i], b = verts[j];
      if ((a.z - z) * (b.z - z) < 0) {
        const t = (z - a.z) / (b.z - a.z);
        pts.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
      } else if (Math.abs(a.z - z) < 1e-6 && Math.abs(b.z - z) < 1e-6) {
        pts.push({ x: a.x, y: a.y });
        pts.push({ x: b.x, y: b.y });
      } else if (Math.abs(a.z - z) < 1e-6) {
        pts.push({ x: a.x, y: a.y });
      }
    }
    // Deduplicate
    const unique: Point2D[] = [];
    for (const p of pts) {
      if (!unique.some(u => Math.abs(u.x - p.x) < 1e-6 && Math.abs(u.y - p.y) < 1e-6)) {
        unique.push(p);
      }
    }
    if (unique.length === 2) {
      segments.push({ start: unique[0], end: unique[1], normalZ: tri.normal.z });
    }
  }
  return segments;
}

function chainSegments(segments: Segment2D[]): { points: Point2D[]; normalZs: number[] }[] {
  if (segments.length === 0) return [];
  const contours: { points: Point2D[]; normalZs: number[] }[] = [];
  const used = new Set<number>();
  const EPS = 0.01;

  function ptsClose(a: Point2D, b: Point2D): boolean {
    return Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;
  }

  for (let si = 0; si < segments.length; si++) {
    if (used.has(si)) continue;
    const points: Point2D[] = [segments[si].start, segments[si].end];
    const normalZs: number[] = [segments[si].normalZ];
    used.add(si);

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
    if (points.length >= 3) contours.push({ points, normalZs });
  }
  return contours;
}

// ── Main ──────────────────────────────────────────────────────────

const stlPath = "/Users/3dreamzoffice/Downloads/armlehne_ohne_nummer.stl";
console.log(`Loading STL: ${stlPath}`);
const buf = readFileSync(stlPath);
console.log(`File size: ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
const triangles = parseBinarySTL(buf);
console.log(`Triangles: ${triangles.length.toLocaleString()}`);

let zMin = Infinity, zMax = -Infinity;
for (const tri of triangles) {
  for (const v of [tri.v1, tri.v2, tri.v3]) {
    if (v.z < zMin) zMin = v.z;
    if (v.z > zMax) zMax = v.z;
  }
}
console.log(`Z range: ${zMin.toFixed(2)} - ${zMax.toFixed(2)} mm`);

const layerHeight = 0.2;
const totalPossible = Math.floor((zMax - zMin) / layerHeight);
const MAX_SLICES = 200;
const step = totalPossible > MAX_SLICES ? (zMax - zMin) / MAX_SLICES : layerHeight;

const zHeights: number[] = [];
for (let z = zMin + step; z < zMax; z += step) zHeights.push(z);
console.log(`Slicing ${zHeights.length} layers (step=${step.toFixed(2)}mm)\n`);

let totalSlices = 0;
let slicesWithOverhangs = 0;
let totalArcSegs = 0;
let totalLinearSegs = 0;
let totalOverhangInputSegs = 0;
const errors: string[] = [];
const t0 = Date.now();

for (const z of zHeights) {
  totalSlices++;
  const raw = sliceTrianglesAtZ(triangles, z);
  if (raw.length === 0) continue;

  const contours = chainSegments(raw);
  let sliceHasOverhang = false;

  for (const c of contours) {
    if (c.points.length < 3) continue;
    const mask: boolean[] = [];
    for (let i = 0; i < c.points.length - 1; i++) {
      const nz = i < c.normalZs.length ? c.normalZs[i] : 1;
      const oh = nz < 0.5;
      mask.push(oh);
      if (oh) { totalOverhangInputSegs++; sliceHasOverhang = true; }
    }

    try {
      const result = fitArcOverhangs(c.points, mask, 0.1, 15);
      for (const s of result) {
        if (s.type === "arc") totalArcSegs++;
        else totalLinearSegs++;
      }
    } catch (err: any) {
      errors.push(`z=${z.toFixed(2)}: ${err.message}`);
    }
  }
  if (sliceHasOverhang) slicesWithOverhangs++;

  if (totalSlices % 50 === 0) {
    process.stdout.write(`  processed ${totalSlices}/${zHeights.length} slices...\r`);
  }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
const totalOutput = totalArcSegs + totalLinearSegs;
const arcPct = totalOutput > 0 ? ((totalArcSegs / totalOutput) * 100).toFixed(1) : "N/A";
const ohPct = totalSlices > 0 ? ((slicesWithOverhangs / totalSlices) * 100).toFixed(1) : "0";

console.log("");
console.log("====================================================");
console.log("  ARC OVERHANG TEST REPORT");
console.log("  Model: armlehne_ohne_nummer.stl (armrest)");
console.log("====================================================");
console.log(`  File size:                ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
console.log(`  Triangles:                ${triangles.length.toLocaleString()}`);
console.log(`  Z range:                  ${zMin.toFixed(2)} - ${zMax.toFixed(2)} mm`);
console.log(`  Slice step:               ${step.toFixed(2)} mm`);
console.log(`  Processing time:          ${elapsed}s`);
console.log("----------------------------------------------------");
console.log(`  Total slices:             ${totalSlices}`);
console.log(`  Slices with overhangs:    ${slicesWithOverhangs} (${ohPct}%)`);
console.log("----------------------------------------------------");
console.log(`  Overhang input segments:  ${totalOverhangInputSegs.toLocaleString()}`);
console.log(`  Output arc segments:      ${totalArcSegs.toLocaleString()}`);
console.log(`  Output linear segments:   ${totalLinearSegs.toLocaleString()}`);
console.log(`  Arc coverage (of output): ${arcPct}%`);
console.log("----------------------------------------------------");
if (errors.length > 0) {
  console.log(`  ERRORS: ${errors.length}`);
  for (const e of errors.slice(0, 10)) console.log(`    - ${e}`);
} else {
  console.log(`  Errors: 0`);
}
console.log("====================================================");
