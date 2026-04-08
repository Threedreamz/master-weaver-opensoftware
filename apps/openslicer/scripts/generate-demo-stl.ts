/**
 * Generate a binary STL file for an overhang test piece.
 *
 * Geometry:
 * - Base: 20x20mm rectangle at z=0
 * - Pillar: 20x20mm vertical from z=0 to z=30mm
 * - Shelf 1: at z=15mm, extends 15mm in +X, 5mm thick, 20mm wide (45 deg overhang)
 * - Shelf 2: at z=25mm, extends 10mm in +X, 3mm thick, 20mm wide (60 deg overhang)
 * - Top: 20x20mm rectangle at z=30mm
 *
 * Binary STL format: 80-byte header + 4-byte uint32 triangle count +
 *   per triangle: 12-byte normal + 36-byte vertices (3 x vec3) + 2-byte attribute = 50 bytes
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

type Vec3 = [number, number, number];

interface Triangle {
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
}

/** Cross product of (b-a) x (c-a), normalized */
function computeNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const u: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n: Vec3 = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const len = Math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2);
  if (len === 0) return [0, 0, 0];
  return [n[0] / len, n[1] / len, n[2] / len];
}

/** Turn a quad (4 vertices, counter-clockwise when viewed from outside) into 2 triangles */
function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3): Triangle[] {
  return [
    { v0: a, v1: b, v2: c },
    { v0: a, v1: c, v2: d },
  ];
}

function generateOverhangTestPiece(): Triangle[] {
  const triangles: Triangle[] = [];

  // Pillar dimensions
  const px = 0, py = 0; // pillar origin
  const pw = 20, pd = 20, ph = 30; // width (X), depth (Y), height (Z)

  // --- Pillar ---

  // Bottom face (z=0), normal -Z
  triangles.push(...quad(
    [px, py, 0], [px + pw, py, 0], [px + pw, py + pd, 0], [px, py + pd, 0],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 }))); // flip for -Z normal

  // Top face (z=ph), normal +Z
  triangles.push(...quad(
    [px, py, ph], [px + pw, py, ph], [px + pw, py + pd, ph], [px, py + pd, ph],
  ));

  // Front face (y=0), normal -Y
  triangles.push(...quad(
    [px, py, 0], [px + pw, py, 0], [px + pw, py, ph], [px, py, ph],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 }))); // flip

  // Back face (y=pd), normal +Y
  triangles.push(...quad(
    [px, py + pd, 0], [px + pw, py + pd, 0], [px + pw, py + pd, ph], [px, py + pd, ph],
  ));

  // Left face (x=0), normal -X
  triangles.push(...quad(
    [px, py, 0], [px, py + pd, 0], [px, py + pd, ph], [px, py, ph],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 }))); // flip

  // Right face (x=pw), normal +X
  triangles.push(...quad(
    [px + pw, py, 0], [px + pw, py + pd, 0], [px + pw, py + pd, ph], [px + pw, py, ph],
  ));

  // --- Shelf 1: z=15, extends 15mm in +X, 5mm thick, 20mm wide (Y) ---
  // 45-degree overhang
  const s1x = pw; // starts at right face of pillar
  const s1w = 15; // extension in +X
  const s1z = 15; // bottom z
  const s1h = 5;  // thickness

  // Top face
  triangles.push(...quad(
    [s1x, py, s1z + s1h], [s1x + s1w, py, s1z + s1h],
    [s1x + s1w, py + pd, s1z + s1h], [s1x, py + pd, s1z + s1h],
  ));

  // Bottom face (the overhang surface!)
  triangles.push(...quad(
    [s1x, py, s1z], [s1x + s1w, py, s1z],
    [s1x + s1w, py + pd, s1z], [s1x, py + pd, s1z],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 })));

  // Front face
  triangles.push(...quad(
    [s1x, py, s1z], [s1x + s1w, py, s1z],
    [s1x + s1w, py, s1z + s1h], [s1x, py, s1z + s1h],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 })));

  // Back face
  triangles.push(...quad(
    [s1x, py + pd, s1z], [s1x + s1w, py + pd, s1z],
    [s1x + s1w, py + pd, s1z + s1h], [s1x, py + pd, s1z + s1h],
  ));

  // Right face (end of shelf)
  triangles.push(...quad(
    [s1x + s1w, py, s1z], [s1x + s1w, py + pd, s1z],
    [s1x + s1w, py + pd, s1z + s1h], [s1x + s1w, py, s1z + s1h],
  ));

  // --- Shelf 2: z=25, extends 10mm in +X, 3mm thick, 20mm wide (Y) ---
  // 60-degree (steeper) overhang
  const s2x = pw;
  const s2w = 10;
  const s2z = 25;
  const s2h = 3;

  // Top face
  triangles.push(...quad(
    [s2x, py, s2z + s2h], [s2x + s2w, py, s2z + s2h],
    [s2x + s2w, py + pd, s2z + s2h], [s2x, py + pd, s2z + s2h],
  ));

  // Bottom face (overhang)
  triangles.push(...quad(
    [s2x, py, s2z], [s2x + s2w, py, s2z],
    [s2x + s2w, py + pd, s2z], [s2x, py + pd, s2z],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 })));

  // Front face
  triangles.push(...quad(
    [s2x, py, s2z], [s2x + s2w, py, s2z],
    [s2x + s2w, py, s2z + s2h], [s2x, py, s2z + s2h],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 })));

  // Back face
  triangles.push(...quad(
    [s2x, py + pd, s2z], [s2x + s2w, py + pd, s2z],
    [s2x + s2w, py + pd, s2z + s2h], [s2x, py + pd, s2z + s2h],
  ));

  // Right face (end of shelf)
  triangles.push(...quad(
    [s2x + s2w, py, s2z], [s2x + s2w, py + pd, s2z],
    [s2x + s2w, py + pd, s2z + s2h], [s2x + s2w, py, s2z + s2h],
  ));

  return triangles;
}

