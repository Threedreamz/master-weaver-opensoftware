/**
 * POST /api/opencad/import — session-or-api-key
 *
 * Imports a geometry from opencad into opensimulation as a TetMesh. Flow:
 *   1. Authenticate (session or X-API-Key, same pattern as /solve/*).
 *   2. Validate body with ImportOpenCadBody (+ local projectId extension).
 *   3. Verify target opensimulation project exists (and belongs to the
 *      session user when via="session").
 *   4. Fetch binary STL bytes from opencad via its server-to-server
 *      X-API-Key-gated export endpoint (same hybrid auth model as
 *      slicer-handoff.ts).
 *   5. Compute geometry_hash = SHA-256(stl bytes), first 16 hex chars.
 *   6. If a mesh row with the same hash exists → return it (dedup).
 *      Otherwise parse the binary STL → TriMesh → TetMesh via
 *      triMeshToTetMesh, inline-encode into storage_key, and insert.
 *   7. Respond with ImportOpenCadResponse.
 *
 * M1 constraints:
 *   - Binary STL only. ASCII STL returns 415 — detected by the exact
 *     binary-STL size formula (84 + 50 * triangleCount).
 *   - Inline storage: storage_key = "inline:<base64 of TetMesh JSON>".
 *     Meshes >5 MB inline-serialized → 413 (M2 ticket: R2 storage).
 *   - Any unexpected throw → 500 with { error: err.message }.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { opensimulationProjects, opensimulationMeshes } from "@opensoftware/db/opensimulation";
import { requireSessionOrApiKey } from "@/lib/auth-helpers";
import { ImportOpenCadBody } from "@/lib/api-contracts";
import { triMeshToTetMesh } from "@/lib/solvers/mesh-tet";
import { bboxOfVertices, type TriMesh } from "@/lib/kernel-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ constants */

const MAX_INLINE_BYTES = 5 * 1024 * 1024; // 5 MB

/* -------------------------------------------------------------- request shape */

const RequestBody = ImportOpenCadBody.extend({
  projectId: z.string().min(1),
});

/* -------------------------------------------------------- binary STL parser */

/**
 * Parse a binary STL buffer into a TriMesh with deduplicated vertices.
 * Layout: 80-byte header, uint32 triangle count, then per-triangle:
 *   float32[3] normal + float32[3]*3 vertices + uint16 attribute (84 + 50*N bytes).
 * Vertex dedup uses a string key rounded to 6 decimal places — the same
 * tolerance the CAD exporters round to when tessellating.
 */
