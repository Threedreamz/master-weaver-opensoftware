/**
 * Wavefront OBJ parser for server-side mesh analysis.
 * Returns triangle data compatible with @opensoftware/slicer-core mesh analyzer.
 */
import type { Triangle, MeshData } from "../mesh-analyzer";

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
 * Parse a face index token from an OBJ `f` line.
 * Formats: "v", "v/vt/vn", "v//vn", "v/vt"
 * Returns { vi, ni } where vi is vertex index (0-based) and ni is normal index (0-based) or -1.
 */
function parseFaceIndex(token: string): { vi: number; ni: number } {
  const parts = token.split("/");
  const vi = parseInt(parts[0], 10) - 1; // OBJ is 1-indexed
  let ni = -1;
  if (parts.length === 3 && parts[2] !== "") {
    ni = parseInt(parts[2], 10) - 1;
  }
  return { vi, ni };
}

/**
 * Parse an OBJ file buffer into MeshData.
 */
export function parseOBJ(buffer: Buffer): MeshData {
  const text = buffer.toString("utf-8");
  const lines = text.split("\n");

  const vertices: [number, number, number][] = [];
  const normals: [number, number, number][] = [];
  const faces: { vertexIndices: number[]; normalIndices: number[] }[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const parts = line.split(/\s+/);
    const keyword = parts[0];

    if (keyword === "v" && parts.length >= 4) {
      vertices.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3]),
      ]);
    } else if (keyword === "vn" && parts.length >= 4) {
      normals.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3]),
      ]);
    } else if (keyword === "f" && parts.length >= 4) {
      const vertexIndices: number[] = [];
      const normalIndices: number[] = [];
      for (let i = 1; i < parts.length; i++) {
        const { vi, ni } = parseFaceIndex(parts[i]);
        vertexIndices.push(vi);
        normalIndices.push(ni);
      }
      faces.push({ vertexIndices, normalIndices });
    }
  }

  // Build triangles
  const triangles: Triangle[] = [];
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const uniqueVertices = new Set<string>();

  // Update bounding box for a vertex
  function updateBounds(v: [number, number, number]) {
    for (let k = 0; k < 3; k++) {
      if (v[k] < min[k]) min[k] = v[k];
      if (v[k] > max[k]) max[k] = v[k];
    }
    uniqueVertices.add(`${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`);
  }

  // Track all used vertices for bounding box
  for (const v of vertices) {
    // Only track vertices that are actually referenced by faces
    // We'll compute bounds during triangle construction instead
  }

  for (const face of faces) {
    const { vertexIndices, normalIndices } = face;

    // Triangulate: fan from first vertex (works for tris, quads, and n-gons)
    for (let i = 1; i < vertexIndices.length - 1; i++) {
      const v0 = vertices[vertexIndices[0]];
      const v1 = vertices[vertexIndices[i]];
      const v2 = vertices[vertexIndices[i + 1]];

      if (!v0 || !v1 || !v2) continue;

      updateBounds(v0);
      updateBounds(v1);
      updateBounds(v2);

      // Use provided normals if available, otherwise compute from cross product
      let normal: [number, number, number];
      if (normals.length > 0 && normalIndices[0] >= 0 && normals[normalIndices[0]]) {
        normal = normals[normalIndices[0]];
      } else {
        normal = computeNormal(v0, v1, v2);
      }

      triangles.push({ v0, v1, v2, normal });
    }
  }

  return {
    triangles,
    vertexCount: uniqueVertices.size,
    boundingBox: { min, max },
  };
}
