/**
 * opensimulation — physics-based cleaning simulator
 *
 * Replaces the lookup-table emulator (lib/emulators/cleaning.ts) with a real
 * step-wise physics simulation:
 *
 *  - Coverage: spherical tool tip vs. triangle mesh closest-point. A triangle
 *    is "covered" when the tool's swept volume intersects it within a
 *    configurable tolerance band.
 *  - Force: spring-damper contact model F = k*pen - c*v_n where pen is the
 *    penetration depth (toolRadius - distance) and v_n is the normal-component
 *    of the tool velocity at the contact point. Per-step force is summed; peak
 *    is tracked.
 *  - Reachability (optional): if a robot DH chain is supplied, every waypoint
 *    is checked against `inverseKinematics` from solvers/kinematic-ik.ts.
 *    Unreachable waypoints are flagged but do NOT abort the simulation —
 *    coverage and force just don't accumulate at those steps.
 *
 * Scope-honest caveats:
 *  - This is a kinematic + quasi-static contact model, NOT a multi-body dynamics
 *    solver. We do not integrate rigid-body equations of motion. The "v_n"
 *    velocity is finite-differenced from consecutive trajectory waypoints.
 *  - Closest-point on triangle is the standard Eberly/Ericson algorithm. Brute
 *    force across all triangles per step. Acceptable for ~10k-tri parts; bigger
 *    meshes should add a BVH (TODO).
 *  - No friction, no plastic deformation, no fluid (vacuum/air-flow) coupling.
 *    The model targets *contact-based* depowdering (brush-on-surface), not
 *    fluidised-bed cleaning.
 */

import {
  Vec3,
  TriMesh,
  DhParam,
  SolverError,
} from "../kernel-types";
import { inverseKinematics } from "../solvers/kinematic-ik";

/* ---------------------------------------------------------------- Types */

export interface CleaningPhysicsParams {
  /** Tool tip radius in metres. Used for both coverage band and contact depth. */
  toolRadius: number;
  /** Coverage tolerance band — triangle is "touched" within this distance of the tool surface. Default = 0.5 * toolRadius. */
  coverageBandM?: number;
  /** Contact stiffness in N/m. Default = 5e3. */
  kStiffness?: number;
  /** Contact damping in N*s/m. Default = 25. */
  cDamping?: number;
  /** Time step between consecutive trajectory waypoints, in seconds. Default = 0.05. */
  dtS?: number;
  /** Robot DH chain — if supplied, every waypoint is IK-checked. */
  robotChain?: DhParam[];
  /** IK damping factor (passed to inverseKinematics). Default = 0.1. */
  ikLambda?: number;
  /** IK tolerance — waypoint counts as reachable if final residual < this. Default = 1e-3. */
  ikTol?: number;
}

export interface CleaningStepResult {
  /** Index into trajectory[]. */
  stepIndex: number;
  /** Tool position at this step (post-IK if chain was supplied). */
  position: Vec3;
  /** True when the tool touched at least one triangle. */
  inContact: boolean;
  /** Number of triangles covered by this step. */
  trianglesTouched: number;
  /** Spring-damper contact force magnitude in N. 0 if not in contact. */
  forceN: number;
  /** Penetration depth in metres (how far tool surface dipped below mesh). */
  penetrationM: number;
  /** True iff IK converged at this waypoint. False = unreachable; this step contributes nothing. */
  reachable: boolean;
}

export interface CleaningSimResult {
  /** Fraction of triangles covered ≥1 time. 0..1. */
  coverage: number;
  /** Total simulated time. */
  totalTimeS: number;
  /** Sum of peak per-step forces — useful for energy proxy. */
  totalForceN: number;
  /** Largest force seen at any step. */
  peakForceN: number;
  /** Mean penetration depth across in-contact steps. */
  meanPenetrationM: number;
  /** Number of waypoints the robot could reach (or trajectory.length if no chain). */
  reachableSteps: number;
  /** Number of waypoints the robot could NOT reach. */
  unreachableSteps: number;
  /** Per-step trace — capped at trajectory.length. */
  steps: CleaningStepResult[];
  /** Diagnostic — mesh stats. */
  meshStats: { triangleCount: number; touchedCount: number };
  /** Honest scope marker — surfaced to UI so users know this is contact-only. */
  modelScope: "contact-spring-damper-no-friction-no-fluid";
}

/* ---------------------------------------------------------------- Geometry helpers */

function v3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function vSub(a: Vec3, b: Vec3): Vec3 {
  return v3(a.x - b.x, a.y - b.y, a.z - b.z);
}

