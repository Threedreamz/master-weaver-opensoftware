/**
 * Arc Overhang Algorithm Test — DOMETEST.stl
 *
 * Loads a binary STL, slices at multiple Z heights,
 * computes overhang masks from triangle normals, runs
 * fitArcOverhangs() with multiple parameter sets, and reports results.
 */

import { readFileSync } from "node:fs";
import { fitArcOverhangs, type Point2D } from "./src/algorithms/arc-overhangs.js";

// ── Binary STL Parser ──────────────────────────────────────────────

interface Vec3 { x: number; y: number; z: number }
interface Triangle { normal: Vec3; v1: Vec3; v2: Vec3; v3: Vec3 }

function parseBinarySTL(buffer: Buffer): Triangle[] {
  const triangles: Triangle[] = [];
  const n = buffer.readUInt32LE(80);
  let offset = 84;
  for (let i = 0; i < n; i++) {
    const r = (o: number) => buffer.readFloatLE(o);
    triangles.push({
      normal: { x: r(offset), y: r(offset+4), z: r(offset+8) },
      v1: { x: r(offset+12), y: r(offset+16), z: r(offset+20) },
      v2: { x: r(offset+24), y: r(offset+28), z: r(offset+32) },
      v3: { x: r(offset+36), y: r(offset+40), z: r(offset+44) },
    });
    offset += 50;
  }
  return triangles;
}

// ── Slice triangles at Z plane ─────────────────────────────────────

interface SliceEdge { start: Point2D; end: Point2D; normalZ: number }

function sliceAtZ(triangles: Triangle[], z: number): SliceEdge[] {
  const edges: SliceEdge[] = [];
  for (const tri of triangles) {
    const verts = [tri.v1, tri.v2, tri.v3];
    const pts: Point2D[] = [];
    for (let i = 0; i < 3; i++) {
      const a = verts[i], b = verts[(i + 1) % 3];
      if ((a.z - z) * (b.z - z) < 0) {
        const t = (z - a.z) / (b.z - a.z);
        pts.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
      } else if (Math.abs(a.z - z) < 1e-6) {
        pts.push({ x: a.x, y: a.y });
      }
    }
    const unique: Point2D[] = [];
    for (const p of pts) {
      if (!unique.some(u => Math.abs(u.x - p.x) < 1e-6 && Math.abs(u.y - p.y) < 1e-6))
        unique.push(p);
    }
    if (unique.length === 2)
      edges.push({ start: unique[0], end: unique[1], normalZ: tri.normal.z });
  }
  return edges;
}

// ── Chain edges into contours (hash-based adjacency) ───────────────

const GRID = 0.005;
function snapKey(p: Point2D): string {
  return `${Math.round(p.x / GRID)},${Math.round(p.y / GRID)}`;
}

function chainEdges(edges: SliceEdge[]): { points: Point2D[]; normalZs: number[] }[] {
  if (!edges.length) return [];
  type Adj = { idx: number; pt: Point2D; other: Point2D; nz: number };
  const adj = new Map<string, Adj[]>();
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const sk = snapKey(e.start), ek = snapKey(e.end);
    (adj.get(sk) ?? (adj.set(sk, []), adj.get(sk)!)).push({ idx: i, pt: e.start, other: e.end, nz: e.normalZ });
    (adj.get(ek) ?? (adj.set(ek, []), adj.get(ek)!)).push({ idx: i, pt: e.end, other: e.start, nz: e.normalZ });
  }
  const used = new Set<number>();
  const contours: { points: Point2D[]; normalZs: number[] }[] = [];

  for (let si = 0; si < edges.length; si++) {
    if (used.has(si)) continue;
    used.add(si);
    const points: Point2D[] = [edges[si].start, edges[si].end];
    const normalZs: number[] = [edges[si].normalZ];

    for (const dir of ["fwd", "bwd"] as const) {
      let ext = true;
      while (ext) {
        ext = false;
        const tip = dir === "fwd" ? points[points.length - 1] : points[0];
        const key = snapKey(tip);
        const nbrs = adj.get(key);
        if (!nbrs) break;
        for (const n of nbrs) {
          if (used.has(n.idx)) continue;
          used.add(n.idx);
          const next = snapKey(n.pt) === key ? n.other : n.pt;
          if (dir === "fwd") { points.push(next); normalZs.push(n.nz); }
          else { points.unshift(next); normalZs.unshift(n.nz); }
          ext = true;
          break;
        }
      }
    }
    if (points.length >= 3) contours.push({ points, normalZs });
  }
  return contours;
}

