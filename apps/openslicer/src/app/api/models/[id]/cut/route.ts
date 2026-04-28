import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { parseSTL, computeMeshMetrics } from "@opensoftware/slicer-core";
import type { Triangle, MeshData } from "@opensoftware/slicer-core";
import { getModelById, createModel, updateModel } from "../../../../../db/queries/models";
import { resolveUser } from "../../../../../lib/internal-user";

const UPLOAD_DIR = join(process.cwd(), "data", "models");

// ---------- Geometry helpers ----------

type Vec3 = [number, number, number];

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Signed distance from a point to the plane defined by (planeNormal, planePoint). */
function signedDistance(point: Vec3, planeNormal: Vec3, planePoint: Vec3): number {
  return dot(sub(point, planePoint), planeNormal);
}

/** Compute the intersection point on the edge (a -> b) where the plane crosses. */
function edgePlaneIntersection(a: Vec3, b: Vec3, dA: number, dB: number): Vec3 {
  const t = dA / (dA - dB);
  return lerp(a, b, t);
}

/** Compute a face normal from three vertices. */
function faceNormal(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
  const u = sub(v1, v0);
  const v = sub(v2, v0);
  const n: Vec3 = [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
  const len = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
  if (len < 1e-12) return [0, 0, 1];
  return [n[0] / len, n[1] / len, n[2] / len];
}

// ---------- Mesh splitting ----------

interface SplitResult {
  above: Triangle[];
  below: Triangle[];
}

/**
 * Split a mesh along a plane.
 * - Triangles fully above the plane go to `above`.
 * - Triangles fully below go to `below`.
 * - Triangles crossing the plane are clipped and parts added to both sides.
 */
function splitMesh(
  triangles: Triangle[],
  planeNormal: Vec3,
  planePoint: Vec3
): SplitResult {
  const above: Triangle[] = [];
  const below: Triangle[] = [];

  for (const tri of triangles) {
    const verts: Vec3[] = [tri.v0, tri.v1, tri.v2];
    const dists = verts.map((v) => signedDistance(v, planeNormal, planePoint));

    // Classify: +1 above, -1 below, 0 on plane
    const signs = dists.map((d) => (d > 1e-6 ? 1 : d < -1e-6 ? -1 : 0));

    const aboveCount = signs.filter((s) => s > 0).length;
    const belowCount = signs.filter((s) => s < 0).length;

    // Fully above
    if (belowCount === 0) {
      above.push(tri);
      continue;
    }

    // Fully below
    if (aboveCount === 0) {
      below.push(tri);
      continue;
    }

    // Triangle crosses the plane — clip it
    clipTriangle(verts, dists, signs, tri.normal, above, below);
  }

  return { above, below };
}

/**
 * Clip a triangle that crosses the cutting plane.
 * Produces 1 triangle on one side and 2 triangles (a quad) on the other.
 */
function clipTriangle(
  verts: Vec3[],
  dists: number[],
  signs: number[],
  normal: Vec3,
  above: Triangle[],
  below: Triangle[]
) {
  // Find the lone vertex (the one on the opposite side from the other two)
  // We need to handle the case where one vertex is exactly on the plane
  let loneIdx = -1;
  if (signs[0] !== signs[1] && signs[0] !== signs[2] && signs[0] !== 0) {
    loneIdx = 0;
  } else if (signs[1] !== signs[0] && signs[1] !== signs[2] && signs[1] !== 0) {
    loneIdx = 1;
  } else if (signs[2] !== signs[0] && signs[2] !== signs[1] && signs[2] !== 0) {
    loneIdx = 2;
  } else {
    // Edge case: two vertices on plane, one off — just assign to one side
    if (signs.filter((s) => s > 0).length > 0) {
      above.push({ v0: verts[0], v1: verts[1], v2: verts[2], normal });
    } else {
      below.push({ v0: verts[0], v1: verts[1], v2: verts[2], normal });
    }
    return;
  }

  const otherIdx1 = (loneIdx + 1) % 3;
  const otherIdx2 = (loneIdx + 2) % 3;

  const loneVert = verts[loneIdx];
  const otherVert1 = verts[otherIdx1];
  const otherVert2 = verts[otherIdx2];

  // Compute intersection points
  const inter1 = edgePlaneIntersection(loneVert, otherVert1, dists[loneIdx], dists[otherIdx1]);
  const inter2 = edgePlaneIntersection(loneVert, otherVert2, dists[loneIdx], dists[otherIdx2]);

  // Lone side gets 1 triangle
  const loneTri: Triangle = {
    v0: loneVert,
    v1: inter1,
    v2: inter2,
    normal,
  };

  // Other side gets 2 triangles (quad split)
  const otherTri1: Triangle = {
    v0: inter1,
    v1: otherVert1,
    v2: otherVert2,
    normal,
  };
  const otherTri2: Triangle = {
    v0: inter1,
    v1: otherVert2,
    v2: inter2,
    normal,
  };

  if (signs[loneIdx] > 0) {
    // Lone vertex is above
    above.push(loneTri);
    below.push(otherTri1, otherTri2);
  } else {
    // Lone vertex is below
    below.push(loneTri);
    above.push(otherTri1, otherTri2);
  }
}

// ---------- STL writer ----------

function writeBinarySTL(triangles: Triangle[]): Buffer {
  const headerSize = 80;
  const countSize = 4;
  const triSize = 50; // 12 (normal) + 36 (3 vertices * 12 bytes) + 2 (attrib)
  const bufferSize = headerSize + countSize + triangles.length * triSize;
  const buffer = Buffer.alloc(bufferSize);

  // Header (80 bytes of zeros is fine)
  buffer.fill(0, 0, headerSize);

  // Triangle count
  buffer.writeUInt32LE(triangles.length, headerSize);

  let offset = headerSize + countSize;
  for (const tri of triangles) {
    // Normal
    buffer.writeFloatLE(tri.normal[0], offset);
    buffer.writeFloatLE(tri.normal[1], offset + 4);
    buffer.writeFloatLE(tri.normal[2], offset + 8);
    offset += 12;

    // Vertices
    for (const v of [tri.v0, tri.v1, tri.v2]) {
      buffer.writeFloatLE(v[0], offset);
      buffer.writeFloatLE(v[1], offset + 4);
      buffer.writeFloatLE(v[2], offset + 8);
      offset += 12;
    }

    // Attribute byte count
    buffer.writeUInt16LE(0, offset);
    offset += 2;
  }

  return buffer;
}

function computeBoundingBox(triangles: Triangle[]): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (const tri of triangles) {
    for (const v of [tri.v0, tri.v1, tri.v2]) {
      for (let i = 0; i < 3; i++) {
        if (v[i] < min[i]) min[i] = v[i];
        if (v[i] > max[i]) max[i] = v[i];
      }
    }
  }

  return { min, max };
}

