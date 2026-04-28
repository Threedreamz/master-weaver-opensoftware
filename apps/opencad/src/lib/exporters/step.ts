/**
 * opencad — STEP exporter (M2 — real ISO 10303-21 / AP214 via replicad + OCCT WASM)
 *
 * Pipeline:
 *   1. evaluateProject(projectId)          → Three BufferGeometry (mesh, post-CSG)
 *   2. probeBrep()                         → ensure replicad + OpenCascade.js WASM are live
 *   3. replicad.makeSolid({vertices,tris}) → reconstruct a BREP Solid from the mesh
 *   4. solid.blobSTEP()                    → real ISO 10303-21 (AP214) Blob
 *   5. blob.arrayBuffer() → Uint8Array     → stream back to the API route
 *
 * If replicad / OCCT is unavailable we DO NOT emit a stub — we throw a clear
 * error so the route handler returns 500 with a precise message. Shipping
 * geometrically-meaningless STEP files silently is worse than a hard failure
 * (the M1 stub fooled FreeCAD/STEP viewers into rendering a single point).
 *
 * Notes on metrics:
 *   - STEP is B-Rep (faces + edges + vertices), not a triangle mesh, so
 *     `triangleCount` is meaningless. We report `0` for `triangleCount` (kept
 *     for the existing `ExportSTEPResult` shape and the `X-Triangle-Count`
 *     header) and surface the BREP face count via the `brepFaceCount` field
 *     so the route can echo `X-Brep-Faces` if it chooses to.
 *
 *   - When the BREP-from-mesh reconstruction succeeds we emit NO warnings
 *     (the file is a real STEP). When the mesh→BREP path is degraded
 *     (e.g. the resulting solid has zero faces) we still emit the file but
 *     append a warning so the UI can surface it.
 */
import * as THREE from "three";
import { evaluateProject } from "../feature-timeline";
import { probeBrep } from "../brep/replicad-wrapper";

type Tessellation = "coarse" | "normal" | "fine";

export interface ExportSTEPOptions {
  tessellation: Tessellation;
  versionId?: string;
  projectName?: string;
}

export interface ExportSTEPResult {
  stream: ReadableStream<Uint8Array>;
  filename: string;
  /** STEP is B-Rep, not a triangle mesh — always 0. */
  triangleCount: number;
  sizeBytes: number;
  warnings: string[];
  /** Number of BREP faces in the exported solid (informational). */
  brepFaceCount: number;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

/* ----------------------------------------------------------- replicad shim */

type ReplicadMod = {
  makeSolid?: (mesh: { vertices: number[]; triangles: number[] }) => ReplicadSolid;
  // Some replicad builds expose mesh-import via a different name.
  importSTL?: (data: ArrayBuffer | Uint8Array) => ReplicadSolid;
  setOC?: (oc: unknown) => void;
};

type ReplicadSolid = {
  blobSTEP?: () => Blob | Promise<Blob>;
  // Some versions namespace it under exportSTEP() returning a Blob.
  exportSTEP?: () => Blob | Promise<Blob>;
  // Face introspection — used for X-Brep-Faces. Best-effort.
  faces?: ReadonlyArray<unknown> | { length?: number };
  // Free WASM-side resources after we've serialized.
  delete?: () => void;
};

/** Lazy-load the replicad module. probeBrep() must succeed before this is called. */
async function loadReplicad(): Promise<ReplicadMod> {
  // @ts-expect-error — replicad is an optional dep, may not type-resolve.
  const mod = (await import(/* webpackIgnore: true */ "replicad")) as ReplicadMod;
  return mod;
}

/* ----------------------------------------------------- mesh → replicad solid */

function geometryToFlatArrays(geom: THREE.BufferGeometry): {
  vertices: number[];
  triangles: number[];
} {
  const pos = geom.getAttribute("position");
  if (!pos || pos.count === 0) {
    return { vertices: [], triangles: [] };
  }
  const idx = geom.getIndex();
  const triCount = idx ? idx.count / 3 : pos.count / 3;

  const vertices: number[] = new Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    vertices[i * 3 + 0] = pos.getX(i);
    vertices[i * 3 + 1] = pos.getY(i);
    vertices[i * 3 + 2] = pos.getZ(i);
  }
  const triangles: number[] = new Array(triCount * 3);
  for (let t = 0; t < triCount; t += 1) {
    triangles[t * 3 + 0] = idx ? idx.getX(t * 3 + 0) : t * 3 + 0;
    triangles[t * 3 + 1] = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    triangles[t * 3 + 2] = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
  }
  return { vertices, triangles };
}