function parseBinaryStl(bytes: Uint8Array): TriMesh {
  if (bytes.byteLength < 84) {
    throw new Error("BINARY_STL_TRUNCATED");
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triCount = dv.getUint32(80, true);
  const expected = 84 + 50 * triCount;
  if (expected !== bytes.byteLength) {
    throw new Error("BINARY_STL_SIZE_MISMATCH");
  }

  const vertexMap = new Map<string, number>();
  const verts: number[] = [];
  const indices: number[] = [];

  const keyFor = (x: number, y: number, z: number) =>
    `${x.toFixed(6)}|${y.toFixed(6)}|${z.toFixed(6)}`;

  for (let t = 0; t < triCount; t++) {
    const base = 84 + t * 50 + 12; // skip 12-byte normal
    for (let v = 0; v < 3; v++) {
      const off = base + v * 12;
      const x = dv.getFloat32(off + 0, true);
      const y = dv.getFloat32(off + 4, true);
      const z = dv.getFloat32(off + 8, true);
      const k = keyFor(x, y, z);
      let idx = vertexMap.get(k);
      if (idx === undefined) {
        idx = verts.length / 3;
        verts.push(x, y, z);
        vertexMap.set(k, idx);
      }
      indices.push(idx);
    }
  }

  const vertices = new Float32Array(verts);
  return {
    vertices,
    indices: new Uint32Array(indices),
    bbox: bboxOfVertices(vertices),
  };
}

/* ----------------------------------------------------------------- handler */

export async function POST(req: NextRequest) {
  try {
    const auth = await requireSessionOrApiKey(req);
    if (auth instanceof NextResponse) return auth;

    const raw = await req.json().catch(() => null);
    const parsed = RequestBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_BODY", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const body = parsed.data;

    // Verify target project exists and (for sessions) belongs to the user.
    const projectRows = await db
      .select()
      .from(opensimulationProjects)
      .where(
        and(
          eq(opensimulationProjects.id, body.projectId),
          isNull(opensimulationProjects.deletedAt),
        ),
      )
      .limit(1);

    const project = projectRows[0];
    if (!project) {
      return NextResponse.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });
    }
    if (auth.via === "session" && project.userId !== auth.userId) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // Fetch binary STL from opencad via server-to-server x-api-key.
    const opencadUrl = process.env.OPENCAD_URL;
    const apiKey = process.env.OPENSOFTWARE_API_KEY;
    if (!opencadUrl || !apiKey) {
      return NextResponse.json({ error: "OPENCAD_NOT_CONFIGURED" }, { status: 503 });
    }

    const qs = new URLSearchParams({ format: "stl", tessellation: body.tessellation });
    const exportUrl = `${opencadUrl.replace(/\/+$/, "")}/api/projects/${encodeURIComponent(body.openCadProjectId)}/export?${qs.toString()}`;
    const res = await fetch(exportUrl, { headers: { "x-api-key": apiKey } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "OPENCAD_EXPORT_FAILED", details: { status: res.status } },
        { status: 502 },
      );
    }
    const stlBytes = new Uint8Array(await res.arrayBuffer());

    // ASCII STL detection: binary-STL has an exact size formula; anything
    // else is either ASCII or corrupt. Reject with 415 in M1.
    if (stlBytes.byteLength < 84) {
      return NextResponse.json({ error: "STL_TOO_SHORT" }, { status: 415 });
    }
    const triCount = new DataView(
      stlBytes.buffer,
      stlBytes.byteOffset,
      stlBytes.byteLength,
    ).getUint32(80, true);
    if (stlBytes.byteLength !== 84 + 50 * triCount) {
      return NextResponse.json(
        { error: "ASCII_STL_NOT_SUPPORTED_IN_M1" },
        { status: 415 },
      );
    }

    // Geometry hash (SHA-256, first 16 hex chars).
    const geometryHash = createHash("sha256")
      .update(stlBytes)
      .digest("hex")
      .slice(0, 16);

    // Dedup: return existing row if hash already present.
    const existing = await db
      .select()
      .from(opensimulationMeshes)
      .where(eq(opensimulationMeshes.geometryHash, geometryHash))
      .limit(1);

    if (existing[0]) {
      const row = existing[0];
      return NextResponse.json({
        meshId: row.id,
        geometryHash: row.geometryHash,
        vertexCount: row.vertexCount,
        elementCount: row.elementCount,
      });
    }

    // Parse STL → TriMesh → TetMesh, then inline-serialize.
    const triMesh = parseBinaryStl(stlBytes);
    const tetMesh = triMeshToTetMesh(triMesh);

    const tetMeshJson = JSON.stringify({
      vertices: Array.from(tetMesh.vertices),
      tets: Array.from(tetMesh.tets),
      bbox: tetMesh.bbox,
    });

    if (Buffer.byteLength(tetMeshJson, "utf8") > MAX_INLINE_BYTES) {
      return NextResponse.json(
        {
          error: "MESH_TOO_LARGE",
          details: "M1 uses inline storage, need R2 for large meshes",
        },
        { status: 413 },
      );
    }

    const storageKey = `inline:${Buffer.from(tetMeshJson, "utf8").toString("base64")}`;
    const vertexCount = tetMesh.vertices.length / 3;
    const elementCount = tetMesh.tets.length / 4;
    const sourceRef = body.versionId
      ? `${body.openCadProjectId}:${body.versionId}`
      : body.openCadProjectId;

    const inserted = await db
      .insert(opensimulationMeshes)
      .values({
        projectId: body.projectId,
        geometryHash,
        kind: "tet",
        vertexCount,
        elementCount,
        storageKey,
        source: "opencad",
        sourceRef,
      })
      .returning();

    const row = inserted[0];
    return NextResponse.json({
      meshId: row.id,
      geometryHash: row.geometryHash,
      vertexCount: row.vertexCount,
      elementCount: row.elementCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
