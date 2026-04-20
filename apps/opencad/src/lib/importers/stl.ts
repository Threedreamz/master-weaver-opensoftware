/**
 * opencad — STL importer (M1)
 *
 * Parses both ASCII and binary STL. Format detection:
 *   - Binary STL header is 80 bytes + uint32 triangle count + (50*N) bytes.
 *   - If bytes.byteLength == 84 + 50 * triCount → binary.
 *   - Also guard: ASCII STL starts with the literal "solid " and is valid UTF-8.
 *   - A file starting with "solid" but whose size matches the binary formula
 *     is STILL binary — some CAD tools emit binary files with "solid" in the
 *     80-byte header (Blender, MeshLab). Size-match wins over magic bytes.
 *
 * Output: a THREE.BufferGeometry with a position attribute + axis-aligned bbox.
 * Normals from the STL header are ignored — the kernel recomputes them if
 * needed for rendering / lighting.
 */
import * as THREE from "three";

export interface ImportSTLResult {
  geometry: THREE.BufferGeometry;
  triangleCount: number;
  bbox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
}

/**
 * Consume the ReadableStream into a single Uint8Array. STL is small enough
 * (triangle soup, no compression) that holding it in memory once is fine —
 * openslicer does the same in `slicer-core/parseModel`. The upstream route
 * handler caps at MAX_UPLOAD_BYTES (500MB) before we ever get here.
 */
async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function isBinarySTL(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 84) return false;
  // Triangle count is at offset 80, little-endian uint32.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triCount = view.getUint32(80, true);
  const expectedSize = 84 + 50 * triCount;
  // Size-match is the authoritative signal. Some binary STLs have "solid" as
  // the first 5 bytes of their 80-byte header — magic-byte sniffing alone is
  // unreliable.
  return bytes.byteLength === expectedSize;
}

function parseBinarySTL(bytes: Uint8Array): { positions: Float32Array; triangleCount: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triCount = view.getUint32(80, true);
  const positions = new Float32Array(triCount * 9);
  let o = 84;
  for (let i = 0; i < triCount; i++) {
    // Skip the 12-byte normal (3 floats). We'll let three recompute normals.
    o += 12;
    for (let v = 0; v < 3; v++) {
      positions[i * 9 + v * 3 + 0] = view.getFloat32(o, true); o += 4;
      positions[i * 9 + v * 3 + 1] = view.getFloat32(o, true); o += 4;
      positions[i * 9 + v * 3 + 2] = view.getFloat32(o, true); o += 4;
    }
    // attribute byte count (uint16)
    o += 2;
  }
  return { positions, triangleCount: triCount };
}

function parseAsciiSTL(text: string): { positions: Float32Array; triangleCount: number } {
  // ASCII grammar: repeated `facet normal ... outer loop  vertex x y z × 3  endloop endfacet`.
  // We extract vertex triples with a single regex sweep — robust enough for
  // hand-edited and CAD-generated ASCII STLs.
  const vertexRe = /vertex\s+(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s+(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s+(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)/g;
  const verts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = vertexRe.exec(text)) !== null) {
    verts.push(Number.parseFloat(m[1]));
    verts.push(Number.parseFloat(m[2]));
    verts.push(Number.parseFloat(m[3]));
  }
  if (verts.length % 9 !== 0) {
    throw new Error(`ASCII STL parse: vertex count ${verts.length / 3} is not a multiple of 3 triangles`);
  }
  return { positions: new Float32Array(verts), triangleCount: verts.length / 9 };
}

function computeBBox(positions: Float32Array): ImportSTLResult["bbox"] {
  if (positions.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  }
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
}

export async function importSTL(stream: ReadableStream<Uint8Array>, _filename: string): Promise<ImportSTLResult> {
  const bytes = await streamToBytes(stream);

  let parsed: { positions: Float32Array; triangleCount: number };
  if (isBinarySTL(bytes)) {
    parsed = parseBinarySTL(bytes);
  } else {
    // Decode as UTF-8 — ASCII STLs are 7-bit clean so this is safe.
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (!/^\s*solid\s/i.test(text)) {
      throw new Error("STL parse: file is neither binary (size mismatch) nor ASCII (missing 'solid' header)");
    }
    parsed = parseAsciiSTL(text);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(parsed.positions, 3));
  geometry.computeBoundingBox();
  // Normals are deliberately NOT computed here — the cad-kernel decides
  // whether flat / smooth normals are appropriate based on downstream use.

  return {
    geometry,
    triangleCount: parsed.triangleCount,
    bbox: computeBBox(parsed.positions),
  };
}