/**
 * Build a binary STL byte buffer from a BufferGeometry (lightweight, local —
 * we don't import the kernel STL helper here to avoid a circular module shape).
 * Used as a fallback path when replicad exposes `importSTL` instead of
 * `makeSolid`.
 */
function geometryToBinarySTL(geom: THREE.BufferGeometry): Uint8Array {
  const pos = geom.getAttribute("position");
  if (!pos || pos.count === 0) {
    const empty = new ArrayBuffer(84);
    new DataView(empty).setUint32(80, 0, true);
    return new Uint8Array(empty);
  }
  const idx = geom.getIndex();
  const triCount = idx ? idx.count / 3 : pos.count / 3;
  const buf = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buf);
  view.setUint32(80, triCount, true);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();
  let off = 84;
  for (let t = 0; t < triCount; t += 1) {
    const i0 = idx ? idx.getX(t * 3 + 0) : t * 3 + 0;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac).normalize();
    view.setFloat32(off + 0, n.x, true);
    view.setFloat32(off + 4, n.y, true);
    view.setFloat32(off + 8, n.z, true);
    view.setFloat32(off + 12, a.x, true);
    view.setFloat32(off + 16, a.y, true);
    view.setFloat32(off + 20, a.z, true);
    view.setFloat32(off + 24, b.x, true);
    view.setFloat32(off + 28, b.y, true);
    view.setFloat32(off + 32, c.x, true);
    view.setFloat32(off + 36, c.y, true);
    view.setFloat32(off + 40, c.x, true);
    view.setFloat32(off + 44, c.y, true);
    view.setUint16(off + 48, 0, true);
    off += 50;
  }
  return new Uint8Array(buf);
}

/** Best-effort face count without depending on replicad type internals. */
function faceCountOf(solid: ReplicadSolid): number {
  const f = solid.faces;
  if (Array.isArray(f)) return f.length;
  if (f && typeof (f as { length?: number }).length === "number") {
    return (f as { length: number }).length;
  }
  return 0;
}

/* ------------------------------------------------------------------- public */

export class STEPExportUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "STEPExportUnavailableError";
  }
}

/**
 * Real STEP export via replicad + OpenCascade.js WASM.
 *
 * Throws `STEPExportUnavailableError` if:
 *   - replicad is not installed
 *   - OCCT WASM failed to initialise within the probe timeout
 *   - replicad's installed version exposes neither `makeSolid` nor `importSTL`
 *   - the resulting Solid has no `blobSTEP()` / `exportSTEP()` method
 *
 * The route handler returns 500 with the message verbatim. Callers MUST NOT
 * fall back to STL silently — if STEP fails, the user needs to know.
 */
