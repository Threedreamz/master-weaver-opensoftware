import * as THREE from "three";
import {
  type Point2,
  type SolidResult,
  exportBoundingBox,
  computeVolumeMm3,
} from "../cad-kernel";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SweepOptions {
  /** Accumulated twist from first to last path vertex, in degrees. Default 0. */
  twistDeg?: number;
  /** Treat the profile as a closed ring (last→first edge). Default true. */
  closedProfile?: boolean;
  /** Reserved for future subdivision along the path. Default 1. */
  segmentsPerEdge?: number;
}

const EPS_ZERO = 1e-20;
const EPS_PARALLEL = 1e-12;

function vec3FromPoint(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z);
}

function normalizeOrThrow(v: THREE.Vector3, msg: string): THREE.Vector3 {
  const lenSq = v.lengthSq();
  if (lenSq < EPS_ZERO) {
    throw new Error(msg);
  }
  return v.clone().multiplyScalar(1 / Math.sqrt(lenSq));
}

/**
 * Sweep a 2D profile along a 3D polyline path using a parallel-transport
 * frame. Emits a closed triangle-soup mesh with fan-triangulated end caps
 * (assumes a convex profile).
 */
export function sweep(
  profile: readonly Point2[],
  path: readonly Vec3[],
  options?: SweepOptions,
): SolidResult {
  const twistDeg = options?.twistDeg ?? 0;
  const closedProfile = options?.closedProfile ?? true;

  // ── 1. Validate ──────────────────────────────────────────────────────────
  if (path.length < 2) {
    throw new Error("sweep: path needs ≥2 points");
  }
  if (profile.length < 3) {
    throw new Error("sweep: profile needs ≥3 points");
  }
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1].x - path[i].x;
    const dy = path[i + 1].y - path[i].y;
    const dz = path[i + 1].z - path[i].z;
    if (dx * dx + dy * dy + dz * dz < EPS_ZERO) {
      throw new Error(`sweep: degenerate tangent at path segment ${i}`);
    }
  }

  const nPath = path.length;
  const nProfile = profile.length;
  const pathVec: THREE.Vector3[] = path.map(vec3FromPoint);

  // ── 2. Tangents at each path vertex ─────────────────────────────────────
  const tangents: THREE.Vector3[] = new Array(nPath);
  for (let i = 0; i < nPath; i++) {
    let t: THREE.Vector3;
    if (i === 0) {
      t = pathVec[1].clone().sub(pathVec[0]);
    } else if (i === nPath - 1) {
      t = pathVec[nPath - 1].clone().sub(pathVec[nPath - 2]);
    } else {
      t = pathVec[i + 1].clone().sub(pathVec[i - 1]);
    }
    tangents[i] = normalizeOrThrow(
      t,
      `sweep: degenerate tangent at path vertex ${i}`,
    );
  }

  // ── 3. Parallel-transport frames ────────────────────────────────────────
  const normals: THREE.Vector3[] = new Array(nPath);
  const binormals: THREE.Vector3[] = new Array(nPath);

  // Initial up — pick world Z unless nearly colinear with T_0.
  const worldUp =
    Math.abs(tangents[0].z) > 0.95
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);
  const n0 = normalizeOrThrow(
    new THREE.Vector3().crossVectors(worldUp, tangents[0]),
    "sweep: cannot build initial frame (tangent parallel to world up)",
  );
  const b0 = new THREE.Vector3().crossVectors(tangents[0], n0).normalize();
  normals[0] = n0;
  binormals[0] = b0;

  for (let i = 1; i < nPath; i++) {
    const prevT = tangents[i - 1];
    const curT = tangents[i];
    const axis = new THREE.Vector3().crossVectors(prevT, curT);
    if (axis.lengthSq() < EPS_PARALLEL) {
      // Parallel tangents — reuse prior frame.
      normals[i] = normals[i - 1].clone();
      binormals[i] = binormals[i - 1].clone();
      continue;
    }
    const q = new THREE.Quaternion().setFromUnitVectors(prevT, curT);
    const n = normals[i - 1].clone().applyQuaternion(q).normalize();
    const b = new THREE.Vector3().crossVectors(curT, n).normalize();
    normals[i] = n;
    binormals[i] = b;
  }

  // ── 4. Place profile rings ──────────────────────────────────────────────
  const twistRad = (twistDeg * Math.PI) / 180;
  const positions = new Float32Array(nPath * nProfile * 3);

  for (let i = 0; i < nPath; i++) {
    const theta = nPath > 1 ? (twistRad * i) / (nPath - 1) : 0;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const P = pathVec[i];
    const N = normals[i];
    const B = binormals[i];
    for (let j = 0; j < nProfile; j++) {
      const { x: px, y: py } = profile[j];
      const pxR = px * cosT - py * sinT;
      const pyR = px * sinT + py * cosT;
      const base = (i * nProfile + j) * 3;
      positions[base + 0] = P.x + pxR * N.x + pyR * B.x;
      positions[base + 1] = P.y + pxR * N.y + pyR * B.y;
      positions[base + 2] = P.z + pxR * N.z + pyR * B.z;
    }
  }

  // ── 5. Stitch adjacent rings + 6. caps ──────────────────────────────────
  const indices: number[] = [];
  const jLimit = closedProfile ? nProfile : nProfile - 1;

  for (let i = 0; i < nPath - 1; i++) {
    for (let j = 0; j < jLimit; j++) {
      const jNext = closedProfile ? (j + 1) % nProfile : j + 1;
      const a = i * nProfile + j;
      const b = (i + 1) * nProfile + j;
      const c = (i + 1) * nProfile + jNext;
      const d = i * nProfile + jNext;
      // Profile is CCW viewed down +T (i.e. CCW in the +N/+B plane). Outward
      // face normals must point away from the path centerline. For a +Z path
      // that means the −Y face (edge j=0→1 of the square) needs an outward
      // normal of −Y — which comes from winding (a, d, c) + (a, c, b),
      // i.e. the OPPOSITE of the naive (a, b, c) + (a, c, d) order.
      indices.push(a, d, c);
      indices.push(a, c, b);
    }
  }

  if (closedProfile) {
    // Profile is CCW in the local +N/+B plane viewed from +T, so the natural
    // fan winding (0, j, j+1) produces a triangle whose normal points +T.
    // Start cap (i = 0) must face −T_0 → reverse winding.
    // End cap   (i = nPath − 1) must face +T_{n−1} → natural winding.
    const startBase = 0;
    for (let j = 1; j < nProfile - 1; j++) {
      indices.push(startBase, startBase + j + 1, startBase + j);
    }
    const endBase = (nPath - 1) * nProfile;
    for (let j = 1; j < nProfile - 1; j++) {
      indices.push(endBase, endBase + j, endBase + j + 1);
    }
  }

  // ── 7. Build geometry + return ─────────────────────────────────────────
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
  geom.computeVertexNormals();

  return {
    mesh: geom,
    bbox: exportBoundingBox(geom),
    volumeMm3: computeVolumeMm3(geom),
  };
}