/** Write triangles to binary STL buffer */
function trianglesToSTL(triangles: Triangle[]): Buffer {
  const HEADER_SIZE = 80;
  const TRIANGLE_SIZE = 50; // 12 (normal) + 36 (3 vertices) + 2 (attribute)
  const bufferSize = HEADER_SIZE + 4 + triangles.length * TRIANGLE_SIZE;
  const buffer = Buffer.alloc(bufferSize);

  // Header (80 bytes)
  const header = "OpenSlicer Demo - Overhang Test Piece";
  buffer.write(header, 0, "ascii");

  // Triangle count
  buffer.writeUInt32LE(triangles.length, 80);

  let offset = 84;
  for (const tri of triangles) {
    const normal = computeNormal(tri.v0, tri.v1, tri.v2);

    // Normal
    buffer.writeFloatLE(normal[0], offset); offset += 4;
    buffer.writeFloatLE(normal[1], offset); offset += 4;
    buffer.writeFloatLE(normal[2], offset); offset += 4;

    // Vertex 0
    buffer.writeFloatLE(tri.v0[0], offset); offset += 4;
    buffer.writeFloatLE(tri.v0[1], offset); offset += 4;
    buffer.writeFloatLE(tri.v0[2], offset); offset += 4;

    // Vertex 1
    buffer.writeFloatLE(tri.v1[0], offset); offset += 4;
    buffer.writeFloatLE(tri.v1[1], offset); offset += 4;
    buffer.writeFloatLE(tri.v1[2], offset); offset += 4;

    // Vertex 2
    buffer.writeFloatLE(tri.v2[0], offset); offset += 4;
    buffer.writeFloatLE(tri.v2[1], offset); offset += 4;
    buffer.writeFloatLE(tri.v2[2], offset); offset += 4;

    // Attribute byte count (unused)
    buffer.writeUInt16LE(0, offset); offset += 2;
  }

  return buffer;
}

export function generateDemoSTL(outputPath: string): { triangleCount: number; fileSizeBytes: number } {
  const triangles = generateOverhangTestPiece();
  const stlBuffer = trianglesToSTL(triangles);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, stlBuffer);

  return {
    triangleCount: triangles.length,
    fileSizeBytes: stlBuffer.length,
  };
}

// CLI entry point
if (require.main === module || process.argv[1]?.endsWith("generate-demo-stl.ts")) {
  const outputPath = process.argv[2] || "./data/models/demo-overhang-test.stl";
  const result = generateDemoSTL(outputPath);
  console.log(`Generated demo STL: ${outputPath}`);
  console.log(`  Triangles: ${result.triangleCount}`);
  console.log(`  File size: ${result.fileSizeBytes} bytes`);
}