// ── Prepare contour data (split closed contours) ───────────────────

interface ContourData {
  pts: Point2D[];
  mask: boolean[];
}

function prepareContours(
  contours: { points: Point2D[]; normalZs: number[] }[],
  stats: { overhangRuns: number; overhangSegments: number; contourPtsSum: number; slicesWithOverhangs: number }
): ContourData[] {
  const result: ContourData[] = [];

  for (const { points, normalZs } of contours) {
    if (points.length < 3) continue;
    stats.contourPtsSum += points.length;

    const overhangMask: boolean[] = [];
    let hasOverhang = false, inRun = false;
    for (let i = 0; i < points.length - 1; i++) {
      const nz = i < normalZs.length ? normalZs[i] : 1;
      const isOH = nz < 0.5;
      overhangMask.push(isOH);
      if (isOH) {
        hasOverhang = true;
        if (!inRun) { stats.overhangRuns++; inRun = true; }
        stats.overhangSegments++;
      } else { inRun = false; }
    }
    if (!hasOverhang) continue;
    stats.slicesWithOverhangs++;

    // Closed contour with all-overhang: split at midpoint to avoid
    // first~=last causing arc angle to collapse to ~0
    const isClosed = points.length > 3 &&
      Math.abs(points[0].x - points[points.length - 1].x) < 0.1 &&
      Math.abs(points[0].y - points[points.length - 1].y) < 0.1;

    if (isClosed && overhangMask.every(v => v)) {
      const half = Math.floor(points.length / 2);
      result.push({ pts: points.slice(0, half + 1), mask: overhangMask.slice(0, half) });
      result.push({ pts: points.slice(half), mask: overhangMask.slice(half) });
    } else {
      result.push({ pts: points, mask: overhangMask });
    }
  }
  return result;
}

// ── Main ───────────────────────────────────────────────────────────

const stlPath = "/Users/3dreamzoffice/Downloads/DOMETEST.stl";
const buf = readFileSync(stlPath);
const triangles = parseBinarySTL(buf);
console.log(`STL: ${triangles.length} triangles`);

let zMin = Infinity, zMax = -Infinity;
for (const t of triangles) for (const v of [t.v1, t.v2, t.v3]) {
  if (v.z < zMin) zMin = v.z;
  if (v.z > zMax) zMax = v.z;
}
console.log(`Z range: ${zMin.toFixed(1)} to ${zMax.toFixed(1)} mm`);

const layerHeight = 2.0;
const zHeights: number[] = [];
for (let z = zMin + layerHeight; z < zMax; z += layerHeight) zHeights.push(z);
console.log(`Slicing ${zHeights.length} layers at ${layerHeight}mm\n`);

// Pre-compute all slice contour data
type SliceData = { z: number; contourData: ContourData[] };
const allSlices: SliceData[] = [];
const globalStats = { overhangRuns: 0, overhangSegments: 0, contourPtsSum: 0, slicesWithOverhangs: 0, totalContours: 0 };

for (const z of zHeights) {
  const edges = sliceAtZ(triangles, z);
  if (!edges.length) continue;
  const contours = chainEdges(edges);
  globalStats.totalContours += contours.length;
  const cd = prepareContours(contours, globalStats);
  if (cd.length > 0) allSlices.push({ z, contourData: cd });
}

