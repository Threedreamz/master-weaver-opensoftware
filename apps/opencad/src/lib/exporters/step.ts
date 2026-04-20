/**
 * opencad — STEP exporter (M1 STUB)
 *
 * Real STEP (ISO 10303-21 / AP214 / AP242) requires a B-Rep kernel —
 * OpenCascade WASM is the planned v2 backend. In M1 we ship a STUB that
 * returns a syntactically minimal (but not geometrically meaningful) ISO
 * 10303-21 skeleton so downstream code paths — MIME types, Content-Disposition
 * headers, stream plumbing — can be exercised end-to-end.
 *
 * The stub file is valid ISO 10303-21 (HEADER + DATA + ENDSEC sections) and
 * will open without error in most STEP viewers, but contains only package
 * metadata and a single CARTESIAN_POINT — not the actual geometry. Callers
 * MUST surface the warning to the UI so users don't ship these stubs as
 * production deliverables.
 *
 * When OpenCascade WASM is integrated, replace `buildStepStub` with a proper
 * B-Rep → STEP serialiser. The exported function signature stays stable.
 */

type Tessellation = "coarse" | "normal" | "fine";

export interface ExportSTEPOptions {
  tessellation: Tessellation;
  versionId?: string;
  projectName?: string;
}

export interface ExportSTEPResult {
  stream: ReadableStream<Uint8Array>;
  filename: string;
  triangleCount: number;
  sizeBytes: number;
  warnings: string[];
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function isoTimestamp(): string {
  // ISO 10303-21 wants a '2024-01-31T12:34:56' form (no milliseconds, no TZ suffix).
  return new Date().toISOString().replace(/\.\d{3}Z$/, "");
}

function buildStepStub(projectId: string, versionId: string | undefined): string {
  const ts = isoTimestamp();
  const title = `opencad project ${projectId}${versionId ? ` v${versionId}` : ""}`;
  // Minimal-but-valid ISO 10303-21 skeleton. The HEADER is standards-compliant;
  // DATA contains a single CARTESIAN_POINT referenced by a dummy AXIS2_PLACEMENT
  // so file-is-empty validators don't reject it.
  return (
    `/* STEP v1 stub — OpenCascade WASM not yet integrated */\n` +
    `ISO-10303-21;\n` +
    `HEADER;\n` +
    `FILE_DESCRIPTION(('opencad M1 stub — geometry not represented'),'2;1');\n` +
    `FILE_NAME('${title}','${ts}',('opencad'),('opencad'),'opencad M1','opencad','');\n` +
    `FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));\n` +
    `ENDSEC;\n` +
    `DATA;\n` +
    `#1=CARTESIAN_POINT('origin',(0.0,0.0,0.0));\n` +
    `#2=DIRECTION('z',(0.0,0.0,1.0));\n` +
    `#3=DIRECTION('x',(1.0,0.0,0.0));\n` +
    `#4=AXIS2_PLACEMENT_3D('origin_frame',#1,#2,#3);\n` +
    `ENDSEC;\n` +
    `END-ISO-10303-21;\n`
  );
}

/**
 * Real function signature (stable across stub → OpenCascade upgrade).
 * Warnings MUST be surfaced by the route handler via `X-Export-Warnings` or
 * echoed in a sidecar JSON payload — do not silently drop them.
 */
export async function exportProjectSTEP(
  projectId: string,
  opts: ExportSTEPOptions,
): Promise<ExportSTEPResult> {
  const { versionId } = opts;

  const text = buildStepStub(projectId, versionId);
  const bytes = new TextEncoder().encode(text);
  const sizeBytes = bytes.byteLength;
  const filename = sanitizeFilename(`opencad-${projectId}${versionId ? `-${versionId}` : ""}.step`);

  // Single-chunk stream — the stub is tiny. We still wrap it in a ReadableStream
  // so the route handler's response plumbing is uniform across every format.
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

  return {
    stream,
    filename,
    triangleCount: 0, // STEP is B-Rep, not a mesh — 0 by definition
    sizeBytes,
    warnings: ["STEP export not fully implemented in M1 — use STL/3MF for now."],
  };
}
