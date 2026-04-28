/**
 * opencad — STEP importer (M2 — REAL via replicad-opencascadejs)
 *
 * Replaces the M1 stub. Uses `replicad.importSTEP(blob)` to parse ISO 10303-21
 * STEP files into an OCCT BREP shape, then tessellates via `shape.mesh()` to
 * produce a `THREE.BufferGeometry` for viewport rendering AND downstream
 * feature-timeline ops (fillet/chamfer/boolean/etc.).
 *
 * Persistence path:
 *   - The shared `import-handler.ts` writes `result.geometry` to disk via
 *     `writeImportedBody`. That gives us a tessellated mesh on disk, durable
 *     across restarts.
 *   - `feature-timeline.ts` re-loads the mesh and (when replicad is available)
 *     `replicad-wrapper.geometryToReplicadSolid()` rebuilds a replicad Solid
 *     from the triangle soup so fillet/chamfer/shell can act on it. This is
 *     the same path the existing replicad ops already use, so STEP-imported
 *     geometry composes naturally with everything downstream.
 *   - We do NOT serialise the raw BREP (replicad's `shape.serialize()` returns
 *     a base64 string we'd need a schema column for). The mesh round-trip is
 *     lossy at very small fillet radii but adequate for M2 — exact-BREP
 *     persistence is a tracked follow-up.
 *
 * Errors:
 *   - replicad/OCCT WASM unavailable    → throws (caller maps to 500/503)
 *   - STEP parse failure (bad bytes)    → throws "step_parse_failed: …"
 *     The route handler currently maps generic Error to 500; we prefix the
 *     message with "step_parse_failed:" so a future tightening of the route
 *     can switch on it for HTTP 422. (Required-route-change note in report.)
 *   - Empty mesh (valid STEP, zero faces)→ throws — prevents storing useless
 *     bodies that crash later viewport / feature-timeline calls.
 *
 * Units: mm (STEP is mm by default per ISO 10303 unless overridden in
 * UNIT_NAMED_REPRESENTATION; replicad surfaces whatever the file declares).
 */
import * as THREE from "three";
import { probeBrep } from "../brep/replicad-wrapper";

export interface ImportSTEPResult {
  geometry: THREE.BufferGeometry;
  triangleCount: number;
  bbox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  /**
   * Informational warnings — non-fatal. Includes the BREP face count when the
   * STEP imports cleanly (e.g. "step: 6 faces, 12 edges"), letting the route
   * surface a topology summary to the client without changing the response
   * schema.
   */
  warnings: string[];
}

/* ------------------------------------------------------------- helpers */

/** Drain a ReadableStream into a single Uint8Array (mirrors stl/threemf). */
async function streamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * Quick sanity check that the bytes look like a STEP file before we hand them
 * to OCCT. A valid STEP file starts with `ISO-10303-21;` (possibly preceded by
 * a UTF-8 BOM or whitespace). Catching obviously-invalid input here gives a
 * useful error message instead of OCCT's opaque internal failure.
 */
function looksLikeStep(bytes: Uint8Array): boolean {
  // Strip a BOM if present, then test the first ~64 bytes as ASCII.
  let start = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    start = 3;
  }
  // Skip leading whitespace.
  while (start < bytes.length && bytes[start] <= 0x20) start += 1;
  const slice = bytes.subarray(start, Math.min(start + 64, bytes.length));
  const head = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  return /^ISO-10303-21\b/i.test(head);
}

/* ---------------------------------------------------- replicad mesh shape */

type ReplicadShapeMesh = {
  vertices?: Float32Array | number[];
  triangles?: Uint32Array | Uint16Array | number[];
  normals?: Float32Array | number[];
  faceGroups?: Array<{ start: number; count: number; faceId: number }>;
};

type ReplicadAnyShape = {
  mesh: (opts?: { tolerance?: number; angularTolerance?: number }) => ReplicadShapeMesh;
  faces?: Array<unknown>;
  edges?: Array<unknown>;
  delete?: () => void;
};

type ReplicadModule = {
  importSTEP: (blob: Blob) => Promise<ReplicadAnyShape>;
};

/** Default tessellation tolerance in mm — matches replicad-wrapper.ts. */
const MESH_TOLERANCE_MM = 0.01;

/* ------------------------------------------------------------- bbox */

function computeBBox(positions: Float32Array): ImportSTEPResult["bbox"] {
  if (positions.length === 0) {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  }
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
}

/* ------------------------------------------------------------- public api */

