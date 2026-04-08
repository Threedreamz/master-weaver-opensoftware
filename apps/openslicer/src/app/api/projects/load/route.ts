import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { unzipSync } from "fflate";
import { createModel, updateModel } from "../../../../db/queries/models";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = join(process.cwd(), "data", "models");

interface SlicerSettings {
  version: number;
  generator: string;
  models: {
    objectId: number;
    originalId: string;
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

interface ParsedObject {
  id: number;
  name: string;
  vertices: [number, number, number][];
  triangles: [number, number, number][];
  transform?: string;
}

/**
 * Parse the 3D/3dmodel.model XML for mesh objects.
 */
function parseModelXml(xml: string): ParsedObject[] {
  const objects: ParsedObject[] = [];

  // Extract each <object> block
  const objectRegex = /<object\s+id="(\d+)"[^>]*(?:name="([^"]*)")?[^>]*>([\s\S]*?)<\/object>/g;
  let objMatch: RegExpExecArray | null;

  while ((objMatch = objectRegex.exec(xml)) !== null) {
    const id = parseInt(objMatch[1], 10);
    // Name might appear anywhere in the attributes
    const nameMatch = objMatch[0].match(/name="([^"]*)"/);
    const name = nameMatch ? nameMatch[1] : `Object_${id}`;
    const meshBlock = objMatch[3];

    const vertices: [number, number, number][] = [];
    const triangles: [number, number, number][] = [];

    const vRe = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"\s*\/>/g;
    let m: RegExpExecArray | null;
    while ((m = vRe.exec(meshBlock)) !== null) {
      vertices.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]);
    }

    const tRe = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"[^/]*\/>/g;
    while ((m = tRe.exec(meshBlock)) !== null) {
      triangles.push([parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]);
    }

    objects.push({ id, name, vertices, triangles });
  }

  // Extract transforms from <build> items
  const itemRegex = /<item\s+objectid="(\d+)"(?:\s+transform="([^"]*)")?[^/]*\/>/g;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const objId = parseInt(itemMatch[1], 10);
    const transform = itemMatch[2];
    const obj = objects.find((o) => o.id === objId);
    if (obj && transform) {
      obj.transform = transform;
    }
  }

  return objects;
}

/**
 * Convert 3MF mesh data to a binary STL buffer for storage.
 */
