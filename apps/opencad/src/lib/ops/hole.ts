/**
 * opencad — `hole` CAD operation (simple / counterbore / countersink).
 *
 * Thin composition on top of `cad-kernel.ts`. Does NOT re-implement cylinders
 * or CSG — delegates to `createCylinder` and `booleanOp`. The only time we
 * sidestep kernel helpers is for the countersink cone, which needs native
 * `THREE.LatheGeometry` control so we can align the cone axis with the
 * composed drill axis before the final orient step.
 *
 * Units: mm. Node-safe (no DOM).
 *
 * Semantics:
 *   - `position` is the entry point of the drill (the center of the mouth
 *     of the main cylinder).
 *   - `axis` is the direction the drill travels INTO the material. Default
 *     `{0,0,-1}` — a hole punched down through a box whose top face sits at
 *     z = +half-thickness.
 *   - For counterbore / countersink, the "head" widens the hole ON THE
 *     ENTRY SIDE — it carves INTO the material along the same direction as
 *     travel (axis), just shallower and wider. Physically: a bolt head sits
 *     flush in the widened cavity at the entry face.
 *
 * CSG fallback inheritance: `booleanOp` warns + returns lhs if three-bvh-csg
 * is missing. We call it directly, so the same fallback applies here.
 */
import * as THREE from "three";
import {
  booleanOp,
  createCylinder,
  exportBoundingBox,
  type SolidResult,
} from "../cad-kernel";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type HoleKind = "simple" | "counterbore" | "countersink";

export interface HoleOptions {
  /** Default 'simple'. */
  kind?: HoleKind;
  /** Required when kind='counterbore'. Must exceed base `diameter`. */
  counterboreDiameter?: number;
  /** Required when kind='counterbore'. */
  counterboreDepth?: number;
  /** Required when kind='countersink'. Must exceed base `diameter`. */
  countersinkDiameter?: number;
  /** Included angle in degrees. Default 90. DIN 74 allows 60/75/90/120. */
  countersinkAngleDeg?: number;
  /** Direction the drill bit travels into the material. Default {0,0,-1}. */
  axis?: Vec3;
  /** If true, length = bbox-diagonal × 1.1 (overrides `depth`). */
  throughAll?: boolean;
}

/** Tiny overlap to dodge coplanar-face CSG artifacts. */
const EPS = 1e-3;

/**
 * Punch a hole into `target`. Returns the resulting SolidResult.
 *
 * @example
 *   const box = new THREE.BoxGeometry(20, 20, 20);
 *   const result = hole(box, { x: 0, y: 0, z: 10 }, 5, 10);
 */
