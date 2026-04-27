/**
 * opencad — 3MF importer (M1)
 *
 * 3MF is a ZIP archive; the mesh payload is `3D/3dmodel.model` (XML). We
 * unzip via `fflate.unzipSync` (sync, in-memory — fine for the 500MB upload
 * cap), then parse the XML with a regex-driven extractor that pulls
 * `<vertex x=... y=... z=...>` and `<triangle v1=... v2=... v3=...>` nodes.
 *
 * We deliberately avoid a full XML DOM parser: 3MF files are well-formed by
 * producers but can be huge (multi-million triangle counts). A streaming
 * attribute regex keeps memory overhead proportional to the final
 * Float32Array + Uint32Array, not 2× for a DOM tree.
 *
 * Only the first `<object type="model">` is imported. Multi-object 3MFs can
 * be expanded in M2 when assemblies land.
 */
import * as THREE from "three";
import { unzipSync, strFromU8 } from "fflate";

export interface Import3MFResult {
  geometry: THREE.BufferGeometry;
  triangleCount: number;
  bbox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
}

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
 * Parse the `<vertices>…</vertices>` section.
 *
 * The 3MF schema allows attributes in any order and with or without quotes,
 * so we accept both `x="1"` and `x='1'`. Numeric parsing uses parseFloat
 * which tolerates scientific notation and trailing whitespace.
 */
function extractVertices(xml: string): Float32Array {
  const vStart = xml.indexOf("<vertices");
  const vEnd = xml.indexOf("</vertices>");
  if (vStart === -1 || vEnd === -1) return new Float32Array(0);
  const section = xml.substring(vStart, vEnd);
  const re = /<vertex\s+[^>]*?x=["']([^"']+)["'][^>]*?y=["']([^"']+)["'][^>]*?z=["']([^"']+)["']/g;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    out.push(Number.parseFloat(m[1]));
    out.push(Number.parseFloat(m[2]));
    out.push(Number.parseFloat(m[3]));
  }
  return new Float32Array(out);
}

function extractTriangles(xml: string): Uint32Array {
  const tStart = xml.indexOf("<triangles");
  const tEnd = xml.indexOf("</triangles>");
  if (tStart === -1 || tEnd === -1) return new Uint32Array(0);
  const section = xml.substring(tStart, tEnd);
  const re = /<triangle\s+[^>]*?v1=["']([^"']+)["'][^>]*?v2=["']([^"']+)["'][^>]*?v3=["']([^"']+)["']/g;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    out.push(Number.parseInt(m[1], 10));
    out.push(Number.parseInt(m[2], 10));
    out.push(Number.parseInt(m[3], 10));
  }
  return new Uint32Array(out);
}

function computeBBoxFromIndexed(vertices: Float32Array): Import3MFResult["bbox"] {
  if (vertices.length === 0) return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
}

export async function import3MF(stream: ReadableStream<Uint8Array>, _filename: string): Promise<Import3MFResult> {
  const bytes = await streamToBytes(stream);

  // unzipSync accepts a Uint8Array and returns { filename: Uint8Array } for
  // every entry. The model payload is always at `3D/3dmodel.model` per spec;
  // some producers nest extra objects under `3D/Objects/…` which we ignore
  // for M1 (single-object assumption).
  const entries = unzipSync(bytes);
  const modelEntry = entries["3D/3dmodel.model"] ?? entries["3d/3dmodel.model"];
  if (!modelEntry) {
    throw new Error("3MF parse: missing 3D/3dmodel.model — not a valid 3MF archive");
  }
  const xml = strFromU8(modelEntry);

  const vertices = extractVertices(xml);
  const indices = extractTriangles(xml);

  if (vertices.length === 0) {
    throw new Error("3MF parse: no <vertex> entries found in 3dmodel.model");
  }
  if (indices.length === 0) {
    throw new Error("3MF parse: no <triangle> entries found in 3dmodel.model");
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingBox();

  return {
    geometry,
    triangleCount: Math.floor(indices.length / 3),
    bbox: computeBBoxFromIndexed(vertices),
  };
}
