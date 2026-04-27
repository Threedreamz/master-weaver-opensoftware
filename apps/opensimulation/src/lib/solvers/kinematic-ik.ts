/**
 * Inverse kinematics for serial DH chains using Damped-Least-Squares (DLS).
 *
 * DLS is singularity-robust: as the Jacobian loses rank, the damping term
 * lambda^2 * I keeps the 3x3 system well-conditioned at the cost of a small
 * residual error — preferred over pseudo-inverse IK for real-time use on
 * short chains (4-7 joints) near workspace boundaries.
 */

import {
  Vec3,
  DhParam,
  SolverError,
  vec3,
} from "../kernel-types";

export interface IkResult {
  success: boolean;
  iterations: number;
  jointAngles: number[];
  finalError: number;
  endEffector: { position: Vec3 };
}

export interface IkInput {
  chain: DhParam[];
  target: { position: Vec3 };
  initial?: number[];
  lambda?: number;
  tol?: number;
  maxIter?: number;
}

type Mat4x4 = Float64Array;

function mat4Id(): Mat4x4 {
  const m = new Float64Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

function mat4Mul(a: Mat4x4, b: Mat4x4): Mat4x4 {
  const out = new Float64Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

function dhTransform(alpha: number, a: number, d: number, theta: number): Mat4x4 {
  // Standard DH: T = Rz(theta) * Tz(d) * Tx(a) * Rx(alpha)
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  const m = new Float64Array(16);
  m[0] = ct;
  m[1] = st;
  m[2] = 0;
  m[3] = 0;

  m[4] = -st * ca;
  m[5] = ct * ca;
  m[6] = sa;
  m[7] = 0;

  m[8] = st * sa;
  m[9] = -ct * sa;
  m[10] = ca;
  m[11] = 0;

  m[12] = a * ct;
  m[13] = a * st;
  m[14] = d;
  m[15] = 1;

  return m;
}

/**
 * Forward kinematics for a serial DH chain. Returns end-effector position.
 */
export function fkDhChain(chain: DhParam[], thetas: number[]): Vec3 {
  let world = mat4Id();
  for (let i = 0; i < chain.length; i++) {
    const link = chain[i];
    const local = dhTransform(link.alpha, link.a, link.d, thetas[i]);
    world = mat4Mul(world, local);
  }
  return vec3(world[12], world[13], world[14]);
}

/**
 * Accumulate per-frame world transforms for the chain. Returns an array of
 * Mat4x4 where entry i is the world transform at the origin of frame i (i.e.
 * AFTER applying links 0..i). Length n = chain.length.
 */
function accumulateFrames(chain: DhParam[], thetas: number[]): Mat4x4[] {
  const frames: Mat4x4[] = [];
  let world = mat4Id();
  for (let i = 0; i < chain.length; i++) {
    const link = chain[i];
    const local = dhTransform(link.alpha, link.a, link.d, thetas[i]);
    world = mat4Mul(world, local);
    frames.push(world);
  }
  return frames;
}

/**
 * Analytically compute the 3xN position Jacobian J, row-major, size 3*N.
 * For revolute DH joints, column i = z_{i-1} x (p_end - p_{i-1}), where
 * z_{i-1} and p_{i-1} are the axis and origin of the frame PRIOR to joint i.
 * Frame 0's predecessor is the world (z=[0,0,1], p=[0,0,0]).
 */
export function positionJacobian(chain: DhParam[], thetas: number[]): Float64Array {
  const n = chain.length;
  const frames = accumulateFrames(chain, thetas);
  const endFrame = frames[n - 1];
  const pEnd = [endFrame[12], endFrame[13], endFrame[14]];

  const J = new Float64Array(3 * n);

  for (let i = 0; i < n; i++) {
    let zx: number;
    let zy: number;
    let zz: number;
    let px: number;
    let py: number;
    let pz: number;

    if (i === 0) {
      zx = 0;
      zy = 0;
      zz = 1;
      px = 0;
      py = 0;
      pz = 0;
    } else {
      const prev = frames[i - 1];
      zx = prev[8];
      zy = prev[9];
      zz = prev[10];
      px = prev[12];
      py = prev[13];
      pz = prev[14];
    }

    const rx = pEnd[0] - px;
    const ry = pEnd[1] - py;
    const rz = pEnd[2] - pz;

    // Cross product z x r
    const cx = zy * rz - zz * ry;
    const cy = zz * rx - zx * rz;
    const cz = zx * ry - zy * rx;

    J[0 * n + i] = cx;
    J[1 * n + i] = cy;
    J[2 * n + i] = cz;
  }

  return J;
}

function invert3x3(m: Float64Array): Float64Array {
  const a = m[0], b = m[1], c = m[2];
  const d = m[3], e = m[4], f = m[5];
  const g = m[6], h = m[7], i = m[8];

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;

  const det = a * A + b * B + c * C;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-18) {
    throw new SolverError("SOLVER_DIVERGED", "IK Jacobian system singular");
  }

  const invDet = 1 / det;
  const out = new Float64Array(9);
  out[0] = A * invDet;
  out[1] = -(b * i - c * h) * invDet;
  out[2] = (b * f - c * e) * invDet;
  out[3] = B * invDet;
  out[4] = (a * i - c * g) * invDet;
  out[5] = -(a * f - c * d) * invDet;
  out[6] = C * invDet;
  out[7] = -(a * h - b * g) * invDet;
  out[8] = (a * e - b * d) * invDet;
  return out;
}

/**
 * Damped-Least-Squares IK:
 *   delta_theta = J^T * (J * J^T + lambda^2 * I_3)^{-1} * e
 * where e = target - p_end.
 */
export function inverseKinematics(input: IkInput): IkResult {
  const { chain, target } = input;
  const n = chain.length;

  const lambda = input.lambda ?? 0.1;
  const tol = input.tol ?? 1e-4;
  const maxIter = input.maxIter ?? 100;
  const lambdaSq = lambda * lambda;

  if (n === 0) {
    throw new SolverError("BAD_INPUT", "IK chain is empty");
  }

  const thetas: number[] = new Array(n);
  if (input.initial) {
    if (input.initial.length !== n) {
      throw new SolverError("BAD_INPUT", "initial thetas length mismatch");
    }
    for (let i = 0; i < n; i++) thetas[i] = input.initial[i];
  } else {
    for (let i = 0; i < n; i++) thetas[i] = chain[i].theta;
  }

  let iterations = 0;
  let finalError = Infinity;
  let pEnd = fkDhChain(chain, thetas);

  for (let iter = 0; iter < maxIter; iter++) {
    iterations = iter + 1;

    const ex = target.position.x - pEnd.x;
    const ey = target.position.y - pEnd.y;
    const ez = target.position.z - pEnd.z;
    finalError = Math.sqrt(ex * ex + ey * ey + ez * ez);

    if (finalError < tol) {
      return {
        success: true,
        iterations,
        jointAngles: thetas.slice(),
        finalError,
        endEffector: { position: pEnd },
      };
    }

    const J = positionJacobian(chain, thetas);

    // JJt = J * J^T, a 3x3 matrix. J is stored row-major as 3 rows of n.
    const JJt = new Float64Array(9);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += J[r * n + k] * J[c * n + k];
        }
        JJt[r * 3 + c] = sum;
      }
    }
    JJt[0] += lambdaSq;
    JJt[4] += lambdaSq;
    JJt[8] += lambdaSq;

    const JJtInv = invert3x3(JJt);

    // y = JJtInv * e, 3-vector
    const y0 = JJtInv[0] * ex + JJtInv[1] * ey + JJtInv[2] * ez;
    const y1 = JJtInv[3] * ex + JJtInv[4] * ey + JJtInv[5] * ez;
    const y2 = JJtInv[6] * ex + JJtInv[7] * ey + JJtInv[8] * ez;

    // delta_theta = J^T * y, length n
    for (let i = 0; i < n; i++) {
      const dt = J[0 * n + i] * y0 + J[1 * n + i] * y1 + J[2 * n + i] * y2;
      let next = thetas[i] + dt;
      const limits = chain[i].limits;
      if (limits) {
        if (next < limits.min) next = limits.min;
        if (next > limits.max) next = limits.max;
      }
      thetas[i] = next;
    }

    pEnd = fkDhChain(chain, thetas);
  }

  return {
    success: false,
    iterations,
    jointAngles: thetas.slice(),
    finalError,
    endEffector: { position: pEnd },
  };
}