export function hole(
  target: THREE.BufferGeometry,
  position: Vec3,
  diameter: number,
  depth: number,
  options: HoleOptions = {}
): SolidResult {
  /* ---------------------------------------------------------- validate */
  if (!(diameter > 0)) {
    throw new Error(`hole: diameter must be > 0 (got ${diameter})`);
  }
  if (!(depth > 0)) {
    throw new Error(`hole: depth must be > 0 (got ${depth})`);
  }

  const kind: HoleKind = options.kind ?? "simple";

  if (kind === "counterbore") {
    const cbD = options.counterboreDiameter;
    const cbH = options.counterboreDepth;
    if (!(typeof cbD === "number" && cbD > diameter)) {
      throw new Error(
        `hole: counterboreDiameter must be > diameter (${cbD} <= ${diameter})`
      );
    }
    if (!(typeof cbH === "number" && cbH > 0)) {
      throw new Error(`hole: counterboreDepth must be > 0 (got ${cbH})`);
    }
  }

  if (kind === "countersink") {
    const csD = options.countersinkDiameter;
    const ang = options.countersinkAngleDeg ?? 90;
    if (!(typeof csD === "number" && csD > diameter)) {
      throw new Error(
        `hole: countersinkDiameter must be > diameter (${csD} <= ${diameter})`
      );
    }
    if (!(ang > 0 && ang < 180)) {
      throw new Error(
        `hole: countersinkAngleDeg must be in (0, 180) (got ${ang})`
      );
    }
  }

  const rawAxis = options.axis ?? { x: 0, y: 0, z: -1 };
  const axisVec = new THREE.Vector3(rawAxis.x, rawAxis.y, rawAxis.z);
  const axisMag = axisVec.length();
  if (!(axisMag > 1e-9)) {
    throw new Error(`hole: axis magnitude too small (${axisMag})`);
  }
  const axisNorm = axisVec.clone().divideScalar(axisMag);

  /* ------------------------------------------------- resolve drill length */
  let mainLen = depth;
  if (options.throughAll) {
    const bb = exportBoundingBox(target);
    const dx = bb.max.x - bb.min.x;
    const dy = bb.max.y - bb.min.y;
    const dz = bb.max.z - bb.min.z;
    const diag = Math.sqrt(dx * dx + dy * dy + dz * dz);
    mainLen = diag * 1.1;
  }

  /* -------------------------------------------------- build tool in local
   * space. Local frame: drill travels along -Z, entry face at z=0, body
   * extends to z = -mainLen. Counterbore / countersink heads extend in -Z
   * too (same direction as travel) — they widen the hole AT the entry side,
   * carving into the material. The entry-face normal in local space is +Z.
   */
  // Main cylinder: centered at origin along +Z; shift so entry end sits at
  // z=0 and body extends to z=-mainLen. A small +EPS overhang above the
  // entry face prevents coplanar-face artifacts if no head is present.
  const mainCyl = createCylinder(diameter / 2, mainLen + EPS);
  mainCyl.mesh.translate(0, 0, -(mainLen / 2) + EPS / 2);
  let toolGeom: THREE.BufferGeometry = mainCyl.mesh;

  if (kind === "counterbore") {
    const cbDia = options.counterboreDiameter as number;
    const cbDepth = options.counterboreDepth as number;
    // Counterbore cylinder: wider, shorter, extends INTO material (same dir
    // as main body, i.e., -Z). Translate so top sits at z = +EPS/2 (slight
    // overhang above entry face) and base at z = -(cbDepth + EPS/2).
    const cbCyl = createCylinder(cbDia / 2, cbDepth + EPS);
    cbCyl.mesh.translate(0, 0, -(cbDepth / 2) + EPS / 2);
    toolGeom = booleanOp(toolGeom, cbCyl.mesh, "union").mesh;
  } else if (kind === "countersink") {
    const csDia = options.countersinkDiameter as number;
    const angDeg = options.countersinkAngleDeg ?? 90;
    // "Included angle" is the full cone apex angle; half-angle (axis to wall)
    // is angDeg/2.
    const halfAng = (angDeg / 2) * (Math.PI / 180);
    const rBot = diameter / 2;
    const rTop = csDia / 2;
    // dr/dz = tan(halfAng) → csHeight = (rTop - rBot) / tan(halfAng).
    const csHeight = (rTop - rBot) / Math.tan(halfAng);
    // Profile (in LatheGeometry's native space: .x = radius, .y = axis pos).
    // We build the cone with wide rim at lathe-y = 0 and narrow throat at
    // lathe-y = csHeight. A 4-point closed polyline:
    //   (rTop, 0) → (rBot, csHeight) → (0, csHeight) → (0, 0)
    const profile = [
      new THREE.Vector2(rTop, 0),
      new THREE.Vector2(rBot, csHeight),
      new THREE.Vector2(0, csHeight),
      new THREE.Vector2(0, 0),
    ];
    const csGeom = new THREE.LatheGeometry(profile, 48, 0, Math.PI * 2);
    // LatheGeometry revolves around Y. Rotate so its native Y axis aligns
    // with our local -Z (drill travel direction): rotateX(+PI/2) sends +Y
    // to -Z. After rotation: lathe-y=0 (wide rim) → z=0, lathe-y=csHeight
    // (narrow throat) → z=-csHeight. That puts the rim at the entry face
    // and the throat deeper into the material, matching a real countersink.
    csGeom.rotateX(Math.PI / 2);
    // Lift slightly above entry face to avoid coplanar artifacts with the
    // main cylinder's entry-face overhang.
    csGeom.translate(0, 0, EPS / 2);
    toolGeom = booleanOp(toolGeom, csGeom, "union").mesh;
  }

  /* ------------------------------------- orient tool from local -Z to axis.
   * Local frame: drill body/travel direction is -Z. We want local -Z to map
   * onto the user-supplied `axisNorm`. Use setFromUnitVectors(src=(0,0,-1),
   * dst=axisNorm).
   */
  const srcDir = new THREE.Vector3(0, 0, -1);
  const q = new THREE.Quaternion();
  // Defensive antipode handling: setFromUnitVectors is well-defined for
  // the exact antipode in recent Three versions, but we add a fallback —
  // pick an arbitrary perpendicular axis and rotate PI.
  const dotProd = srcDir.dot(axisNorm);
  if (dotProd < -1 + 1e-8) {
    // axisNorm ≈ (0, 0, +1): 180° rotation around X-axis flips -Z → +Z.
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  } else {
    q.setFromUnitVectors(srcDir, axisNorm);
  }
  toolGeom.applyQuaternion(q);

  /* --------------------------------------------- translate tool to position */
  toolGeom.translate(position.x, position.y, position.z);

  /* ---------------------------------------------- subtract tool from target */
  return booleanOp(target, toolGeom, "subtract");
}
