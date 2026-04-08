/**
 * Arc Overhang Algorithm Test — 01-hemisphere.stl (ASCII)
 *
 * OpenSCAD hemisphere ($fn=120) — pure curved overhang from 0 to 90 deg.
 * Tests the FIXED algorithm: closed contour handling + minArcAngle=8 default.
 *
 * Parses ASCII STL, slices at 0.2mm, builds overhang masks, runs fitArcOverhangs().
 */

import { readFileSync } from "node:fs";
import { fitArcOverhangs, type Point2D } from "./src/algorithms/arc-overhangs.js";

// ── ASCII STL Parser ──────────────────────────────────────────────

interface Vec3 { x: number; y: number; z: number }
interface Triangle { normal: Vec3; v1: Vec3; v2: Vec3; v3: Vec3 }

function parseAsciiSTL(text: string): Triangle[] {
  const triangles: Triangle[] = [];
  const facetRe = /facet\s+normal\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+outer\s+loop\s+vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+endloop\s+endfacet/g;
  let m: RegExpExecArray | null;
  while ((m = facetRe.exec(text)) !== null) {
    triangles.push({
      normal: { x: +m[1], y: +m[2], z: +m[3] },
      v1: { x: +m[4], y: +m[5], z: +m[6] },
      v2: { x: +m[7], y: +m[8], z: +m[9] },
      v3: { x: +m[10], y: +m[11], z: +m[12] },
    });
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

// ── Chain edges into contours ─────────────────────────────────────

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

// ── Prepare contour data (split closed all-overhang contours) ─────

interface ContourData { pts: Point2D[]; mask: boolean[] }

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

    // Closed contour with all-overhang: split at midpoint
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

const stlPath = "/tmp/openscad-arc-tests/01-hemisphere.stl";
const text = readFileSync(stlPath, "utf-8");
const triangles = parseAsciiSTL(text);
console.log(`STL: ${triangles.length} triangles`);

if (triangles.length === 0) {
  console.error("ERROR: No triangles parsed. Check STL file format.");
  process.exit(1);
}

// Find Z range
let zMin = Infinity, zMax = -Infinity;
for (const t of triangles) for (const v of [t.v1, t.v2, t.v3]) {
  if (v.z < zMin) zMin = v.z;
  if (v.z > zMax) zMax = v.z;
}
console.log(`Z range: ${zMin.toFixed(2)} to ${zMax.toFixed(2)} mm`);

const layerHeight = 0.2;
const zHeights: number[] = [];
for (let z = zMin + layerHeight; z < zMax; z += layerHeight) zHeights.push(z);
console.log(`Slicing ${zHeights.length} layers at ${layerHeight}mm\n`);

// Pre-compute all slices
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
console.log(`  Avg pts per contour:     ${globalStats.totalContours > 0 ? (globalStats.contourPtsSum / globalStats.totalContours).toFixed(1) : "N/A"}`);
console.log(`  Slices with overhangs:   ${globalStats.slicesWithOverhangs}`);
console.log(`  Overhang runs:           ${globalStats.overhangRuns}`);
console.log(`  Avg run length:          ${globalStats.overhangRuns > 0 ? (globalStats.overhangSegments / globalStats.overhangRuns).toFixed(1) : "N/A"} segs`);

// ── Run fitArcOverhangs with default params (the FIXED algorithm) ──

console.log(`\n===================================================================`);
console.log(`  Arc Overhang Results — 01-hemisphere.stl (${allSlices.length} slices with overhangs)`);
console.log(`  Algorithm: FIXED (closed contour handling + minArcAngle=8 default)`);
console.log(`===================================================================`);
console.log(`  ${"Deviation".padEnd(12)} ${"MinAngle".padEnd(10)} ${"Arcs".padEnd(8)} ${"Linear".padEnd(10)} ${"Total".padEnd(8)} ${"ArcCov%".padEnd(10)} Errors`);
console.log(`  ${"-".repeat(12)} ${"-".repeat(10)} ${"-".repeat(8)} ${"-".repeat(10)} ${"-".repeat(8)} ${"-".repeat(10)} ------`);

// Default params (the fixed defaults: maxArcDeviation=0.1, minArcAngle=8)
interface ParamSet { dev: number; minAngle: number; label: string }
const paramSets: ParamSet[] = [
  { dev: 0.1,  minAngle: 8,  label: "FIXED defaults" },
  { dev: 0.1,  minAngle: 15, label: "old defaults" },
  { dev: 0.05, minAngle: 8,  label: "tight dev" },
  { dev: 0.25, minAngle: 8,  label: "relaxed dev" },
  { dev: 0.5,  minAngle: 5,  label: "very relaxed" },
];

const results: { label: string; arcs: number; linear: number; total: number; errCount: number; cov: string }[] = [];

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
      } catch (e) {
        errCount++;
      }
    }
  }

  const cov = total > 0 ? ((arcs / total) * 100).toFixed(1) : "N/A";
  results.push({ label: p.label, arcs, linear, total, errCount, cov });
  console.log(`  ${(p.dev + "mm").padEnd(12)} ${(p.minAngle + "deg").padEnd(10)} ${String(arcs).padEnd(8)} ${String(linear).padEnd(10)} ${String(total).padEnd(8)} ${(cov + "%").padEnd(10)} ${errCount}  (${p.label})`);
}

