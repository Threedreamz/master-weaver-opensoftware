/**
 * opencad — browser geometry helpers.
 *
 * Thin Three.js wrappers used by Viewport.tsx and the workbench store to
 * materialise server-side evaluated meshes into BufferGeometry + compute
 * cumulative bounding boxes for the scene.
 *
 * Browser-safe: pulls only from `three`, no WASM / Node deps.
 */

import * as THREE from "three";
import type { z } from "zod";
import type { BBox as BBoxSchema } from "./api-contracts";

export type BBox = z.infer<typeof BBoxSchema>;

export interface FeatureMeshPayload {
  positions: number[] | Float32Array;
  indices: number[] | Uint32Array;
  normals?: number[] | Float32Array;
  uvs?: number[] | Float32Array;
}

/**
 * Build a BufferGeometry from raw position+index arrays returned by
 * `/api/feature/evaluate`. Computes vertex normals if none provided and
 * refreshes the bounding box/sphere so downstream Three.js culling works.
 */
export function meshFromFeatureResponse(feature: FeatureMeshPayload): THREE.BufferGeometry {
  const geom = new THREE.BufferGeometry();

  const positions =
    feature.positions instanceof Float32Array
      ? feature.positions
      : new Float32Array(feature.positions);
  geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const indices =
    feature.indices instanceof Uint32Array ? feature.indices : new Uint32Array(feature.indices);
  geom.setIndex(new THREE.BufferAttribute(indices, 1));

  if (feature.normals) {
    const normals =
      feature.normals instanceof Float32Array
        ? feature.normals
        : new Float32Array(feature.normals);
    geom.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  } else {
    geom.computeVertexNormals();
  }

  if (feature.uvs) {
    const uvs = feature.uvs instanceof Float32Array ? feature.uvs : new Float32Array(feature.uvs);
    geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  }

  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  return geom;
}

/**
 * Merge two axis-aligned bounding boxes. Either side may be null (treated as
 * identity — the other box is returned). Pure value — does not mutate inputs.
 */
export function unionBBox(a: BBox | null | undefined, b: BBox | null | undefined): BBox | null {
  if (!a && !b) return null;
  if (!a) return { min: { ...b!.min }, max: { ...b!.max } };
  if (!b) return { min: { ...a.min }, max: { ...a.max } };
  return {
    min: {
      x: Math.min(a.min.x, b.min.x),
      y: Math.min(a.min.y, b.min.y),
      z: Math.min(a.min.z, b.min.z),
    },
    max: {
      x: Math.max(a.max.x, b.max.x),
      y: Math.max(a.max.y, b.max.y),
      z: Math.max(a.max.z, b.max.z),
    },
  };
}

/** Convert an api-contracts BBox into a Three.js Box3 (e.g. for camera framing). */
export function bboxToBox3(b: BBox): THREE.Box3 {
  return new THREE.Box3(
    new THREE.Vector3(b.min.x, b.min.y, b.min.z),
    new THREE.Vector3(b.max.x, b.max.y, b.max.z),
  );
}

/** Diagonal length of a BBox — handy for camera distance heuristics. */
export function bboxDiagonal(b: BBox): number {
  const dx = b.max.x - b.min.x;
  const dy = b.max.y - b.min.y;
  const dz = b.max.z - b.min.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Midpoint of a BBox — handy for orbit controls target. */
export function bboxCenter(b: BBox): { x: number; y: number; z: number } {
  return {
    x: (b.min.x + b.max.x) / 2,
    y: (b.min.y + b.max.y) / 2,
    z: (b.min.z + b.max.z) / 2,
  };
}
