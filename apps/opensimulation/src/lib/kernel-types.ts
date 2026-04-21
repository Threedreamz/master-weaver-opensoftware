/**
 * opensimulation — kernel types
 *
 * Canonical geometry + physics types shared by all solvers + API routes.
 * Units: SI (m, kg, s, K, Pa) unless explicitly noted. Mesh arrays are
 * Float32Array (vertices) + Uint32Array (connectivity) for zero-copy.
 */

/* ---------------------------------------------------------------- Vec3 + Mat4 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Column-major 4x4 matrix as flat Float32Array(16). m[col * 4 + row]. */
export type Mat4 = Float32Array;

/** Construct a new Vec3. */
export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

/** Return a fresh column-major 4x4 identity matrix. */
export function mat4Identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

/* ---------------------------------------------------------------- BBox3 */

export interface BBox3 {
  min: Vec3;
  max: Vec3;
}

/** Compute axis-aligned bounding box from a flat Float32Array of [x,y,z,...] triples. */
export function bboxOfVertices(vertices: Float32Array): BBox3 {
  if (vertices.length === 0) {
    throw new Error("bboxOfVertices: empty vertex array");
  }
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

/* ---------------------------------------------------------------- Transform */

export interface Transform {
  position: Vec3;
  rotation: Mat4;
}

/** Identity transform: origin position + identity rotation matrix. */
export function transformIdentity(): Transform {
  return { position: vec3(0, 0, 0), rotation: mat4Identity() };
}

/* ---------------------------------------------------------------- Joints */

export type JointAxis = "x" | "y" | "z";

export interface JointLimits {
  min: number;
  max: number;
}

export interface Joint {
  name: string;
  axis: JointAxis;
  angle: number;
  offset: Vec3;
  limits?: JointLimits;
  children?: Joint[];
}

/** Denavit-Hartenberg parameters for serial chain IK. */
export interface DhParam {
  alpha: number; // rad
  a: number;     // m
  d: number;     // m
  theta: number; // rad
  limits?: JointLimits;
}

/* ---------------------------------------------------------------- Meshes */

export interface TriMesh {
  vertices: Float32Array; // [x,y,z, x,y,z, ...]
  indices: Uint32Array;   // [a,b,c, a,b,c, ...]
  bbox: BBox3;
}

export interface TetMesh {
  vertices: Float32Array; // [x,y,z, ...]
  tets: Uint32Array;      // [a,b,c,d, a,b,c,d, ...]
  bbox: BBox3;
}

/* ---------------------------------------------------------------- Material */

export interface Material {
  density: number;             // kg/m^3
  youngModulus: number;        // Pa
  poisson: number;             // dimensionless
  thermalConductivity: number; // W/(m*K)
  specificHeat: number;        // J/(kg*K)
  yieldStrength: number;       // Pa
}

/** Sensible defaults for steel — use as reference/fallback only. */
export const MATERIAL_STEEL: Material = {
  density: 7850,
  youngModulus: 2.0e11,
  poisson: 0.3,
  thermalConductivity: 50,
  specificHeat: 490,
  yieldStrength: 2.5e8,
};

/* ---------------------------------------------------------------- Boundary Conditions */

export type BcKind =
  | "fix"
  | "load"
  | "pressure"
  | "temperature"
  | "heat_flux"
  | "velocity";

export interface BoundaryCondition {
  kind: BcKind;
  nodeIds: number[];            // indices into mesh.vertices
  magnitude?: Vec3 | number;    // Vec3 for fix/load/velocity, number for temperature/heat_flux/pressure
}

/* ---------------------------------------------------------------- SolverError */

export type SolverErrorCode =
  | "SOLVER_DIVERGED"
  | "MATRIX_SINGULAR"
  | "BAD_INPUT"
  | "NOT_CONVERGED";

/** Typed error thrown by solvers on numerical failure or invalid input. */
export class SolverError extends Error {
  readonly code: SolverErrorCode;
  readonly details?: unknown;

  constructor(code: SolverErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "SolverError";
    this.code = code;
    this.details = details;
  }
}
