/**
 * opencad — STEP importer (M1 STUB)
 *
 * Real STEP (ISO 10303-21) requires a B-Rep kernel. OpenCascade WASM is the
 * planned v2 backend but is not bundled in M1 — loading OCCT adds ~25MB to
 * the server bundle and requires a WASM build step we haven't wired yet.
 *
 * For M1 this function short-circuits with a warning-only result. The API
 * route MUST surface the warning to the user ("Please upload STL or 3MF")
 * rather than pretending the import succeeded.
 *
 * Contract: same shape as importSTL/import3MF so the route handler can
 * switch on format without branching on the result type.
 */
import * as THREE from "three";

export interface ImportSTEPResult {
  geometry: THREE.BufferGeometry;           // always empty in M1
  triangleCount: number;                    // always 0 in M1
  bbox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  warnings: string[];
}

/**
 * Drain the input stream before returning so the upstream HTTP request body
 * is fully consumed — leaving an un-read stream mid-request can cause some
 * Node HTTP stacks to hold the socket open.
 */
async function drain(stream: ReadableStream<Uint8Array>): Promise<void> {
  const reader = stream.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done } = await reader.read();
    if (done) break;
  }
}

export async function importSTEP(stream: ReadableStream<Uint8Array>, _filename: string): Promise<ImportSTEPResult> {
  await drain(stream);

  const empty = new THREE.BufferGeometry();
  empty.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));

  return {
    geometry: empty,
    triangleCount: 0,
    bbox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    warnings: ["STEP import requires OpenCascade WASM — not yet in M1. Please upload STL or 3MF."],
  };
}