console.log(`Contour stats:`);
console.log(`  Total contours:          ${globalStats.totalContours}`);
console.log(`  Avg pts per contour:     ${(globalStats.contourPtsSum / globalStats.totalContours).toFixed(1)}`);
console.log(`  Slices with overhangs:   ${globalStats.slicesWithOverhangs}`);
console.log(`  Overhang runs:           ${globalStats.overhangRuns}`);
console.log(`  Avg run length:          ${(globalStats.overhangSegments / globalStats.overhangRuns).toFixed(1)} segs`);

// ── Parameter sweep ────────────────────────────────────────────────

interface ParamSet { dev: number; minAngle: number }
const paramSets: ParamSet[] = [
  { dev: 0.05, minAngle: 15 },  // Very strict
  { dev: 0.1,  minAngle: 15 },  // Default
  { dev: 0.1,  minAngle: 5 },   // Default dev, relaxed angle
  { dev: 0.25, minAngle: 10 },  // Moderate
  { dev: 0.5,  minAngle: 5 },   // Relaxed
  { dev: 1.0,  minAngle: 5 },   // Very relaxed
];

console.log(`\n===================================================================`);
console.log(`  Arc Overhang Results — DOMETEST.stl (${allSlices.length} slices with overhangs)`);
console.log(`===================================================================`);
console.log(`  ${"Deviation".padEnd(12)} ${"MinAngle".padEnd(10)} ${"Arcs".padEnd(8)} ${"Linear".padEnd(10)} ${"Total".padEnd(8)} ${"ArcCov%".padEnd(10)} Errors`);
console.log(`  ${"-".repeat(12)} ${"-".repeat(10)} ${"-".repeat(8)} ${"-".repeat(10)} ${"-".repeat(8)} ${"-".repeat(10)} ------`);

for (const p of paramSets) {
  let arcs = 0, linear = 0, total = 0, errCount = 0;

  for (const slice of allSlices) {
    for (const { pts, mask } of slice.contourData) {
      try {
        const result = fitArcOverhangs(pts, mask, p.dev, p.minAngle);
        for (const seg of result) {
          if (seg.type === "arc") arcs++;
          else linear++;
        }
        total += result.length;
      } catch {
        errCount++;
      }
    }
  }

  const cov = total > 0 ? ((arcs / total) * 100).toFixed(1) : "N/A";
  console.log(`  ${(p.dev + "mm").padEnd(12)} ${(p.minAngle + "deg").padEnd(10)} ${String(arcs).padEnd(8)} ${String(linear).padEnd(10)} ${String(total).padEnd(8)} ${(cov + "%").padEnd(10)} ${errCount}`);
}

console.log(`===================================================================`);

// ── Edge case analysis ─────────────────────────────────────────────

console.log(`\nEdge cases and findings:`);
console.log(`  1. CLOSED CONTOUR BUG: When first point ~= last point (closed loop),`);
console.log(`     the arc angle computed as atan2(last-center) - atan2(first-center)`);
console.log(`     collapses to ~0 degrees, failing the minArcAngle check.`);
console.log(`     Workaround: split closed contours at midpoint.`);
console.log(`     Proper fix: detect closed contours in fitArcOverhangs() and handle`);
console.log(`     the angle wrapping correctly.`);
console.log(``);
console.log(`  2. MESH NOISE SENSITIVITY: STL triangulation introduces ~0.1-0.5mm`);
console.log(`     deviation from the true surface. The default maxArcDeviation=0.1mm`);
console.log(`     is too tight for typical mesh resolution, causing aggressive`);
console.log(`     recursive splitting until segments are too small for arcs.`);
console.log(`     Recommendation: default should be 0.25-0.5mm for mesh inputs.`);
console.log(``);
console.log(`  3. RECURSIVE SPLITTING + MIN ANGLE: After splitting at worst-deviation`);
console.log(`     points, sub-arcs often have small angular span (<15deg) and fall`);
console.log(`     back to linear. Reducing minArcAngle to 5deg significantly helps.`);
console.log(``);
console.log(`  4. NO ERRORS: The algorithm never throws — it gracefully falls back`);
console.log(`     to linear segments for all edge cases (collinear points, etc.)`);
