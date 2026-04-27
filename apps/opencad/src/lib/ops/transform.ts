/**
 * opencad — rigid-body transforms (translate / rotate / scale).
 *
 * Pure Three.js geometry transforms returning a fresh `SolidResult` with
 * bbox + volume recomputed. Each primitive clones the input geometry before
 * calling `applyMatrix4`, so the caller's geometry is never mutated.
 *
 * Composition order for the aggregate `transform()`:
 *
 *   M = T · (Origin · R · S · Origin⁻¹)
 *
 * i.e. rotate + scale are applied about `origin` (default 0,0,0), then the
 * translation offset is applied in world space last. This matches the
 * "move-to-place after shaping" mental model used by feature-timeline and
 * matches Three's own `Object3D` matrix semantics (scale → rotate → translate).
 *
 * All functions are Node-compatible. Units: millimeters (mm), degrees for
 * rotation, right-hand rule.
 */
import * as THREE from "three";
import {
  computeVolumeMm3,
  exportBoundingBox,
  type SolidResult,
} from "../cad-kernel";

/* ---------------------------------------------------------------- types */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TransformOptions {
  translate?: Vec3;
  rotate?: { axis: Vec3; angleDeg: number };
  scale?: Vec3 | number;
  /** Pivot for rotate/scale; defaults to (0,0,0). Ignored by translate-only. */
  origin?: Vec3;
}

/* -------------------------------------------------------------- helpers */

const ORIGIN_ZERO: Vec3 = { x: 0, y: 0, z: 0 };

function assertFiniteVec3(v: Vec3, label: string): void {
  if (
    !Number.isFinite(v.x) ||
    !Number.isFinite(v.y) ||
    !Number.isFinite(v.z)
  ) {
    throw new Error(`${label}: components must be finite numbers`);
  }
}

function assertNonZeroVec3(v: Vec3, label: string): void {
  assertFiniteVec3(v, label);
  if (v.x === 0 && v.y === 0 && v.z === 0) {
    throw new Error(`${label}: vector must be non-zero`);
  }
}

function toScaleVec3(factor: Vec3 | number): Vec3 {
  if (typeof factor === "number") {
    if (!Number.isFinite(factor)) {
      throw new Error("scale: factor must be a finite number");
    }
    if (factor === 0) {
      throw new Error("scale: factor must be non-zero");
    }
    return { x: factor, y: factor, z: factor };
  }
  assertFiniteVec3(factor, "scale");
  if (factor.x === 0 || factor.y === 0 || factor.z === 0) {
    throw new Error("scale: components must all be non-zero");
  }
  return factor;
}

/** Finalize a transformed clone → SolidResult with bbox + volume refreshed. */
function finalize(geom: THREE.BufferGeometry): SolidResult {
  geom.computeBoundingBox();
  geom.computeVertexNormals();
  return {
    mesh: geom,
    bbox: exportBoundingBox(geom),
    volumeMm3: computeVolumeMm3(geom),
  };
}

/**
 * Build a rigid-body matrix with pivot semantics:
 *   M = Tᴏ · Translate · Origin · Rotate · Scale · Origin⁻¹
 *
 * Where Tᴏ is the post-translation offset. Pass `origin` as `{x:0,y:0,z:0}`
 * when you don't need a pivot.
 */
function buildMatrix(opts: {
  translate?: Vec3;
  rotate?: { axis: Vec3; angleDeg: number };
  scale?: Vec3;
  origin: Vec3;
}): THREE.Matrix4 {
  const { translate, rotate, scale, origin } = opts;

  const toOrigin = new THREE.Matrix4().makeTranslation(
    -origin.x,
    -origin.y,
    -origin.z
  );
  const fromOrigin = new THREE.Matrix4().makeTranslation(
    origin.x,
    origin.y,
    origin.z
  );

  const S = new THREE.Matrix4();
  if (scale) S.makeScale(scale.x, scale.y, scale.z);

  const R = new THREE.Matrix4();
  if (rotate) {
    const axis = new THREE.Vector3(
      rotate.axis.x,
      rotate.axis.y,
      rotate.axis.z
    ).normalize();
    const angleRad = (rotate.angleDeg * Math.PI) / 180;
    R.makeRotationAxis(axis, angleRad);
  }

  // Pivoted core: Origin · R · S · Origin⁻¹
  // Matrix4.multiply is right-multiply: A.multiply(B) ⇒ A · B.
  const core = new THREE.Matrix4()
    .multiply(fromOrigin)
    .multiply(R)
    .multiply(S)
    .multiply(toOrigin);

  const T = new THREE.Matrix4();
  if (translate) T.makeTranslation(translate.x, translate.y, translate.z);

  return new THREE.Matrix4().multiply(T).multiply(core);
}

/* ------------------------------------------------------------ primitives */

/** Translate a geometry by `offset` mm. Returns a fresh SolidResult. */
export function translate(
  geom: THREE.BufferGeometry,
  offset: Vec3
): SolidResult {
  assertFiniteVec3(offset, "translate");
  const clone = geom.clone();
  const M = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z);
  clone.applyMatrix4(M);
  return finalize(clone);
}

/**
 * Rotate a geometry around `axis` by `angleDeg` degrees, pivoting around
 * `origin` (default 0,0,0). Axis is normalized internally.
 */
export function rotate(
  geom: THREE.BufferGeometry,
  axis: Vec3,
  angleDeg: number,
  origin: Vec3 = ORIGIN_ZERO
): SolidResult {
  assertNonZeroVec3(axis, "rotate.axis");
  if (!Number.isFinite(angleDeg)) {
    throw new Error("rotate: angleDeg must be a finite number");
  }
  assertFiniteVec3(origin, "rotate.origin");
  const clone = geom.clone();
  const M = buildMatrix({
    rotate: { axis, angleDeg },
    origin,
  });
  clone.applyMatrix4(M);
  return finalize(clone);
}

/**
 * Scale a geometry by `factor` (uniform if number, component-wise if Vec3),
 * pivoting around `origin` (default 0,0,0). Any zero component is rejected.
 */
export function scale(
  geom: THREE.BufferGeometry,
  factor: Vec3 | number,
  origin: Vec3 = ORIGIN_ZERO
): SolidResult {
  const s = toScaleVec3(factor);
  assertFiniteVec3(origin, "scale.origin");
  const clone = geom.clone();
  const M = buildMatrix({ scale: s, origin });
  clone.applyMatrix4(M);
  return finalize(clone);
}

/* ------------------------------------------------------------ aggregate */

/**
 * Apply translate + rotate + scale in a single matrix composition.
 * Order: T · Origin · R · S · Origin⁻¹.
 */
export function transform(
  geom: THREE.BufferGeometry,
  options: TransformOptions
): SolidResult {
  const origin = options.origin ?? ORIGIN_ZERO;
  assertFiniteVec3(origin, "transform.origin");

  if (options.translate) assertFiniteVec3(options.translate, "transform.translate");
  if (options.rotate) {
    assertNonZeroVec3(options.rotate.axis, "transform.rotate.axis");
    if (!Number.isFinite(options.rotate.angleDeg)) {
      throw new Error("transform.rotate.angleDeg: must be a finite number");
    }
  }
  const scaleVec = options.scale !== undefined ? toScaleVec3(options.scale) : undefined;

  const clone = geom.clone();
  const M = buildMatrix({
    translate: options.translate,
    rotate: options.rotate,
    scale: scaleVec,
    origin,
  });
  clone.applyMatrix4(M);
  return finalize(clone);
}
