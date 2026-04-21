export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { ImportFromOpencadBody } from "@/lib/api-contracts";
import { fetchOpencadExport, hashStreamSha256 } from "@/lib/opencad-proxy";
import type { BBox3 } from "@/lib/cam-kernel";

/**
 * Parse a binary STL header + triangle payload to extract bbox + tri count.
 * Binary STL: 80-byte header, uint32 triangle count, then N * 50 bytes where
 * each triangle is (normal: 3 floats, v0/v1/v2: 3 floats each, attr: uint16).
 *
 * Falls through silently for ASCII STL or malformed bytes (returns null);
 * caller treats that as "no geometry metadata".
 */
function parseBinaryStl(bytes: Uint8Array): { bbox: BBox3; triangleCount: number } | null {
  if (bytes.byteLength < 84) return null;
  // Heuristic: ASCII STL starts with the literal "solid " — skip.
  const leading = new TextDecoder().decode(bytes.subarray(0, 6));
  if (leading.toLowerCase().startsWith("solid ")) {
    // ASCII STL — binary parser doesn't apply. Tri-count parsing deferred.
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const triCount = view.getUint32(80, true);
  const expectedLen = 84 + triCount * 50;
  if (triCount === 0 || bytes.byteLength < expectedLen) return null;

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  let off = 84;
  for (let i = 0; i < triCount; i += 1) {
    // Skip normal (12 bytes)
    off += 12;
    for (let v = 0; v < 3; v += 1) {
      const x = view.getFloat32(off, true);
      const y = view.getFloat32(off + 4, true);
      const z = view.getFloat32(off + 8, true);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
      off += 12;
    }
    off += 2; // attribute byte count
  }

  if (!Number.isFinite(minX)) return null;
  return {
    bbox: { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } },
    triangleCount: triCount,
  };
}

/**
 * POST /api/opencad/import (X-API-Key)
 *
 * Pull STEP/STL geometry from a companion opencad service into a NEW opencam
 * project. M1 parses STL for bbox + triangle count; STEP parsing is deferred
 * to M2 (returns a zero-bbox placeholder and stores only the hash).
 *
 * TODO(M2): accept optional projectId to merge into an existing project;
 * implement STEP parsing for part bbox + feature-recognised hole list.
 */
export async function POST(req: NextRequest) {
  // API-key gate.
  const providedKey = req.headers.get("x-api-key") ?? "";
  const expectedKey = process.env.OPENSOFTWARE_API_KEY ?? "";
  if (!expectedKey || providedKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = ImportFromOpencadBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { openCadProjectId, versionId, role, format } = parsed.data;

  // Pull bytes from opencad (streaming, then buffered for hashing).
  let bytes: Uint8Array;
  let hash: string;
  let triangleCountHeader: number | null = null;
  try {
    const { body, triangleCount } = await fetchOpencadExport(openCadProjectId, format, {
      versionId,
      apiKey: expectedKey,
    });
    triangleCountHeader = triangleCount;
    const drained = await hashStreamSha256(body);
    hash = drained.hash;
    bytes = drained.bytes;
  } catch (err) {
    return NextResponse.json(
      { error: "opencad export failed", details: (err as Error).message },
      { status: 502 },
    );
  }

  // Extract bbox + triCount where possible.
  let bbox: BBox3 = {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 0, y: 0, z: 0 },
  };
  let triangleCount: number | undefined =
    triangleCountHeader !== null ? triangleCountHeader : undefined;

  if (format === "stl") {
    const parsed = parseBinaryStl(bytes);
    if (parsed) {
      bbox = parsed.bbox;
      triangleCount = parsed.triangleCount;
    }
  }
  // TODO(M2): STEP parsing — use OpenCascade.js to extract part bbox + holes.

  // We don't get a session here — the API-key flow creates rows owned by a
  // synthetic "opencad-import" user scoped per caller. Since the caller must
  // link this into their own session later, use the openCadProjectId as the
  // user-id for now. A proper caller-identity header is a TODO(M2).
  const importUserId = `opencad-import:${openCadProjectId}`;

  // Build stockBboxJson if role === "stock".
  const stockBboxJson =
    role === "stock"
      ? { min: bbox.min, max: bbox.max }
      : null;

  const [project] = await db
    .insert(schema.opencamProjects)
    .values({
      userId: importUserId,
      name: `From opencad: ${openCadProjectId}`,
      description: `Imported ${format.toUpperCase()} from opencad project ${openCadProjectId}${
        versionId ? ` @ ${versionId}` : ""
      }`,
      stockBboxJson,
      partGeometryHash: hash,
      linkedOpencadProjectId: openCadProjectId,
      linkedOpencadVersionId: versionId ?? null,
    })
    .returning();

  return NextResponse.json(
    {
      projectId: project.id,
      role,
      bbox,
      ...(typeof triangleCount === "number" ? { triangleCount } : {}),
      partGeometryHash: hash,
      importedHoles: [],
    },
    { status: 201 },
  );
}
