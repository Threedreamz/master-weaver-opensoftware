/**
 * opencam — drill / peck cycle toolpath generator.
 *
 * Pure math; no jscut dependency. Emits one polyline per hole representing
 * the complete rapid-approach + plunge (or peck loop) + retract sequence.
 *
 * Units: millimeters; feedrates in mm/min. Z-up convention: the hole goes
 * from `topZMm` downward to `topZMm - depthMm`. All hole cycles finish at
 * `safeZMm` so downstream rapid moves between holes are safe.
 */

import type { BBox3, Polyline3 } from "../cam-kernel";
import { mergeBBox3, polylineBBox } from "../cam-kernel";

/* ---------------------------------------------------------------- types */

export interface Hole {
  x: number;
  y: number;
  /** Z at the top of the hole (typically stock top). */
  topZMm: number;
  /** Total drill depth (positive); bottom Z = topZMm - depthMm. */
  depthMm: number;
  /** Informational only — the tool drives the hole diameter. */
  diameterMm?: number;
}

export interface DrillInput {
  holes: Hole[];
  toolDiameterMm: number;
  /** Plunge feed (mm/min) for downward cutting moves. */
  feedMmMin: number;
  /** Rapid feed for non-cutting moves. Defaults to 3000 mm/min. */
  rapidFeedMmMin?: number;
  spindleRpm: number;
  /** Retract Z — tool rapids to this Z between holes. */
  safeZMm: number;
  /** If set and positive, enables a peck cycle with this peck increment. */
  peckDepthMm?: number;
  /** Dwell at hole bottom for chip clearance. Default 0. */
  dwellSec?: number;
  /** Hole-order optimization. Default "nearest-neighbor". */
  optimizeOrder?: "none" | "nearest-neighbor";
}

export interface DrillResult {
  kind: "drill";
  /** One polyline per hole = complete rapid-in + cut + retract cycle. */
  polylines: Polyline3[];
  estimatedDurationSec: number;
  bbox: BBox3;
  warnings: string[];
}

/* ---------------------------------------------------------------- helpers */

/** Retract clearance above last peck bottom before re-entering the hole. */
const PECK_REENTRY_CLEARANCE_MM = 0.5;

/**
 * Greedy nearest-neighbor hole ordering starting from (0,0).
 * Pure XY distance — Z is ignored since holes are visited via safe-Z moves.
 */
function reorderNearestNeighbor(holes: Hole[]): Hole[] {
  if (holes.length <= 1) return holes.slice();
  const remaining = holes.slice();
  const ordered: Hole[] = [];
  let cx = 0;
  let cy = 0;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const dx = remaining[i].x - cx;
      const dy = remaining[i].y - cy;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const picked = remaining.splice(bestIdx, 1)[0];
    ordered.push(picked);
    cx = picked.x;
    cy = picked.y;
  }
  return ordered;
}

interface CycleBuildResult {
  polyline: { x: number; y: number; z: number }[];
  /** Cumulative plunge-feed length within this cycle (mm). */
  feedLen: number;
  /** Cumulative rapid-move length within this cycle (mm). */
  rapidLen: number;
  /** Total dwell time accrued in this cycle (sec). */
  dwellSec: number;
}

/**
 * Build one hole cycle: rapid-in, plunge (with optional pecking), dwell,
 * retract to safe Z. Returns the polyline plus per-segment motion lengths
 * so the caller can cost them separately at feed/rapid rates.
 */
