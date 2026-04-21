/**
 * opencad — shared import handler used by both
 *   POST /api/import/[format]              (projectId in query or form field)
 *   POST /api/projects/[id]/import/[format] (projectId in URL)
 *
 * Two body modes are accepted:
 *
 *   application/octet-stream — raw file bytes. `req.body` is piped straight
 *     through a byte-capped TransformStream to the importer. Zero additional
 *     buffering; safe for 500MB uploads.
 *
 *   multipart/form-data — the file arrives under the `file` field. We use
 *     `request.formData()` to parse field boundaries (unavoidable for multipart
 *     — Node doesn't ship a streaming multipart parser) and then call
 *     `file.stream()` to feed the importer without buffering a second copy.
 *     `projectId` may also be in the form body. We guard multipart with a
 *     stricter Content-Length cap (MAX_MULTIPART_BYTES, default 100MB) so
 *     genuine 500MB uploads still have to use octet-stream.
 *
 * Prior bug (#14): route only read `projectId` from the URL query string, so
 * multipart uploads that set it as a form field returned 400 `missing_projectId`.
 * Also: the `/api/projects/[id]/import/[format]` route did not exist, producing
 * 404/500 when callers used the REST-style path. Both are fixed here.
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { ImportFormat } from "@/lib/api-contracts";
import { importSTL } from "@/lib/importers/stl";
import { import3MF } from "@/lib/importers/threemf";
import { importSTEP } from "@/lib/importers/step";
import { resolveUser } from "@/lib/internal-user";

export const MAX_UPLOAD_BYTES = (() => {
  const raw = process.env.MAX_UPLOAD_BYTES;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500 * 1024 * 1024; // 500 MB
})();

// Multipart forces formData() parsing which double-walks the body. Keep the
// cap tighter than the octet-stream path to nudge large uploads to octet-stream.
export const MAX_MULTIPART_BYTES = (() => {
  const raw = process.env.MAX_MULTIPART_BYTES;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100 * 1024 * 1024; // 100 MB
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
    default: {
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
}

function capStream(input: ReadableStream<Uint8Array>, limit: number): ReadableStream<Uint8Array> {
  let bytesSeen = 0;
  const capped = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytesSeen += chunk.byteLength;
      if (bytesSeen > limit) {
        controller.error(new Error(`payload_too_large: exceeded ${limit} bytes`));
        return;
      }
      controller.enqueue(chunk);
    },
  });
  return input.pipeThrough(capped);
}

/**
 * Shared handler. `projectIdFromUrl` is non-null when the caller already
 * resolved it from the route path (e.g. `/api/projects/[id]/import/[format]`).
 */
export async function handleImport(
  req: NextRequest,
  rawFormat: string,
  projectIdFromUrl: string | null,
): Promise<NextResponse> {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;

  const formatParsed = ImportFormat.safeParse(rawFormat);
  if (!formatParsed.success) {
    return NextResponse.json(
      { error: "invalid_format", details: formatParsed.error.flatten() },
      { status: 400 },
    );
  }
  const format = formatParsed.data;

  const { searchParams } = new URL(req.url);
  const filenameQ = searchParams.get("filename");

  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const isMultipart = ct.startsWith("multipart/form-data");
  const isOctet = ct.startsWith("application/octet-stream");

  if (ct && !isMultipart && !isOctet) {
    return NextResponse.json(
      {
        error: "invalid_content_type",
        details: "expected application/octet-stream or multipart/form-data",
      },
      { status: 415 },
    );
  }

  // Content-Length gating — cheaper than streaming to overflow.
  const cl = req.headers.get("content-length");
  if (cl) {
    const n = Number.parseInt(cl, 10);
    const limit = isMultipart ? MAX_MULTIPART_BYTES : MAX_UPLOAD_BYTES;
    if (Number.isFinite(n) && n > limit) {
      return NextResponse.json(
        { error: "payload_too_large", details: { limitBytes: limit, receivedBytes: n } },
        { status: 413 },
      );
    }
  }

  // Resolve projectId + file stream from whichever body mode the client sent.
  let projectId: string | null = projectIdFromUrl ?? searchParams.get("projectId");
  let fileStream: ReadableStream<Uint8Array> | null = null;
  let filename: string | null = filenameQ && filenameQ.trim() ? filenameQ.trim() : null;

  if (isMultipart) {
    // formData() parses the whole multipart body once. For large files prefer
    // octet-stream. The file.stream() call below does NOT re-buffer — it yields
    // the already-parsed blob's internal storage as a stream.
    let form: FormData;
    try {
      form = await req.formData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: "invalid_multipart", details: msg },
        { status: 400 },
      );
    }

    if (!projectId) {
      const fv = form.get("projectId");
      if (typeof fv === "string" && fv.trim()) projectId = fv.trim();
    }

    const fileField = form.get("file");
    if (!fileField || typeof fileField === "string") {
      return NextResponse.json(
        { error: "missing_file", details: "multipart body must include a 'file' field" },
        { status: 400 },
      );
    }
    // Runtime check: Blob has .stream() on all supported runtimes.
    if (!filename) {
      const n = (fileField as File).name;
      filename = n && n.trim() ? n.trim() : null;
    }
    fileStream = (fileField as Blob).stream();
  } else {
    // octet-stream path (also the default when no Content-Type is sent).
    if (!req.body) {
      return NextResponse.json({ error: "missing_body" }, { status: 400 });
    }
    fileStream = req.body;
  }

  if (!projectId) {
    return NextResponse.json({ error: "missing_projectId" }, { status: 400 });
  }

  // Ownership check — reject before reading a single byte of the body
  // (octet-stream path) / after multipart parse (unavoidable there).
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

  if (!fileStream) {
    return NextResponse.json({ error: "missing_body" }, { status: 400 });
  }
  if (!filename) filename = `imported.${format}`;

  try {
    const cappedStream = capStream(fileStream, MAX_UPLOAD_BYTES);
    const result = await runImporter(format, cappedStream, filename);

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
