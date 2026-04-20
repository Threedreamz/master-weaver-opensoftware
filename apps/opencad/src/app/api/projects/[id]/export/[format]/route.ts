export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/export/[format]
 *
 * Streams a serialised representation of the project geometry back to the
 * caller — STL / 3MF / GLTF / STEP. Never buffers the full payload into a
 * single Response body — each exporter produces a ReadableStream<Uint8Array>
 * that we plumb straight into NextResponse so Node can back-pressure on
 * large meshes.
 *
 * Auth: session (FinderAuth / 3DreamzAuth). Returns 401 if missing.
 * Errors: 400 invalid params, 404 project not owned, 500 kernel failure.
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { ExportFormat, ExportQuery } from "@/lib/api-contracts";
import { exportProjectSTL } from "@/lib/exporters/stl";
import { exportProject3MF } from "@/lib/exporters/threemf";
import { exportProjectGLTF } from "@/lib/exporters/gltf";
import { exportProjectSTEP } from "@/lib/exporters/step";
import { resolveUser } from "@/lib/internal-user";

type RouteCtx = { params: Promise<{ id: string; format: string }> };

function contentTypeFor(format: string): string {
  switch (format) {
    case "stl":
      return "model/stl";
    case "3mf":
      return "model/3mf";
    case "gltf":
      return "model/gltf-binary";
    case "step":
      return "model/step";
    default:
      return "application/octet-stream";
  }
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;

  const { id: rawId, format: rawFormat } = await ctx.params;

  const formatParsed = ExportFormat.safeParse(rawFormat);
  if (!formatParsed.success) {
    return NextResponse.json(
      { error: "invalid_format", details: formatParsed.error.flatten() },
      { status: 400 },
    );
  }
  const format = formatParsed.data;

  const { searchParams } = new URL(req.url);
  const queryParsed = ExportQuery.safeParse({
    versionId: searchParams.get("versionId") ?? undefined,
    tessellation: searchParams.get("tessellation") ?? undefined,
    binary: searchParams.get("binary") ?? undefined,
  });
  if (!queryParsed.success) {
    return NextResponse.json(
      { error: "invalid_query", details: queryParsed.error.flatten() },
      { status: 400 },
    );
  }
  const { versionId, tessellation, binary } = queryParsed.data;

  // Ownership check — don't leak geometry of other users' projects.
  const [project] = await db
    .select({ id: schema.opencadProjects.id })
    .from(schema.opencadProjects)
    .where(
      and(
        eq(schema.opencadProjects.id, rawId),
        eq(schema.opencadProjects.userId, userId),
        isNull(schema.opencadProjects.deletedAt),
      ),
    )
    .limit(1);
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    let stream: ReadableStream<Uint8Array>;
    let filename: string;
    let triangleCount = 0;
    let sizeBytes = 0;
    let warnings: string[] = [];

    switch (format) {
      case "stl": {
        const r = await exportProjectSTL(project.id, { binary, tessellation, versionId });
        stream = r.stream;
        filename = r.filename;
        triangleCount = r.triangleCount;
        sizeBytes = r.sizeBytes;
        break;
      }
      case "3mf": {
        const r = await exportProject3MF(project.id, { tessellation, versionId });
        stream = r.stream;
        filename = r.filename;
        triangleCount = r.triangleCount;
        sizeBytes = r.sizeBytes;
        break;
      }
      case "gltf": {
        const r = await exportProjectGLTF(project.id, { tessellation, versionId, binary });
        stream = r.stream;
        filename = r.filename;
        triangleCount = r.triangleCount;
        sizeBytes = r.sizeBytes;
        break;
      }
      case "step": {
        const r = await exportProjectSTEP(project.id, { versionId, tessellation });
        stream = r.stream;
        filename = r.filename;
        triangleCount = r.triangleCount;
        sizeBytes = r.sizeBytes;
        warnings = r.warnings ?? [];
        break;
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": contentTypeFor(format),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Export-Format": format,
      "X-Triangle-Count": String(triangleCount),
      "X-Size-Bytes": String(sizeBytes),
      "Cache-Control": "no-store",
    };
    if (warnings.length > 0) {
      headers["X-Export-Warnings"] = encodeURIComponent(warnings.join("; "));
    }

    return new NextResponse(stream, { status: 200, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[opencad] export failed:", msg);
    return NextResponse.json({ error: "internal", details: msg }, { status: 500 });
  }
}
