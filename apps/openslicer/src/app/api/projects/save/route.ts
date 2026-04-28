import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { zipSync, unzipSync } from "fflate";
import { getModelById } from "../../../../db/queries/models";
import { resolveUser } from "../../../../lib/internal-user";

export const dynamic = "force-dynamic";

/**
 * Scene state sent from the client for project save.
 */
interface ProjectSaveRequest {
  models: {
    id: string;
    name: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    plateId?: string;
  }[];
  plates: { id: string; name: string; modelIds: string[] }[];
  profiles: {
    selectedPrinterProfileId: string | null;
    selectedFilamentProfileId: string | null;
    selectedProcessProfileId: string | null;
  };
  perObjectSettings: Record<string, Record<string, unknown>>;
  sliceOverrides: Record<string, unknown>;
}

/**
 * Build 3MF XML for a single object from raw mesh vertices/triangles.
 * We read the original file and re-parse it to extract geometry,
 * then encode it as 3MF XML.
 */
function buildModelXml(
  objects: {
    id: number;
    name: string;
    vertices: [number, number, number][];
    triangles: [number, number, number][];
    transform?: string;
  }[],
): string {
  const objectXmls = objects.map((obj) => {
    const vertexLines = obj.vertices
      .map((v) => `          <vertex x="${v[0]}" y="${v[1]}" z="${v[2]}" />`)
      .join("\n");
    const triangleLines = obj.triangles
      .map((t) => `          <triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}" />`)
      .join("\n");

    return `    <object id="${obj.id}" type="model" name="${escapeXml(obj.name)}">
      <mesh>
        <vertices>
${vertexLines}
        </vertices>
        <triangles>
${triangleLines}
        </triangles>
      </mesh>
    </object>`;
  });

  const buildItems = objects
    .map((obj) => {
      const t = obj.transform || "1 0 0 0 1 0 0 0 1 0 0 0";
      return `    <item objectid="${obj.id}" transform="${t}" />`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
${objectXmls.join("\n")}
  </resources>
  <build>
${buildItems}
  </build>
</model>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build a 3x4 transform string from position, rotation (degrees), and scale.
 * 3MF uses a row-major 3x4 affine matrix: m00 m01 m02 m10 m11 m12 m20 m21 m22 tx ty tz
 */
function buildTransformString(
  position?: [number, number, number],
  rotation?: [number, number, number],
  scale?: [number, number, number],
): string {
  const sx = scale?.[0] ?? 1;
  const sy = scale?.[1] ?? 1;
  const sz = scale?.[2] ?? 1;

  const rx = ((rotation?.[0] ?? 0) * Math.PI) / 180;
  const ry = ((rotation?.[1] ?? 0) * Math.PI) / 180;
  const rz = ((rotation?.[2] ?? 0) * Math.PI) / 180;

  const tx = position?.[0] ?? 0;
  const ty = position?.[1] ?? 0;
  const tz = position?.[2] ?? 0;

  // Rotation: Rz * Ry * Rx (standard Euler XYZ)
  const cx = Math.cos(rx), sxr = Math.sin(rx);
  const cy = Math.cos(ry), syr = Math.sin(ry);
  const cz = Math.cos(rz), szr = Math.sin(rz);

  const m00 = cy * cz * sx;
  const m01 = (sxr * syr * cz - cx * szr) * sy;
  const m02 = (cx * syr * cz + sxr * szr) * sz;
  const m10 = cy * szr * sx;
  const m11 = (sxr * syr * szr + cx * cz) * sy;
  const m12 = (cx * syr * szr - sxr * cz) * sz;
  const m20 = -syr * sx;
  const m21 = sxr * cy * sy;
  const m22 = cx * cy * sz;

  return [m00, m01, m02, m10, m11, m12, m20, m21, m22, tx, ty, tz]
    .map((v) => v.toFixed(6))
    .join(" ");
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

/**
 * Parse vertices and triangle indices from an STL buffer (binary or ASCII).
 */
function extractMeshFromSTL(
  buffer: Buffer,
): { vertices: [number, number, number][]; triangles: [number, number, number][] } {
  const header = buffer.subarray(0, 80).toString("ascii").trim();
  const isBinary = (() => {
    if (buffer.length < 84) return false;
    const count = buffer.readUInt32LE(80);
    return Math.abs(buffer.length - (84 + count * 50)) < 10;
  })();

  if (!header.startsWith("solid") || isBinary) {
    return extractBinarySTL(buffer);
  }
  return extractAsciiSTL(buffer.toString("ascii"));
}

function extractBinarySTL(
  buffer: Buffer,
): { vertices: [number, number, number][]; triangles: [number, number, number][] } {
  const triCount = buffer.readUInt32LE(80);
  const vertexMap = new Map<string, number>();
  const vertices: [number, number, number][] = [];
  const triangles: [number, number, number][] = [];

  for (let i = 0; i < triCount; i++) {
    const offset = 84 + i * 50;
    // Skip normal (12 bytes), read 3 vertices (12 bytes each)
    const indices: [number, number, number] = [0, 0, 0];
    for (let v = 0; v < 3; v++) {
      const vOff = offset + 12 + v * 12;
      const x = buffer.readFloatLE(vOff);
      const y = buffer.readFloatLE(vOff + 4);
      const z = buffer.readFloatLE(vOff + 8);
      const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
      let idx = vertexMap.get(key);
      if (idx === undefined) {
        idx = vertices.length;
        vertexMap.set(key, idx);
        vertices.push([x, y, z]);
      }
      indices[v] = idx;
    }
    triangles.push(indices);
  }
  return { vertices, triangles };
}

function extractAsciiSTL(
  text: string,
): { vertices: [number, number, number][]; triangles: [number, number, number][] } {
  const vertexMap = new Map<string, number>();
  const vertices: [number, number, number][] = [];
  const triangles: [number, number, number][] = [];

  const vertexRegex = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  let match: RegExpExecArray | null;
  const allVerts: [number, number, number][] = [];

  while ((match = vertexRegex.exec(text)) !== null) {
    allVerts.push([parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])]);
  }

  for (let i = 0; i + 2 < allVerts.length; i += 3) {
    const indices: [number, number, number] = [0, 0, 0];
    for (let v = 0; v < 3; v++) {
      const [x, y, z] = allVerts[i + v];
      const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
      let idx = vertexMap.get(key);
      if (idx === undefined) {
        idx = vertices.length;
        vertexMap.set(key, idx);
        vertices.push([x, y, z]);
      }
      indices[v] = idx;
    }
    triangles.push(indices);
  }
  return { vertices, triangles };
}

/**
 * Extract mesh data from a 3MF buffer using the same regex approach as slicer-core.
 */
function extractMeshFrom3MF(
  buffer: Buffer,
): { vertices: [number, number, number][]; triangles: [number, number, number][] } {
  // Decompress the ZIP
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const entries = unzipSync(uint8);

  // Find the model file
  let modelData: Uint8Array | null = null;
  if (entries["3D/3dmodel.model"]) {
    modelData = entries["3D/3dmodel.model"];
  } else {
    for (const key of Object.keys(entries)) {
      if (key.toLowerCase().endsWith("3dmodel.model")) {
        modelData = entries[key];
        break;
      }
    }
  }
  if (!modelData) throw new Error("3MF has no model file");

  const xml = new TextDecoder().decode(modelData);
  const vertices: [number, number, number][] = [];
  const triangles: [number, number, number][] = [];

  const vRe = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"\s*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = vRe.exec(xml)) !== null) {
    vertices.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]);
  }

  const tRe = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"[^/]*\/>/g;
  while ((m = tRe.exec(xml)) !== null) {
    triangles.push([parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]);
  }

  return { vertices, triangles };
}