function buildHoleCycle(
  hole: Hole,
  safeZMm: number,
  peckDepthMm: number | undefined,
  dwellSec: number,
  prev: { x: number; y: number; z: number } | null,
): CycleBuildResult {
  const polyline: { x: number; y: number; z: number }[] = [];
  let feedLen = 0;
  let rapidLen = 0;
  let totalDwell = 0;

  const bottomZ = hole.topZMm - hole.depthMm;
  const startPoint = { x: hole.x, y: hole.y, z: safeZMm };

  // Rapid from previous cycle's end (or imaginary start) to safe-Z above hole.
  if (prev) {
    const dx = startPoint.x - prev.x;
    const dy = startPoint.y - prev.y;
    const dz = startPoint.z - prev.z;
    rapidLen += Math.hypot(dx, dy, dz);
  }
  polyline.push(startPoint);

  // Rapid down to hole top (still above material).
  const topPoint = { x: hole.x, y: hole.y, z: hole.topZMm };
  rapidLen += Math.abs(safeZMm - hole.topZMm);
  polyline.push(topPoint);

  if (peckDepthMm && peckDepthMm > 0) {
    // Peck loop.
    let lastBottomZ = hole.topZMm;
    let currentFeedStartZ = hole.topZMm;
    while (lastBottomZ > bottomZ + 1e-9) {
      const nextBottomZ = Math.max(bottomZ, lastBottomZ - peckDepthMm);
      // Feed down from currentFeedStartZ to nextBottomZ.
      const feedSegment = Math.abs(currentFeedStartZ - nextBottomZ);
      feedLen += feedSegment;
      polyline.push({ x: hole.x, y: hole.y, z: nextBottomZ });

      if (dwellSec > 0) {
        // Dwell at bottom — duplicate the bottom point to represent pause.
        polyline.push({ x: hole.x, y: hole.y, z: nextBottomZ });
        totalDwell += dwellSec;
      }

      const atFinalDepth = nextBottomZ <= bottomZ + 1e-9;
      if (atFinalDepth) {
        lastBottomZ = nextBottomZ;
        break;
      }

      // Rapid retract to safe Z for chip clearance.
      rapidLen += Math.abs(safeZMm - nextBottomZ);
      polyline.push({ x: hole.x, y: hole.y, z: safeZMm });

      // Rapid back down to a small clearance above the last peck bottom,
      // from which the next feed move begins.
      const reentryZ = Math.min(
        hole.topZMm,
        nextBottomZ + PECK_REENTRY_CLEARANCE_MM,
      );
      rapidLen += Math.abs(safeZMm - reentryZ);
      polyline.push({ x: hole.x, y: hole.y, z: reentryZ });

      lastBottomZ = nextBottomZ;
      currentFeedStartZ = reentryZ;
    }
  } else {
    // Single full-depth plunge.
    feedLen += Math.abs(hole.topZMm - bottomZ);
    polyline.push({ x: hole.x, y: hole.y, z: bottomZ });
    if (dwellSec > 0) {
      polyline.push({ x: hole.x, y: hole.y, z: bottomZ });
      totalDwell += dwellSec;
    }
  }

  // Final retract to safe Z.
  rapidLen += Math.abs(safeZMm - bottomZ);
  polyline.push({ x: hole.x, y: hole.y, z: safeZMm });

  return { polyline, feedLen, rapidLen, dwellSec: totalDwell };
}

/* ---------------------------------------------------------------- op */

/**
 * Generate a drill / peck-drill toolpath for a set of holes.
 *
 * One polyline per hole. Holes may be optionally reordered via nearest-
 * neighbor (default) starting from (0,0). If `peckDepthMm` is set and
 * positive, each cycle breaks into repeated peck-retract-reenter segments;
 * otherwise each hole gets a single plunge.
 */
export function generateDrillToolpath(input: DrillInput): DrillResult {
  const warnings: string[] = [];

  // Validate peckDepth.
  let peckDepth: number | undefined = input.peckDepthMm;
  if (peckDepth !== undefined && peckDepth <= 0) {
    warnings.push("peckDepthMm must be positive — using full-depth plunge");
    peckDepth = undefined;
  }

  // Validate tool vs hole diameter.
  for (const h of input.holes) {
    if (
      typeof h.diameterMm === "number" &&
      h.diameterMm > 0 &&
      input.toolDiameterMm > h.diameterMm
    ) {
      warnings.push(
        "tool larger than specified hole diameter; using tool size",
      );
      break;
    }
  }

  if (input.holes.length === 0) {
    warnings.push("no holes provided");
    return {
      kind: "drill",
      polylines: [],
      estimatedDurationSec: 0,
      bbox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
      warnings,
    };
  }

  const order = input.optimizeOrder ?? "nearest-neighbor";
  const ordered =
    order === "nearest-neighbor"
      ? reorderNearestNeighbor(input.holes)
      : input.holes.slice();

  const rapidFeed =
    input.rapidFeedMmMin && input.rapidFeedMmMin > 0
      ? input.rapidFeedMmMin
      : 3000;
  const plungeFeed = input.feedMmMin > 0 ? input.feedMmMin : 1;
  const dwell = input.dwellSec && input.dwellSec > 0 ? input.dwellSec : 0;

  const polylines: Polyline3[] = [];
  let feedLenTotal = 0;
  let rapidLenTotal = 0;
  let dwellTotal = 0;
  let prev: { x: number; y: number; z: number } | null = null;

  for (const hole of ordered) {
    const cycle = buildHoleCycle(
      hole,
      input.safeZMm,
      peckDepth,
      dwell,
      prev,
    );
    polylines.push(cycle.polyline);
    feedLenTotal += cycle.feedLen;
    rapidLenTotal += cycle.rapidLen;
    dwellTotal += cycle.dwellSec;
    prev = cycle.polyline[cycle.polyline.length - 1];
  }

  const feedSec = (feedLenTotal / plungeFeed) * 60;
  const rapidSec = (rapidLenTotal / rapidFeed) * 60;
  const estimatedDurationSec = feedSec + rapidSec + dwellTotal;

  const bbox =
    polylines.length > 0
      ? mergeBBox3(...polylines.map((p) => polylineBBox(p)))
      : { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };

  return {
    kind: "drill",
    polylines,
    estimatedDurationSec,
    bbox,
    warnings,
  };
}
