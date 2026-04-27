/**
 * Forward kinematics for arbitrary joint trees.
 *
 * Domain-agnostic: works for anthropomorphic hands (17-DOF), robotic arms
 * (7-DOF), quadruped legs, or any tree of revolute joints rotating about a
 * principal axis ("x" | "y" | "z") in their local frame.
 *
 * Matrices are column-major Float32Array(16); m[col * 4 + row] per kernel-types.
 */

import {
  Vec3,
  Mat4,
  Joint,
  JointAxis,
  mat4Identity,
  vec3,
} from "../kernel-types";

export interface JointTransform {
  name: string;
  position: Vec3;
  rotation: Mat4;
}

export interface ForwardKinematicsResult {
  transforms: JointTransform[];
  endEffector: { position: Vec3 };
}

/**
 * Build a column-major 4x4 rotation matrix around a principal axis.
 * Standard right-handed convention.
 */
export function rotationMatrix(axis: JointAxis, angle: number): Mat4 {
  const m = mat4Identity();
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  if (axis === "x") {
    m[5] = c;
    m[6] = s;
    m[9] = -s;
    m[10] = c;
  } else if (axis === "y") {
    m[0] = c;
    m[2] = -s;
    m[8] = s;
    m[10] = c;
  } else {
    m[0] = c;
    m[1] = s;
    m[4] = -s;
    m[5] = c;
  }

  return m;
}

/**
 * Multiply two column-major 4x4 matrices. Returns a fresh Mat4.
 * Result C = A * B where (C v) = A (B v).
 */
export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out as Mat4;
}

/**
 * Apply a 4x4 homogeneous transform to a point (implicit w = 1).
 */
export function transformPoint(m: Mat4, v: Vec3): Vec3 {
  const x = m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12];
  const y = m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13];
  const z = m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14];
  return vec3(x, y, z);
}

/**
 * Extract the translation column (m[12..14]) from a column-major 4x4.
 */
export function mat4Translation(m: Mat4): Vec3 {
  return vec3(m[12], m[13], m[14]);
}

function translationMatrix(offset: Vec3): Mat4 {
  const m = mat4Identity();
  m[12] = offset.x;
  m[13] = offset.y;
  m[14] = offset.z;
  return m;
}

/**
 * Walk a joint tree depth-first. For each joint:
 *   world_i = parent_world * translate(offset_i) * rotate(axis_i, angle_i)
 * Record (name, position, rotation) per joint in DFS visitation order.
 */
export function forwardKinematics(root: Joint): ForwardKinematicsResult {
  const transforms: JointTransform[] = [];

  const visit = (joint: Joint, parentWorld: Mat4): void => {
    const localT = translationMatrix(joint.offset);
    const localR = rotationMatrix(joint.axis, joint.angle);
    const afterT = mat4Multiply(parentWorld, localT);
    const world = mat4Multiply(afterT, localR);

    transforms.push({
      name: joint.name,
      position: transformPoint(world, vec3(0, 0, 0)),
      rotation: world,
    });

    const children = joint.children ?? [];
    for (const child of children) {
      visit(child, world);
    }
  };

  visit(root, mat4Identity());

  // DFS end-effector = last joint visited. For a chain this is the leaf tip;
  // for a tree it's the last leaf of the rightmost branch — callers with
  // multi-branch trees typically read specific transforms by name instead.
  const last = transforms[transforms.length - 1];
  return {
    transforms,
    endEffector: { position: last.position },
  };
}