console.log(`===================================================================`);

// ── Per-layer detail for default params ───────────────────────────

console.log(`\n── Per-layer detail (default params: 0.1mm dev, 8deg minAngle) ──`);
console.log(`  ${"Z(mm)".padEnd(10)} ${"Arcs".padEnd(6)} ${"Linear".padEnd(8)} ${"ArcCov%".padEnd(10)} ${"Contours".padEnd(10)}`);
console.log(`  ${"-".repeat(10)} ${"-".repeat(6)} ${"-".repeat(8)} ${"-".repeat(10)} ${"-".repeat(10)}`);

let layersPrinted = 0;
for (const slice of allSlices) {
  let arcs = 0, linear = 0;
  for (const { pts, mask } of slice.contourData) {
    try {
      const result = fitArcOverhangs(pts, mask, 0.1, 8);
      for (const seg of result) {
        if (seg.type === "arc") arcs++;
        else linear++;
      }
    } catch { /* ignore */ }
  }
  const total = arcs + linear;
  const cov = total > 0 ? ((arcs / total) * 100).toFixed(1) : "N/A";
  // Print every 5th layer to keep output manageable
  if (layersPrinted % 5 === 0 || layersPrinted === allSlices.length - 1) {
    console.log(`  ${slice.z.toFixed(2).padEnd(10)} ${String(arcs).padEnd(6)} ${String(linear).padEnd(8)} ${(cov + "%").padEnd(10)} ${slice.contourData.length}`);
  }
  layersPrinted++;
}

// ── Summary ───────────────────────────────────────────────────────

console.log(`\n===================================================================`);
console.log(`  SUMMARY`);
console.log(`===================================================================`);
console.log(`  Triangles:       ${triangles.length}`);
console.log(`  Slices (0.2mm):  ${zHeights.length} total, ${allSlices.length} with overhangs`);
const def = results.find(r => r.label === "FIXED defaults")!;
const old = results.find(r => r.label === "old defaults")!;
console.log(`  FIXED defaults:  ${def.arcs} arcs, ${def.linear} linear → ${def.cov}% arc coverage, ${def.errCount} errors`);
console.log(`  Old defaults:    ${old.arcs} arcs, ${old.linear} linear → ${old.cov}% arc coverage, ${old.errCount} errors`);
const improvement = def.arcs > 0 && old.arcs > 0
  ? ((+def.cov - +old.cov)).toFixed(1)
  : "N/A";
console.log(`  Improvement:     +${improvement} percentage points arc coverage`);
console.log(`===================================================================`);
