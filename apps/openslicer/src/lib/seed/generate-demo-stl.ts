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
 *
 * Lives under src/lib/seed/ so Next.js' module tracer bundles it into the
 * standalone output. A previous copy at apps/openslicer/scripts/ was
 * invisible to the bundler (scripts/ sits outside src/ and was dynamically
 * imported), so the runtime import failed with ERR_MODULE_NOT_FOUND.
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

type Vec3 = [number, number, number];

interface Triangle {
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
}

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

function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3): Triangle[] {
  return [
    { v0: a, v1: b, v2: c },
    { v0: a, v1: c, v2: d },
  ];
}

function generateOverhangTestPiece(): Triangle[] {
  const triangles: Triangle[] = [];
  const px = 0, py = 0;
  const pw = 20, pd = 20, ph = 30;

  triangles.push(...quad(
    [px, py, 0], [px + pw, py, 0], [px + pw, py + pd, 0], [px, py + pd, 0],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 })));

  triangles.push(...quad(
    [px, py, ph], [px + pw, py, ph], [px + pw, py + pd, ph], [px, py + pd, ph],
  ));

  triangles.push(...quad(
    [px, py, 0], [px + pw, py, 0], [px + pw, py, ph], [px, py, ph],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 })));

  triangles.push(...quad(
    [px, py + pd, 0], [px + pw, py + pd, 0], [px + pw, py + pd, ph], [px, py + pd, ph],
  ));

  triangles.push(...quad(
    [px, py, 0], [px, py + pd, 0], [px, py + pd, ph], [px, py, ph],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 })));

  triangles.push(...quad(
    [px + pw, py, 0], [px + pw, py + pd, 0], [px + pw, py + pd, ph], [px + pw, py, ph],
  ));

  const s1x = pw, s1w = 15, s1z = 15, s1h = 5;
  triangles.push(...quad(
    [s1x, py, s1z + s1h], [s1x + s1w, py, s1z + s1h],
    [s1x + s1w, py + pd, s1z + s1h], [s1x, py + pd, s1z + s1h],
  ));
  triangles.push(...quad(
    [s1x, py, s1z], [s1x + s1w, py, s1z],
    [s1x + s1w, py + pd, s1z], [s1x, py + pd, s1z],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 })));
  triangles.push(...quad(
    [s1x, py, s1z], [s1x + s1w, py, s1z],
    [s1x + s1w, py, s1z + s1h], [s1x, py, s1z + s1h],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 })));
  triangles.push(...quad(
    [s1x, py + pd, s1z], [s1x + s1w, py + pd, s1z],
    [s1x + s1w, py + pd, s1z + s1h], [s1x, py + pd, s1z + s1h],
  ));
  triangles.push(...quad(
    [s1x + s1w, py, s1z], [s1x + s1w, py + pd, s1z],
    [s1x + s1w, py + pd, s1z + s1h], [s1x + s1w, py, s1z + s1h],
  ));

  const s2x = pw, s2w = 10, s2z = 25, s2h = 3;
  triangles.push(...quad(
    [s2x, py, s2z + s2h], [s2x + s2w, py, s2z + s2h],
    [s2x + s2w, py + pd, s2z + s2h], [s2x, py + pd, s2z + s2h],
  ));
  triangles.push(...quad(
    [s2x, py, s2z], [s2x + s2w, py, s2z],
    [s2x + s2w, py + pd, s2z], [s2x, py + pd, s2z],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 })));
  triangles.push(...quad(
    [s2x, py, s2z], [s2x + s2w, py, s2z],
    [s2x + s2w, py, s2z + s2h], [s2x, py, s2z + s2h],
  ).map(t => ({ v0: t.v2, v1: t.v1, v2: t.v0 })));
  triangles.push(...quad(
    [s2x, py + pd, s2z], [s2x + s2w, py + pd, s2z],
    [s2x + s2w, py + pd, s2z + s2h], [s2x, py + pd, s2z + s2h],
  ));
  triangles.push(...quad(
    [s2x + s2w, py, s2z], [s2x + s2w, py + pd, s2z],
    [s2x + s2w, py + pd, s2z + s2h], [s2x + s2w, py, s2z + s2h],
  ));

  return triangles;
}

function trianglesToSTL(triangles: Triangle[]): Buffer {
  const HEADER_SIZE = 80;
  const TRIANGLE_SIZE = 50;
  const bufferSize = HEADER_SIZE + 4 + triangles.length * TRIANGLE_SIZE;
  const buffer = Buffer.alloc(bufferSize);

  buffer.write("OpenSlicer Demo - Overhang Test Piece", 0, "ascii");
  buffer.writeUInt32LE(triangles.length, 80);

  let offset = 84;
  for (const tri of triangles) {
    const normal = computeNormal(tri.v0, tri.v1, tri.v2);
    buffer.writeFloatLE(normal[0], offset); offset += 4;
    buffer.writeFloatLE(normal[1], offset); offset += 4;
    buffer.writeFloatLE(normal[2], offset); offset += 4;
    buffer.writeFloatLE(tri.v0[0], offset); offset += 4;
    buffer.writeFloatLE(tri.v0[1], offset); offset += 4;
    buffer.writeFloatLE(tri.v0[2], offset); offset += 4;
    buffer.writeFloatLE(tri.v1[0], offset); offset += 4;
    buffer.writeFloatLE(tri.v1[1], offset); offset += 4;
    buffer.writeFloatLE(tri.v1[2], offset); offset += 4;
    buffer.writeFloatLE(tri.v2[0], offset); offset += 4;
    buffer.writeFloatLE(tri.v2[1], offset); offset += 4;
    buffer.writeFloatLE(tri.v2[2], offset); offset += 4;
    buffer.writeUInt16LE(0, offset); offset += 2;
  }

  return buffer;
}

export function generateDemoSTL(
  outputPath: string,
): { triangleCount: number; fileSizeBytes: number } {
  const triangles = generateOverhangTestPiece();
  const stlBuffer = trianglesToSTL(triangles);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, stlBuffer);

  return {
    triangleCount: triangles.length,
    fileSizeBytes: stlBuffer.length,
  };
}
