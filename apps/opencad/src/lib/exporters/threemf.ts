/**
 * opencad — 3MF exporter (M1)
 *
 * 3MF is a ZIP archive with three minimum-required parts:
 *   - `[Content_Types].xml` — MIME type map
 *   - `_rels/.rels`        — package-level relationships
 *   - `3D/3dmodel.model`   — XML mesh payload (Core spec, namespace 2015/02)
 *
 * We use `fflate.zipSync` to produce the archive — the whole buffer is then
 * streamed back via a chunked ReadableStream, matching the STL exporter's
 * back-pressure-friendly contract. fflate runs sync over in-memory Uint8Arrays
 * which is fine for typical mesh sizes (tens of MB); if inputs grow beyond
 * ~200MB we would switch to fflate's `Zip` streaming API.
 *
 * The generated XML is deliberately minimal but valid per the 3MF Core Spec
 * v1.2 — single `<object>` containing one `<mesh>` with `<vertices>` and
 * `<triangles>`, plus a `<build>` section with one `<item>`.
 */
import * as THREE from "three";
import { zipSync, strToU8 } from "fflate";

type Tessellation = "coarse" | "normal" | "fine";

export interface Export3MFOptions {
  tessellation: Tessellation;
  versionId?: string;
  projectName?: string;
}

export interface Export3MFResult {
  stream: ReadableStream<Uint8Array>;
  filename: string;
  triangleCount: number;
  sizeBytes: number;
}

async function loadKernel(): Promise<{
  evaluateProject(
    projectId: string,
    opts: { tessellation: Tessellation; versionId?: string },
  ): Promise<THREE.BufferGeometry>;
}> {
  // evaluateProject lives in feature-timeline (DB-aware evaluator).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import("../feature-timeline");
  return { evaluateProject: mod.evaluateProject ?? mod.default?.evaluateProject };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Serialise a THREE.BufferGeometry to a 3MF `3dmodel.model` XML document.
 *
 * Vertex dedup is skipped — the geometry may already be non-indexed from the
 * tessellator. If deduplication is needed later, run it in `cad-kernel` before
 * handing off to this exporter; keeps the file format module stateless.
 */
function geometryTo3MFXml(geometry: THREE.BufferGeometry, objectName: string): { xml: string; triangleCount: number } {
  const posAttr = geometry.getAttribute("position");
  // Empty-project guard: emit a zero-mesh 3MF skeleton rather than throwing.
  // The resulting archive is still spec-valid (resources with a single empty
  // object is permitted) so the export endpoint returns 200 + a valid file.
  if (!posAttr || posAttr.count === 0) {
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n` +
      `  <metadata name="Title">${xmlEscape(objectName)}</metadata>\n` +
      `  <metadata name="Application">opencad</metadata>\n` +
      `  <resources>\n` +
      `    <object id="1" type="model" name="${xmlEscape(objectName)}">\n` +
      `      <mesh><vertices/><triangles/></mesh>\n` +
      `    </object>\n` +
      `  </resources>\n` +
      `  <build><item objectid="1"/></build>\n` +
      `</model>\n`;
    return { xml, triangleCount: 0 };
  }
  const indexAttr = geometry.getIndex();

  // Build vertex list — if indexed, use the attribute directly; if not, every
  // triple of positions forms a triangle so we still emit them as vertices and
  // reference them by sequential index.
  const vLines: string[] = [];
  const vCount = posAttr.count;
  for (let i = 0; i < vCount; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    vLines.push(`      <vertex x="${x}" y="${y}" z="${z}"/>`);
  }

  const tLines: string[] = [];
  let triangleCount = 0;
  if (indexAttr) {
    const n = indexAttr.count;
    for (let i = 0; i + 2 < n; i += 3) {
      const v1 = indexAttr.getX(i);
      const v2 = indexAttr.getX(i + 1);
      const v3 = indexAttr.getX(i + 2);
      tLines.push(`      <triangle v1="${v1}" v2="${v2}" v3="${v3}"/>`);
      triangleCount++;
    }
  } else {
    for (let i = 0; i + 2 < vCount; i += 3) {
      tLines.push(`      <triangle v1="${i}" v2="${i + 1}" v3="${i + 2}"/>`);
      triangleCount++;
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n` +
    `  <metadata name="Title">${xmlEscape(objectName)}</metadata>\n` +
    `  <metadata name="Application">opencad</metadata>\n` +
    `  <resources>\n` +
    `    <object id="1" type="model" name="${xmlEscape(objectName)}">\n` +
    `      <mesh>\n` +
    `        <vertices>\n${vLines.join("\n")}\n        </vertices>\n` +
    `        <triangles>\n${tLines.join("\n")}\n        </triangles>\n` +
    `      </mesh>\n` +
    `    </object>\n` +
    `  </resources>\n` +
    `  <build>\n` +
    `    <item objectid="1"/>\n` +
    `  </build>\n` +
    `</model>\n`;

  return { xml, triangleCount };
}

const CONTENT_TYPES_XML =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n` +
  `  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n` +
  `  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>\n` +
  `</Types>\n`;

const RELS_XML =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n` +
  `  <Relationship Id="rel0" Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>\n` +
  `</Relationships>\n`;

export async function exportProject3MF(
  projectId: string,
  opts: Export3MFOptions,
): Promise<Export3MFResult> {
  const { tessellation, versionId, projectName = projectId } = opts;

  const kernel = await loadKernel();
  if (!kernel.evaluateProject) {
    throw new Error("cad-kernel not available — evaluateProject missing");
  }
  const geometry = await kernel.evaluateProject(projectId, { tessellation, versionId });

  const { xml, triangleCount } = geometryTo3MFXml(geometry, projectName);

  // fflate expects a plain object map of path → Uint8Array. Deflate level 6 is
  // a good balance of size vs CPU for text-heavy mesh XML.
  const zipped = zipSync(
    {
      "[Content_Types].xml": strToU8(CONTENT_TYPES_XML),
      "_rels/.rels": strToU8(RELS_XML),
      "3D/3dmodel.model": strToU8(xml),
    },
    { level: 6 },
  );
  const sizeBytes = zipped.byteLength;
  const filename = sanitizeFilename(`opencad-${projectId}${versionId ? `-${versionId}` : ""}.3mf`);

  const CHUNK = 1 << 20; // 1 MiB
  let offset = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= zipped.byteLength) {
        controller.close();
        return;
      }
      const end = Math.min(offset + CHUNK, zipped.byteLength);
      controller.enqueue(new Uint8Array(zipped.subarray(offset, end)));
      offset = end;
    },
    cancel() {
      offset = zipped.byteLength;
    },
  });

  return { stream, filename, triangleCount, sizeBytes };
}