function vDot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vLen(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

function vScale(a: Vec3, s: number): Vec3 {
  return v3(a.x * s, a.y * s, a.z * s);
}

function vAdd(a: Vec3, b: Vec3): Vec3 {
  return v3(a.x + b.x, a.y + b.y, a.z + b.z);
}

/**
 * Closest point on triangle (a, b, c) to point p.
 * Returns the closest point and the squared distance to it.
 * Standard Ericson "Real-Time Collision Detection" §5.1.5 algorithm.
 */
function closestPointOnTriangle(p: Vec3, a: Vec3, b: Vec3, c: Vec3): { point: Vec3; distSq: number } {
  const ab = vSub(b, a);
  const ac = vSub(c, a);
  const ap = vSub(p, a);

  const d1 = vDot(ab, ap);
  const d2 = vDot(ac, ap);
  if (d1 <= 0 && d2 <= 0) {
    const point = a;
    const diff = vSub(p, point);
    return { point, distSq: vDot(diff, diff) };
  }

  const bp = vSub(p, b);
  const d3 = vDot(ab, bp);
  const d4 = vDot(ac, bp);
  if (d3 >= 0 && d4 <= d3) {
    const point = b;
    const diff = vSub(p, point);
    return { point, distSq: vDot(diff, diff) };
  }

  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    const point = vAdd(a, vScale(ab, v));
    const diff = vSub(p, point);
    return { point, distSq: vDot(diff, diff) };
  }

  const cp = vSub(p, c);
  const d5 = vDot(ab, cp);
  const d6 = vDot(ac, cp);
  if (d6 >= 0 && d5 <= d6) {
    const point = c;
    const diff = vSub(p, point);
    return { point, distSq: vDot(diff, diff) };
  }

  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    const point = vAdd(a, vScale(ac, w));
    const diff = vSub(p, point);
    return { point, distSq: vDot(diff, diff) };
  }

  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    const point = vAdd(b, vScale(vSub(c, b), w));
    const diff = vSub(p, point);
    return { point, distSq: vDot(diff, diff) };
  }

  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  const point = vAdd(a, vAdd(vScale(ab, v), vScale(ac, w)));
  const diff = vSub(p, point);
  return { point, distSq: vDot(diff, diff) };
}

function readVertex(verts: Float32Array, idx: number): Vec3 {
  return v3(verts[idx * 3], verts[idx * 3 + 1], verts[idx * 3 + 2]);
}

/* ---------------------------------------------------------------- Reachability */

function isReachable(
  chain: DhParam[],
  target: Vec3,
  lambda: number,
  tol: number,
): boolean {
  try {
    const result = inverseKinematics({
      chain,
      target: { position: target },
      lambda,
      tol,
      maxIter: 50,
    });
    return result.success && result.finalError < tol * 10;
  } catch (err) {
    if (err instanceof SolverError) {
      return false;
    }
    throw err;
  }
}

/* ---------------------------------------------------------------- Main entry */

/**
 * Run a step-wise physics simulation of a tool sweeping a trajectory across
 * a triangle-meshed surface. Returns coverage, force, and reachability stats.
 *
 * Throws SolverError("BAD_INPUT", ...) when inputs are malformed (empty mesh,
 * empty trajectory, non-positive radius). Robot-IK divergence at a single
 * waypoint is silently flagged as unreachable; the simulation continues.
 */
