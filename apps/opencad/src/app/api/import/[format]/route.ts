export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/import/[format]
 *
 * Streaming upload of a CAD file (STL / 3MF / STEP) — we pass `request.body`
 * (a `ReadableStream<Uint8Array>`) straight to the importer without ever
 * calling `request.arrayBuffer()` or `request.formData()`. Those APIs buffer
 * the whole upload in RAM and OOM-kill the Next.js process for large files
 * (500 MB STLs = 1 GB RSS spike → Railway returns 502). See
 * `.claude/rules/known-pitfalls.md` → "Upload Proxy OOM".
 *
 * The expected Content-Type is `application/octet-stream` — clients MUST POST
 * the raw file bytes, NOT multipart/form-data. The hub's CAD import UI wires
 * fetch() with `{ body: fileStream, duplex: "half" }` (Node 20+ web-streams
 * requirement) plus `Content-Length` so we can reject oversize uploads early
 * with a 413 without reading a single byte.
 *
 * Query params:
 *   projectId — required; the owned project to attach the imported body to.
 *   filename  — optional override; defaults to `imported.<ext>`.
 *
 * Auth: session. 401 if missing.
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { ImportFormat } from "@/lib/api-contracts";
import { importSTL } from "@/lib/importers/stl";
import { import3MF } from "@/lib/importers/threemf";
import { importSTEP } from "@/lib/importers/step";

type RouteCtx = { params: Promise<{ format: string }> };

const MAX_UPLOAD_BYTES = (() => {
  const raw = process.env.MAX_UPLOAD_BYTES;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500 * 1024 * 1024; // 500 MB
})();

type ImporterResult = {
  geometry: unknown;
  triangleCount: number;
  bbox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  warnings?: string[];
};

async function runImporter(
  format: "stl" | "3mf" | "step" | "iges" | "obj" | "gltf",
  stream: ReadableStream<Uint8Array>,
  filename: string,
): Promise<ImporterResult> {
  switch (format) {
    case "stl":
      return importSTL(stream, filename) as Promise<ImporterResult>;
    case "3mf":
      return import3MF(stream, filename) as Promise<ImporterResult>;
    case "step":
      return importSTEP(stream, filename) as Promise<ImporterResult>;
    default:
      // Drain the stream so the socket doesn't hang, then bail.
      const reader = stream.getReader();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
      throw new Error(`importer not implemented for format: ${format}`);
  }
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const { format: rawFormat } = await ctx.params;
  const formatParsed = ImportFormat.safeParse(rawFormat);
  if (!formatParsed.success) {
    return NextResponse.json(
      { error: "invalid_format", details: formatParsed.error.flatten() },
      { status: 400 },
    );
  }
  const format = formatParsed.data;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const filenameQ = searchParams.get("filename");
  if (!projectId) {
    return NextResponse.json({ error: "missing_projectId" }, { status: 400 });
  }

  // Ownership check — reject before reading a single byte of the body.
  const [project] = await db
    .select({ id: schema.opencadProjects.id })
    .from(schema.opencadProjects)
    .where(
      and(
        eq(schema.opencadProjects.id, projectId),
        eq(schema.opencadProjects.userId, userId),
        isNull(schema.opencadProjects.deletedAt),
      ),
    )
    .limit(1);
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Early size gate from Content-Length — cheaper than streaming to overflow.
  const cl = req.headers.get("content-length");
  if (cl) {
    const n = Number.parseInt(cl, 10);
    if (Number.isFinite(n) && n > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "payload_too_large", details: { limitBytes: MAX_UPLOAD_BYTES, receivedBytes: n } },
        { status: 413 },
      );
    }
  }

  // Enforce application/octet-stream. Multipart would force formData() buffering.
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (ct && !ct.startsWith("application/octet-stream")) {
    return NextResponse.json(
      {
        error: "invalid_content_type",
        details: "expected application/octet-stream (raw file body); multipart uploads disabled to prevent OOM",
      },
      { status: 415 },
    );
  }

  if (!req.body) {
    return NextResponse.json({ error: "missing_body" }, { status: 400 });
  }

  const filename = (filenameQ && filenameQ.trim()) || `imported.${format}`;

  try {
    // Stream with an in-flight byte counter so bodies without Content-Length
    // still respect MAX_UPLOAD_BYTES. We wrap req.body in a TransformStream
    // that errors the pipeline once the counter exceeds the cap.
    let bytesSeen = 0;
    const capped = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytesSeen += chunk.byteLength;
        if (bytesSeen > MAX_UPLOAD_BYTES) {
          controller.error(new Error(`payload_too_large: exceeded ${MAX_UPLOAD_BYTES} bytes`));
          return;
        }
        controller.enqueue(chunk);
      },
    });
    const pipedStream = req.body.pipeThrough(capped);

    const result = await runImporter(format, pipedStream, filename);

    // Persist the imported body (metadata only; actual mesh bytes live in the
    // feature graph / geometry cache — not in the DB row).
    const storageKey = `opencad/imports/${project.id}/${Date.now()}-${filename}`;
    const [imported] = await db
      .insert(schema.opencadImportedBodies)
      .values({
        projectId: project.id,
        sourceFormat: format as "step" | "iges" | "stl" | "obj" | "3mf" | "brep",
        originalFilename: filename,
        storageKey,
      })
      .returning({ id: schema.opencadImportedBodies.id });

    // Create a feature node of kind=boolean referencing the imported body, so
    // the feature timeline can treat it as any other geometry input.
    const [last] = await db
      .select({ order: schema.opencadFeatures.order })
      .from(schema.opencadFeatures)
      .where(eq(schema.opencadFeatures.projectId, project.id))
      .orderBy(desc(schema.opencadFeatures.order))
      .limit(1);
    const nextOrder = (last?.order ?? -1) + 1;

    const [feature] = await db
      .insert(schema.opencadFeatures)
      .values({
        projectId: project.id,
        kind: "boolean",
        paramsJson: {
          op: "union",
          importedBodyId: imported.id,
          sourceFormat: format,
          originalFilename: filename,
        },
        parentIds: [],
        order: nextOrder,
      })
      .returning({ id: schema.opencadFeatures.id });

    return NextResponse.json(
      {
        projectId: project.id,
        importedFeatureId: feature.id,
        bbox: result.bbox,
        triangleCount: result.triangleCount,
        warnings: result.warnings ?? [],
      },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("payload_too_large")) {
      return NextResponse.json(
        { error: "payload_too_large", details: { limitBytes: MAX_UPLOAD_BYTES } },
        { status: 413 },
      );
    }
    // eslint-disable-next-line no-console
    console.error("[opencad] import failed:", msg);
    return NextResponse.json({ error: "internal", details: msg }, { status: 500 });
  }
}