// ---------- API route ----------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const u = await resolveUser(request);
  if (u instanceof NextResponse) return u;

  try {
    const { id } = await params;
    const body = await request.json();

    const { planeNormal, planePoint } = body as {
      planeNormal: Vec3;
      planePoint: Vec3;
    };

    if (!planeNormal || !planePoint) {
      return NextResponse.json(
        { error: "planeNormal and planePoint are required" },
        { status: 400 }
      );
    }

    // Load the model
    const model = getModelById(id);
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Read and parse the STL file
    const filePath = resolve(process.cwd(), model.filePath);
    const fileBuffer = readFileSync(filePath);

    let meshData: MeshData;
    try {
      meshData = parseSTL(fileBuffer);
    } catch {
      return NextResponse.json(
        { error: "Only STL files can be cut currently" },
        { status: 400 }
      );
    }

    if (meshData.triangles.length === 0) {
      return NextResponse.json(
        { error: "Model has no triangles" },
        { status: 400 }
      );
    }

    // Perform the split
    const { above, below } = splitMesh(meshData.triangles, planeNormal, planePoint);

    if (above.length === 0 || below.length === 0) {
      return NextResponse.json(
        { error: "Cutting plane does not intersect the model — both parts would be empty on one side" },
        { status: 400 }
      );
    }

    // Write both halves as new STL files
    mkdirSync(UPLOAD_DIR, { recursive: true });

    const baseName = model.name || "model";

    // --- Part A (above) ---
    const bufferA = writeBinarySTL(above);
    const hashA = createHash("sha256").update(bufferA).digest("hex").slice(0, 16);
    const filenameA = `${hashA}_${baseName}_top.stl`;
    const filePathA = join(UPLOAD_DIR, filenameA);
    writeFileSync(filePathA, bufferA);

    const modelA = createModel({
      name: `${baseName} (top)`,
      filename: `${baseName}_top.stl`,
      fileFormat: "stl",
      filePath: filePathA,
      fileSizeBytes: bufferA.length,
      fileHash: hashA,
      meshAnalyzed: false,
    });

    // Analyze part A
    let modelAResponse: Record<string, unknown> = {
      id: modelA.id,
      name: modelA.name,
      filename: modelA.filename,
      fileFormat: "stl",
      fileSizeBytes: bufferA.length,
      meshAnalyzed: false,
    };

    try {
      const metricsA = computeMeshMetrics({
        triangles: above,
        vertexCount: 0, // Will be recomputed
        boundingBox: computeBoundingBox(above),
      });

      updateModel(modelA.id, {
        triangleCount: metricsA.triangleCount,
        vertexCount: metricsA.vertexCount,
        boundingBoxX: metricsA.dimensions.x,
        boundingBoxY: metricsA.dimensions.y,
        boundingBoxZ: metricsA.dimensions.z,
        volumeCm3: metricsA.volumeCm3,
        surfaceAreaCm2: metricsA.surfaceAreaCm2,
        isManifold: metricsA.isManifold,
        meshAnalyzed: true,
      });

      modelAResponse = {
        ...modelAResponse,
        triangleCount: metricsA.triangleCount,
        boundingBox: metricsA.dimensions,
        volumeCm3: metricsA.volumeCm3,
        surfaceAreaCm2: metricsA.surfaceAreaCm2,
        isManifold: metricsA.isManifold,
        meshAnalyzed: true,
      };
    } catch {
      // Analysis failed — still return the model
    }

    // --- Part B (below) ---
    const bufferB = writeBinarySTL(below);
    const hashB = createHash("sha256").update(bufferB).digest("hex").slice(0, 16);
    const filenameB = `${hashB}_${baseName}_bottom.stl`;
    const filePathB = join(UPLOAD_DIR, filenameB);
    writeFileSync(filePathB, bufferB);

    const modelB = createModel({
      name: `${baseName} (bottom)`,
      filename: `${baseName}_bottom.stl`,
      fileFormat: "stl",
      filePath: filePathB,
      fileSizeBytes: bufferB.length,
      fileHash: hashB,
      meshAnalyzed: false,
    });

    let modelBResponse: Record<string, unknown> = {
      id: modelB.id,
      name: modelB.name,
      filename: modelB.filename,
      fileFormat: "stl",
      fileSizeBytes: bufferB.length,
      meshAnalyzed: false,
    };

    try {
      const metricsB = computeMeshMetrics({
        triangles: below,
        vertexCount: 0,
        boundingBox: computeBoundingBox(below),
      });

      updateModel(modelB.id, {
        triangleCount: metricsB.triangleCount,
        vertexCount: metricsB.vertexCount,
        boundingBoxX: metricsB.dimensions.x,
        boundingBoxY: metricsB.dimensions.y,
        boundingBoxZ: metricsB.dimensions.z,
        volumeCm3: metricsB.volumeCm3,
        surfaceAreaCm2: metricsB.surfaceAreaCm2,
        isManifold: metricsB.isManifold,
        meshAnalyzed: true,
      });

      modelBResponse = {
        ...modelBResponse,
        triangleCount: metricsB.triangleCount,
        boundingBox: metricsB.dimensions,
        volumeCm3: metricsB.volumeCm3,
        surfaceAreaCm2: metricsB.surfaceAreaCm2,
        isManifold: metricsB.isManifold,
        meshAnalyzed: true,
      };
    } catch {
      // Analysis failed — still return the model
    }

    return NextResponse.json({
      modelA: modelAResponse,
      modelB: modelBResponse,
    });
  } catch (err) {
    console.error("Cut operation failed:", err);
    return NextResponse.json(
      { error: "Cut operation failed" },
      { status: 500 }
    );
  }
}