function meshToSTL(
  vertices: [number, number, number][],
  triangles: [number, number, number][],
): Buffer {
  const triCount = triangles.length;
  const buffer = Buffer.alloc(84 + triCount * 50);

  // 80-byte header
  const header = "OpenSlicer 3MF Import";
  buffer.write(header, 0, "ascii");

  // Triangle count
  buffer.writeUInt32LE(triCount, 80);

  for (let i = 0; i < triCount; i++) {
    const offset = 84 + i * 50;
    const [i0, i1, i2] = triangles[i];
    const v0 = vertices[i0] || [0, 0, 0];
    const v1 = vertices[i1] || [0, 0, 0];
    const v2 = vertices[i2] || [0, 0, 0];

    // Compute face normal
    const ux = v1[0] - v0[0], uy = v1[1] - v0[1], uz = v1[2] - v0[2];
    const vx = v2[0] - v0[0], vy = v2[1] - v0[1], vz = v2[2] - v0[2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

    // Normal
    buffer.writeFloatLE(nx / len, offset);
    buffer.writeFloatLE(ny / len, offset + 4);
    buffer.writeFloatLE(nz / len, offset + 8);

    // Vertex 1
    buffer.writeFloatLE(v0[0], offset + 12);
    buffer.writeFloatLE(v0[1], offset + 16);
    buffer.writeFloatLE(v0[2], offset + 20);
    // Vertex 2
    buffer.writeFloatLE(v1[0], offset + 24);
    buffer.writeFloatLE(v1[1], offset + 28);
    buffer.writeFloatLE(v1[2], offset + 32);
    // Vertex 3
    buffer.writeFloatLE(v2[0], offset + 36);
    buffer.writeFloatLE(v2[1], offset + 40);
    buffer.writeFloatLE(v2[2], offset + 44);

    // Attribute byte count (unused)
    buffer.writeUInt16LE(0, offset + 48);
  }

  return buffer;
}

/**
 * Parse a 3x4 transform string into position, rotation (degrees), scale.
 */
function parseTransform(transformStr: string): {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
} {
  const vals = transformStr.split(/\s+/).map(Number);
  if (vals.length < 12) {
    return {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
  }

  const [m00, m01, m02, m10, m11, m12, m20, m21, m22, tx, ty, tz] = vals;

  // Extract scale as column magnitudes
  const sx = Math.sqrt(m00 * m00 + m10 * m10 + m20 * m20);
  const sy = Math.sqrt(m01 * m01 + m11 * m11 + m21 * m21);
  const sz = Math.sqrt(m02 * m02 + m12 * m12 + m22 * m22);

  // Extract rotation from normalized matrix
  const r00 = m00 / (sx || 1);
  const r10 = m10 / (sx || 1);
  const r20 = m20 / (sx || 1);
  const r11 = m11 / (sy || 1);
  const r21 = m21 / (sy || 1);
  const r22 = m22 / (sz || 1);

  const ry = Math.asin(-Math.max(-1, Math.min(1, r20)));
  let rx: number, rz: number;

  if (Math.abs(r20) < 0.99999) {
    rx = Math.atan2(r21, r22);
    rz = Math.atan2(r10, r00);
  } else {
    rx = Math.atan2(-m12 / (sy || 1), r11);
    rz = 0;
  }

  return {
    position: [tx, ty, tz],
    rotation: [(rx * 180) / Math.PI, (ry * 180) / Math.PI, (rz * 180) / Math.PI],
    scale: [sx, sy, sz],
  };
}

/**
 * POST /api/projects/load
 * Accepts a .3mf file, extracts meshes and settings, saves models to disk + DB.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(uint8);
    } catch {
      return NextResponse.json(
        { error: "Invalid 3MF file — could not unzip" },
        { status: 400 },
      );
    }

    // Find the model XML
    let modelData: Uint8Array | null = null;
    for (const [path, data] of Object.entries(entries)) {
      if (path.toLowerCase().endsWith("3dmodel.model")) {
        modelData = data;
        break;
      }
    }
    if (!modelData) {
      return NextResponse.json(
        { error: "3MF does not contain a 3D model file" },
        { status: 400 },
      );
    }

    const modelXml = new TextDecoder().decode(modelData);
    const parsedObjects = parseModelXml(modelXml);

    if (parsedObjects.length === 0) {
      return NextResponse.json(
        { error: "3MF contains no mesh objects" },
        { status: 400 },
      );
    }

    // Parse settings if present
    let settings: SlicerSettings | null = null;
    const settingsEntry =
      entries["Metadata/slicer_settings.json"] ||
      entries["metadata/slicer_settings.json"];
    if (settingsEntry) {
      try {
        settings = JSON.parse(new TextDecoder().decode(settingsEntry));
      } catch {
        // Settings file corrupted — proceed without
      }
    }

    // Ensure upload directory
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Save each object as an STL file and create DB records
    const resultModels: {
      id: string;
      name: string;
      filename: string;
      fileFormat: string;
      fileSizeBytes: number;
      triangleCount: number;
      vertexCount: number;
      boundingBox: { x: number; y: number; z: number };
      meshAnalyzed: boolean;
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
      plateId?: string;
    }[] = [];

    // Build a map from objectId to settings metadata
    const settingsMap = new Map<number, SlicerSettings["models"][number]>();
    if (settings?.models) {
      for (const sm of settings.models) {
        settingsMap.set(sm.objectId, sm);
      }
    }

    for (const obj of parsedObjects) {
      const stlBuffer = meshToSTL(obj.vertices, obj.triangles);
      const hash = createHash("sha256").update(stlBuffer).digest("hex").slice(0, 16);
      const safeFilename = `${hash}_${obj.name.replace(/[^a-zA-Z0-9._-]/g, "_")}.stl`;
      const filePath = join(UPLOAD_DIR, safeFilename);

      await writeFile(filePath, stlBuffer);

      // Compute bounding box from vertices
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const [x, y, z] of obj.vertices) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
      }

      const dimensions = {
        x: maxX - minX,
        y: maxY - minY,
        z: maxZ - minZ,
      };

      const dbModel = createModel({
        name: obj.name,
        filename: `${obj.name}.stl`,
        fileFormat: "stl",
        filePath,
        fileSizeBytes: stlBuffer.length,
        fileHash: hash,
        triangleCount: obj.triangles.length,
        vertexCount: obj.vertices.length,
        boundingBoxX: dimensions.x,
        boundingBoxY: dimensions.y,
        boundingBoxZ: dimensions.z,
        meshAnalyzed: true,
      });

      // Resolve transform: prefer settings metadata, fall back to 3MF XML transform
      const settingsMeta = settingsMap.get(obj.id);
      let position: [number, number, number] = [0, 0, 0];
      let rotation: [number, number, number] = [0, 0, 0];
      let scale: [number, number, number] = [1, 1, 1];

      if (settingsMeta) {
        position = settingsMeta.position || position;
        rotation = settingsMeta.rotation || rotation;
        scale = settingsMeta.scale || scale;
      } else if (obj.transform) {
        const parsed = parseTransform(obj.transform);
        position = parsed.position;
        rotation = parsed.rotation;
        scale = parsed.scale;
      }

      resultModels.push({
        id: dbModel.id,
        name: obj.name,
        filename: `${obj.name}.stl`,
        fileFormat: "stl",
        fileSizeBytes: stlBuffer.length,
        triangleCount: obj.triangles.length,
        vertexCount: obj.vertices.length,
        boundingBox: dimensions,
        meshAnalyzed: true,
        position,
        rotation,
        scale,
        plateId: settingsMeta?.plateId,
      });
    }

    // Remap plate modelIds from original IDs to new DB IDs
    let resultPlates = settings?.plates || [];
    if (settings?.models && settings.plates) {
      const idMap = new Map<string, string>();
      for (let i = 0; i < settings.models.length && i < resultModels.length; i++) {
        idMap.set(settings.models[i].originalId, resultModels[i].id);
      }
      resultPlates = settings.plates.map((plate) => ({
        ...plate,
        modelIds: plate.modelIds
          .map((oldId) => idMap.get(oldId))
          .filter((id): id is string => !!id),
      }));
    }

    return NextResponse.json({
      models: resultModels,
      settings: settings
        ? {
            profiles: settings.profiles,
            perObjectSettings: settings.perObjectSettings,
            sliceOverrides: settings.sliceOverrides,
          }
        : null,
      plates: resultPlates,
    });
  } catch (err) {
    console.error("Project load error:", err);
    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 },
    );
  }
}
