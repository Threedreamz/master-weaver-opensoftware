/**
 * Binary and ASCII STL parser for server-side mesh analysis.
 * Returns triangle data compatible with @opensoftware/openfarm-core mesh analyzer.
 */

interface Triangle {
  v0: [number, number, number];
  v1: [number, number, number];
  v2: [number, number, number];
  normal: [number, number, number];
}

interface MeshData {
  triangles: Triangle[];
  vertexCount: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

/**
 * Parse an STL file buffer (binary or ASCII) into MeshData.
 */
export function parseSTL(buffer: Buffer): MeshData {
  // Check if ASCII STL (starts with "solid")
  const header = buffer.subarray(0, 80).toString("ascii").trim();
  if (header.startsWith("solid") && !isBinarySTL(buffer)) {
    return parseASCII(buffer.toString("ascii"));
  }
  return parseBinary(buffer);
}

function isBinarySTL(buffer: Buffer): boolean {
  // Binary STL: 80-byte header + 4-byte triangle count + triangles
  if (buffer.length < 84) return false;
  const triangleCount = buffer.readUInt32LE(80);
  const expectedSize = 84 + triangleCount * 50;
  return Math.abs(buffer.length - expectedSize) < 10;
}

function parseBinary(buffer: Buffer): MeshData {
  const triangleCount = buffer.readUInt32LE(80);
  const triangles: Triangle[] = [];

  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const vertices = new Set<string>();

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    const normal: [number, number, number] = [
      buffer.readFloatLE(offset),
      buffer.readFloatLE(offset + 4),
      buffer.readFloatLE(offset + 8),
    ];
    offset += 12;

    const verts: [number, number, number][] = [];
    for (let j = 0; j < 3; j++) {
      const v: [number, number, number] = [
        buffer.readFloatLE(offset),
        buffer.readFloatLE(offset + 4),
        buffer.readFloatLE(offset + 8),
      ];
      verts.push(v);
      offset += 12;

      // Update bounding box
      for (let k = 0; k < 3; k++) {
        if (v[k] < min[k]) min[k] = v[k];
        if (v[k] > max[k]) max[k] = v[k];
      }
      vertices.add(`${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`);
    }

    // Skip attribute byte count
    offset += 2;

    triangles.push({
      v0: verts[0],
      v1: verts[1],
      v2: verts[2],
      normal,
    });
  }

  return {
    triangles,
    vertexCount: vertices.size,
    boundingBox: { min, max },
  };
}

function parseASCII(text: string): MeshData {
  const triangles: Triangle[] = [];
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const vertices = new Set<string>();

  const lines = text.split("\n").map((l) => l.trim());
  let currentNormal: [number, number, number] = [0, 0, 0];
  let currentVerts: [number, number, number][] = [];

  for (const line of lines) {
    if (line.startsWith("facet normal")) {
      const parts = line.split(/\s+/);
      currentNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])];
      currentVerts = [];
    } else if (line.startsWith("vertex")) {
      const parts = line.split(/\s+/);
      const v: [number, number, number] = [parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])];
      currentVerts.push(v);
      for (let k = 0; k < 3; k++) {
        if (v[k] < min[k]) min[k] = v[k];
        if (v[k] > max[k]) max[k] = v[k];
      }
      vertices.add(`${v[0].toFixed(4)},${v[1].toFixed(4)},${v[2].toFixed(4)}`);
    } else if (line.startsWith("endfacet") && currentVerts.length === 3) {
      triangles.push({
        v0: currentVerts[0],
        v1: currentVerts[1],
        v2: currentVerts[2],
        normal: currentNormal,
      });
    }
  }

  return {
    triangles,
    vertexCount: vertices.size,
    boundingBox: { min, max },
  };
}