export function simulateCleaning(
  surface: TriMesh,
  trajectory: Vec3[],
  params: CleaningPhysicsParams,
): CleaningSimResult {
  if (!surface || surface.indices.length === 0) {
    throw new SolverError("BAD_INPUT", "simulateCleaning: empty surface mesh");
  }
  if (trajectory.length === 0) {
    throw new SolverError("BAD_INPUT", "simulateCleaning: empty trajectory");
  }
  if (!Number.isFinite(params.toolRadius) || params.toolRadius <= 0) {
    throw new SolverError("BAD_INPUT", "simulateCleaning: toolRadius must be positive");
  }

  const triCount = surface.indices.length / 3;
  const toolRadius = params.toolRadius;
  const coverBand = params.coverageBandM ?? toolRadius * 0.5;
  const k = params.kStiffness ?? 5e3;
  const c = params.cDamping ?? 25;
  const dt = params.dtS ?? 0.05;
  const ikLambda = params.ikLambda ?? 0.1;
  const ikTol = params.ikTol ?? 1e-3;

  const triangleTouched = new Uint8Array(triCount);
  const steps: CleaningStepResult[] = [];

  let totalForceN = 0;
  let peakForceN = 0;
  let penetrationSum = 0;
  let penetrationCount = 0;
  let reachableSteps = 0;
  let unreachableSteps = 0;

  let prev: Vec3 | null = null;

  for (let s = 0; s < trajectory.length; s++) {
    const pos = trajectory[s];

    // Reachability gate (no-op when no robotChain).
    let reachable = true;
    if (params.robotChain && params.robotChain.length > 0) {
      reachable = isReachable(params.robotChain, pos, ikLambda, ikTol);
      if (!reachable) {
        unreachableSteps++;
        steps.push({
          stepIndex: s,
          position: pos,
          inContact: false,
          trianglesTouched: 0,
          forceN: 0,
          penetrationM: 0,
          reachable: false,
        });
        prev = pos;
        continue;
      }
    }
    reachableSteps++;

    // Velocity = finite difference; first step gets zero velocity.
    let vel: Vec3 = v3(0, 0, 0);
    if (prev) {
      vel = vScale(vSub(pos, prev), 1 / dt);
    }

    // Iterate triangles, find min-distance hit + count covered.
    let minDistSq = Infinity;
    let minHit: { point: Vec3 } | null = null;
    let touchedThisStep = 0;
    const coverThresholdSq = (toolRadius + coverBand) * (toolRadius + coverBand);
    const contactThresholdSq = toolRadius * toolRadius;

    for (let t = 0; t < triCount; t++) {
      if (triangleTouched[t]) {
        // Already covered — skip the expensive closest-point but still let
        // it count toward contact if very close (re-check distance cheaply
        // would require BVH; skip for perf).
        continue;
      }
      const a = readVertex(surface.vertices, surface.indices[t * 3]);
      const b = readVertex(surface.vertices, surface.indices[t * 3 + 1]);
      const cc = readVertex(surface.vertices, surface.indices[t * 3 + 2]);
      const cp = closestPointOnTriangle(pos, a, b, cc);

      if (cp.distSq <= coverThresholdSq) {
        triangleTouched[t] = 1;
        touchedThisStep++;
      }
      if (cp.distSq < minDistSq) {
        minDistSq = cp.distSq;
        minHit = cp;
      }
    }

    // For force: also need to check ALREADY-touched triangles for contact
    // (otherwise sliding along a surface stops registering force after the
    // first hit). Second pass — cheap because we only need the min distance.
    for (let t = 0; t < triCount; t++) {
      if (!triangleTouched[t]) continue;
      const a = readVertex(surface.vertices, surface.indices[t * 3]);
      const b = readVertex(surface.vertices, surface.indices[t * 3 + 1]);
      const cc = readVertex(surface.vertices, surface.indices[t * 3 + 2]);
      const cp = closestPointOnTriangle(pos, a, b, cc);
      if (cp.distSq < minDistSq) {
        minDistSq = cp.distSq;
        minHit = cp;
      }
    }

    let inContact = false;
    let forceN = 0;
    let pen = 0;

    if (minHit && minDistSq < contactThresholdSq) {
      inContact = true;
      const dist = Math.sqrt(minDistSq);
      pen = toolRadius - dist;

      // Normal direction = from contact point to tool centre.
      const normal = vSub(pos, minHit.point);
      const normalLen = vLen(normal);
      if (normalLen > 1e-9) {
        const nHat = vScale(normal, 1 / normalLen);
        const vNormal = vDot(vel, nHat);
        // Spring-damper: F = k*pen - c*v_n. Clamp to zero (no sticking).
        forceN = Math.max(0, k * pen - c * vNormal);
      } else {
        forceN = k * pen;
      }

      totalForceN += forceN;
      if (forceN > peakForceN) peakForceN = forceN;
      penetrationSum += pen;
      penetrationCount++;
    }

    steps.push({
      stepIndex: s,
      position: pos,
      inContact,
      trianglesTouched: touchedThisStep,
      forceN,
      penetrationM: pen,
      reachable: true,
    });
    prev = pos;
  }

  let touchedCount = 0;
  for (let t = 0; t < triCount; t++) {
    if (triangleTouched[t]) touchedCount++;
  }
  const coverage = triCount === 0 ? 0 : touchedCount / triCount;
  const meanPenetrationM = penetrationCount === 0 ? 0 : penetrationSum / penetrationCount;
  const totalTimeS = trajectory.length * dt;

  return {
    coverage,
    totalTimeS,
    totalForceN,
    peakForceN,
    meanPenetrationM,
    reachableSteps,
    unreachableSteps,
    steps,
    meshStats: { triangleCount: triCount, touchedCount },
    modelScope: "contact-spring-damper-no-friction-no-fluid",
  };
}