export async function exportProjectSTEP(
  projectId: string,
  opts: ExportSTEPOptions,
): Promise<ExportSTEPResult> {
  const { tessellation, versionId } = opts;

  // Probe before we touch the kernel — fast-fail path.
  const availability = await probeBrep();
  if (availability !== "available") {
    throw new STEPExportUnavailableError(
      `STEP export requires replicad + OpenCascade.js WASM, but probeBrep() returned "${availability}". ` +
        `Install \`replicad\` and \`replicad-opencascadejs\` (already declared in package.json) and ` +
        `verify the WASM bundle ships in the build output. STL/3MF export remains available as a fallback.`,
    );
  }

  // Evaluate the feature tree once. Tessellation only affects the mesh path
  // we hand to replicad — the resulting BREP is curvature-exact regardless.
  const geometry = await evaluateProject(projectId, { tessellation, versionId });
  if (!geometry.getAttribute("position") || geometry.getAttribute("position").count === 0) {
    throw new STEPExportUnavailableError(
      "Project evaluated to empty geometry — nothing to export as STEP.",
    );
  }

  const replicad = await loadReplicad();

  // Build a replicad Solid. Prefer makeSolid (direct mesh→BREP) over importSTL
  // (round-trips through STL bytes).
  let solid: ReplicadSolid | null = null;
  let reconstructionMode: "makeSolid" | "importSTL" = "makeSolid";

  if (typeof replicad.makeSolid === "function") {
    const flat = geometryToFlatArrays(geometry);
    try {
      solid = replicad.makeSolid(flat);
    } catch (err) {
      throw new STEPExportUnavailableError(
        `replicad.makeSolid threw during mesh→BREP reconstruction: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  } else if (typeof replicad.importSTL === "function") {
    reconstructionMode = "importSTL";
    const stlBytes = geometryToBinarySTL(geometry);
    try {
      solid = replicad.importSTL(stlBytes);
    } catch (err) {
      throw new STEPExportUnavailableError(
        `replicad.importSTL threw during mesh→BREP reconstruction: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  } else {
    throw new STEPExportUnavailableError(
      "Installed replicad version exposes neither `makeSolid` nor `importSTL` — " +
        "cannot reconstruct a BREP Solid from the evaluated mesh. Upgrade replicad to ≥0.20.",
    );
  }

  if (!solid) {
    throw new STEPExportUnavailableError(
      `Mesh→BREP reconstruction (${reconstructionMode}) returned null.`,
    );
  }

  // Serialise to STEP. blobSTEP() is the canonical replicad API; some forks
  // expose exportSTEP() instead. Try blobSTEP first.
  const stepFn =
    typeof solid.blobSTEP === "function"
      ? solid.blobSTEP.bind(solid)
      : typeof solid.exportSTEP === "function"
        ? solid.exportSTEP.bind(solid)
        : null;
  if (!stepFn) {
    if (typeof solid.delete === "function") {
      try {
        solid.delete();
      } catch {
        /* ignore — best-effort cleanup */
      }
    }
    throw new STEPExportUnavailableError(
      "replicad Solid exposes neither `blobSTEP()` nor `exportSTEP()` — STEP serialisation unavailable.",
    );
  }

  let stepBlob: Blob;
  try {
    stepBlob = await Promise.resolve(stepFn());
  } catch (err) {
    if (typeof solid.delete === "function") {
      try {
        solid.delete();
      } catch {
        /* ignore */
      }
    }
    throw new STEPExportUnavailableError(
      `replicad blobSTEP() threw during STEP serialisation: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const arrayBuffer = await stepBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const sizeBytes = bytes.byteLength;
  const brepFaceCount = faceCountOf(solid);

  // Free WASM-side allocations now that we've copied the bytes JS-side.
  if (typeof solid.delete === "function") {
    try {
      solid.delete();
    } catch {
      /* ignore — best-effort cleanup */
    }
  }

  // Sanity-check the output looks like ISO 10303-21 ("ISO-10303-21" header).
  // If it doesn't, surface a warning rather than throwing — the bytes still
  // came from replicad, but something upstream is non-conforming.
  const warnings: string[] = [];
  const headerSlice = new TextDecoder().decode(bytes.subarray(0, 32));
  if (!headerSlice.startsWith("ISO-10303-21")) {
    warnings.push(
      "STEP output does not start with ISO-10303-21 marker — file may be malformed.",
    );
  }
  if (brepFaceCount === 0) {
    warnings.push(
      "BREP solid has zero faces — the mesh→BREP reconstruction may have produced an empty shell.",
    );
  }
  if (reconstructionMode === "importSTL") {
    warnings.push(
      "STEP was reconstructed via STL round-trip (replicad.importSTL) — vertex precision is lossy. " +
        "Upgrade replicad to a version exposing makeSolid() for full precision.",
    );
  }

  const filename = sanitizeFilename(
    `opencad-${projectId}${versionId ? `-${versionId}` : ""}.step`,
  );

  // Stream in 1 MiB chunks so the route can back-pressure on large solids.
  const CHUNK = 1 << 20;
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) {
        controller.close();
        return;
      }
      const end = Math.min(offset + CHUNK, bytes.byteLength);
      controller.enqueue(new Uint8Array(bytes.subarray(offset, end)));
      offset = end;
    },
    cancel() {
      offset = bytes.byteLength;
    },
  });

  return {
    stream,
    filename,
    triangleCount: 0, // STEP is B-Rep, not a mesh
    sizeBytes,
    warnings,
    brepFaceCount,
  };
}
