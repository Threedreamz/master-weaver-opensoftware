/**
 * 3MF (3D Manufacturing Format) parser for server-side mesh analysis.
 * 3MF files are ZIP archives containing XML mesh data.
 * Returns triangle data compatible with @opensoftware/slicer-core mesh analyzer.
 */
import type { Triangle, MeshData } from "../mesh-analyzer";
import { unzipSync } from "fflate";

/**
 * Compute a face normal from three vertices using cross product.
 */
function computeNormal(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): [number, number, number] {
  const u: [number, number, number] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v: [number, number, number] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const nx = u[1] * v[2] - u[2] * v[1];
  const ny = u[2] * v[0] - u[0] * v[2];
  const nz = u[0] * v[1] - u[1] * v[0];
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len === 0) return [0, 0, 0];
  return [nx / len, ny / len, nz / len];
}

/**
 * Find the 3dmodel.model file in the ZIP entries.
 * Standard location is "3D/3dmodel.model" but we also search case-insensitively.
 */
function findModelFile(entries: Record<string, Uint8Array>): Uint8Array | null {
  // Try exact path first
  if (entries["3D/3dmodel.model"]) return entries["3D/3dmodel.model"];

  // Case-insensitive search
  for (const [path, data] of Object.entries(entries)) {
    if (path.toLowerCase() === "3d/3dmodel.model") return data;
    // Some tools place it at different paths
    if (path.toLowerCase().endsWith("3dmodel.model")) return data;
  }
  return null;
}

/**
 * Extract all vertex attributes from the XML model string.
 */
function extractVertices(xml: string): [number, number, number][] {
  const vertices: [number, number, number][] = [];
  const vertexRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"\s*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = vertexRegex.exec(xml)) !== null) {
    vertices.push([
      parseFloat(match[1]),
      parseFloat(match[2]),
      parseFloat(match[3]),
    ]);
  }
  return vertices;
}

/**
 * Extract all triangle indices from the XML model string.
 */
function extractTriangleIndices(xml: string): [number, number, number][] {
  const indices: [number, number, number][] = [];
  const triRegex = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"[^/]*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = triRegex.exec(xml)) !== null) {
    indices.push([
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
    ]);
  }
  return indices;
}

/**
 * Parse a 3MF file buffer into MeshData.
 * 3MF files are ZIP archives containing XML mesh definitions.
 */
export function parse3MF(buffer: Buffer): MeshData {
  // Decompress ZIP
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const entries = unzipSync(uint8);

  // Find the model file
  const modelData = findModelFile(entries);
  if (!modelData) {
    throw new Error("3MF archive does not contain a 3D model file (3D/3dmodel.model)");
  }

  // Decode XML
  const xml = new TextDecoder().decode(modelData);

  // Extract vertices and triangle indices
  const vertices = extractVertices(xml);
  if (vertices.length === 0) {
    throw new Error("3MF model contains no vertices");
  }

  const triIndices = extractTriangleIndices(xml);
  if (triIndices.length === 0) {
    throw new Error("3MF model contains no triangles");
  }

  // Build triangles
  const triangles: Triangle[] = [];
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const uniqueVertices = new Set<string>();

  function updateBounds(v: [number, number, number]) {
    for (let k = 0; k < 3; k++) {
      if (v[k] < min[k]) min[k] = v[k];
      if (v[k] > max[k]) max[k] = v[k];
    }
    uniqueVertices.add(`${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`);
  }

  for (const [i0, i1, i2] of triIndices) {
    const v0 = vertices[i0];
    const v1 = vertices[i1];
    const v2 = vertices[i2];

    if (!v0 || !v1 || !v2) continue;

    updateBounds(v0);
    updateBounds(v1);
    updateBounds(v2);

    const normal = computeNormal(v0, v1, v2);
    triangles.push({ v0, v1, v2, normal });
  }

  return {
    triangles,
    vertexCount: uniqueVertices.size,
    boundingBox: { min, max },
  };
}