export async function importSTEP(
  stream: ReadableStream<Uint8Array>,
  filename: string,
): Promise<ImportSTEPResult> {
  // 1. Drain the upload first — both for memory locality and because OCCT's
  //    importSTEP wants a full Blob (no streaming API in replicad 0.20).
  const bytes = await streamToBytes(stream);

  if (bytes.byteLength === 0) {
    throw new Error(`step_parse_failed: empty body for ${filename}`);
  }
  if (!looksLikeStep(bytes)) {
    throw new Error(
      `step_parse_failed: ${filename} does not start with "ISO-10303-21" — not a valid STEP file`,
    );
  }

  // 2. Ensure replicad + OCCT WASM are loaded. probeBrep() is idempotent and
  //    cached — the first call pays ~1-3s for WASM init, subsequent calls are O(1).
  const availability = await probeBrep();
  if (availability !== "available") {
    throw new Error(
      `step_unavailable: replicad-opencascadejs is ${availability} — STEP import requires OCCT WASM. ` +
        `Run \`pnpm install replicad replicad-opencascadejs\` and verify the WASM bundle resolves at runtime.`,
    );
  }

  // 3. Re-import replicad in the local scope. probeBrep already imported it
  //    and called setOC() — we just need the function references. The cost is
  //    a Map lookup; the WASM-heavy step (initOpenCascade) was already paid.
  let mod: ReplicadModule;
  try {
    // Optional peer — types are resolved at runtime.
    mod = (await import(/* webpackIgnore: true */ "replicad")) as unknown as ReplicadModule;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`step_unavailable: replicad import failed at use-time: ${msg}`);
  }
  if (typeof mod.importSTEP !== "function") {
    throw new Error("step_unavailable: replicad does not expose importSTEP — version mismatch");
  }

  // 4. Wrap bytes as a Blob. Node 20+ has a global Blob; the runtime is
  //    `nodejs` per the route's `export const runtime = "nodejs"` so this is safe.
  //    Copy into a fresh ArrayBuffer-backed Uint8Array so TS's BlobPart accepts
  //    it (excludes SharedArrayBuffer-backed views).
  const fresh = new Uint8Array(bytes.byteLength);
  fresh.set(bytes);
  const blob = new Blob([fresh], { type: "application/step" });

  // 5. Parse the STEP file. importSTEP can throw on malformed input — we
  //    re-throw with a `step_parse_failed:` prefix so callers / tests can
  //    differentiate parse errors from infra errors.
  let shape: ReplicadAnyShape;
  try {
    shape = await mod.importSTEP(blob);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`step_parse_failed: ${msg}`);
  }
  if (!shape || typeof shape.mesh !== "function") {
    throw new Error("step_parse_failed: importSTEP returned a shape without .mesh()");
  }

  // 6. Tessellate. replicad.Shape.mesh() returns ShapeMesh =
  //    { triangles: number[], vertices: number[], normals: number[], faceGroups: [...] }.
  //    `triangles` is a flat index array (3 per triangle); `vertices`/`normals`
  //    are flat coordinate arrays (3 per vertex).
  let meshed: ReplicadShapeMesh;
  try {
    meshed = shape.mesh({ tolerance: MESH_TOLERANCE_MM, angularTolerance: 0.1 });
  } catch (err) {
    // Always free the OCCT handle, even on failure, before re-throwing.
    try { shape.delete?.(); } catch { /* ignore */ }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`step_parse_failed: tessellation failed: ${msg}`);
  }

  const verts = meshed.vertices;
  const tris = meshed.triangles;
  if (!verts || !tris || verts.length === 0 || tris.length === 0) {
    try { shape.delete?.(); } catch { /* ignore */ }
    throw new Error(
      `step_parse_failed: ${filename} parsed but contained no triangulable surfaces ` +
        `(possibly a wireframe-only or empty assembly)`,
    );
  }

  // Capture topology summary BEFORE deleting the OCCT handle.
  const faceCount = Array.isArray(shape.faces) ? shape.faces.length : (meshed.faceGroups?.length ?? 0);
  const edgeCount = Array.isArray(shape.edges) ? shape.edges.length : 0;

  // 7. Build the THREE.BufferGeometry. Convert plain-number arrays to typed
  //    arrays only if needed (replicad sometimes returns Float32Array directly
  //    in newer builds — handle both).
  const positionArray =
    verts instanceof Float32Array ? verts : new Float32Array(verts as number[]);
  const indexArray =
    tris instanceof Uint32Array || tris instanceof Uint16Array
      ? tris
      : new Uint32Array(tris as number[]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));
  // Always use a Uint32 index — STEP-imported assemblies routinely exceed 65k
  // vertices, and downstream code expects a stable index type.
  const idx32 = indexArray instanceof Uint32Array
    ? indexArray
    : new Uint32Array(indexArray);
  geometry.setIndex(new THREE.BufferAttribute(idx32, 1));
  if (meshed.normals) {
    const normalArray =
      meshed.normals instanceof Float32Array
        ? meshed.normals
        : new Float32Array(meshed.normals as number[]);
    geometry.setAttribute("normal", new THREE.BufferAttribute(normalArray, 3));
  } else {
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();

  // 8. Free the OCCT handle now that we've extracted everything we need.
  //    Without this, OCCT's WASM heap leaks one shape per import.
  try { shape.delete?.(); } catch { /* ignore — non-fatal */ }

  const triangleCount = Math.floor(idx32.length / 3);
  const warnings: string[] = [];
  if (faceCount > 0 || edgeCount > 0) {
    warnings.push(`step: imported ${faceCount} face(s), ${edgeCount} edge(s), ${triangleCount} triangle(s)`);
  }

  return {
    geometry,
    triangleCount,
    bbox: computeBBox(positionArray),
    warnings,
  };
}