/**
 * Extract mesh from an OBJ buffer.
 */
function extractMeshFromOBJ(
  buffer: Buffer,
): { vertices: [number, number, number][]; triangles: [number, number, number][] } {
  const text = buffer.toString("utf-8");
  const vertices: [number, number, number][] = [];
  const triangles: [number, number, number][] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("v ")) {
      const parts = trimmed.split(/\s+/);
      vertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
    } else if (trimmed.startsWith("f ")) {
      const parts = trimmed.split(/\s+/).slice(1);
      // OBJ faces are 1-indexed, may have v/vt/vn format
      const ids = parts.map((p) => parseInt(p.split("/")[0], 10) - 1);
      // Triangulate fan for faces with >3 vertices
      for (let i = 1; i + 1 < ids.length; i++) {
        triangles.push([ids[0], ids[i], ids[i + 1]]);
      }
    }
  }
  return { vertices, triangles };
}

/**
 * POST /api/projects/save
 * Creates a 3MF ZIP containing mesh data + slicer settings and returns it as download.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProjectSaveRequest;

    // Collect mesh data for each model from disk
    const objectDefs: {
      id: number;
      name: string;
      vertices: [number, number, number][];
      triangles: [number, number, number][];
      transform: string;
    }[] = [];

    for (let i = 0; i < body.models.length; i++) {
      const modelInfo = body.models[i];
      const dbModel = getModelById(modelInfo.id);
      if (!dbModel) {
        return NextResponse.json(
          { error: `Model not found: ${modelInfo.id}` },
          { status: 404 },
        );
      }

      // Read the original file
      const fileBuffer = await readFile(dbModel.filePath);
      const format = (dbModel.fileFormat || "stl").toLowerCase();

      let mesh: { vertices: [number, number, number][]; triangles: [number, number, number][] };
      switch (format) {
        case "3mf":
          mesh = extractMeshFrom3MF(fileBuffer);
          break;
        case "obj":
          mesh = extractMeshFromOBJ(fileBuffer);
          break;
        default:
          mesh = extractMeshFromSTL(fileBuffer);
          break;
      }

      const transform = buildTransformString(
        modelInfo.position,
        modelInfo.rotation,
        modelInfo.scale,
      );

      objectDefs.push({
        id: i + 1,
        name: modelInfo.name || dbModel.name,
        vertices: mesh.vertices,
        triangles: mesh.triangles,
        transform,
      });
    }

    // Build the 3MF model XML
    const modelXml = buildModelXml(objectDefs);

    // Build settings metadata
    const settingsJson = JSON.stringify(
      {
        version: 1,
        generator: "OpenSlicer",
        models: body.models.map((m, i) => ({
          objectId: i + 1,
          originalId: m.id,
          name: m.name,
          position: m.position,
          rotation: m.rotation,
          scale: m.scale,
          plateId: m.plateId,
        })),
        plates: body.plates,
        profiles: body.profiles,
        perObjectSettings: body.perObjectSettings,
        sliceOverrides: body.sliceOverrides,
      },
      null,
      2,
    );

    // Create ZIP
    const encoder = new TextEncoder();
    const zipData = zipSync({
      "[Content_Types].xml": encoder.encode(CONTENT_TYPES_XML),
      "_rels/.rels": encoder.encode(RELS_XML),
      "3D/3dmodel.model": encoder.encode(modelXml),
      "Metadata/slicer_settings.json": encoder.encode(settingsJson),
    });

    // Return as downloadable file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `OpenSlicer_Project_${timestamp}.3mf`;

    return new Response(Buffer.from(zipData), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-package.3dmanufacturing-3dmodel+xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipData.byteLength),
      },
    });
  } catch (err) {
    console.error("Project save error:", err);
    return NextResponse.json(
      { error: "Failed to save project" },
      { status: 500 },
    );
  }
}
