/**
 * 3MF Format Generator
 *
 * Generates 3D Manufacturing Format (3MF) XML for multi-material models.
 * 3MF is a ZIP-based format containing XML files that describe geometry,
 * materials, and relationships. This is the preferred input format for
 * BambuStudio and PrusaSlicer for multi-material prints.
 *
 * Structure:
 * - [Content_Types].xml — MIME type declarations
 * - _rels/.rels — Root relationships
 * - 3D/3dmodel.model — Geometry + materials XML
 */

import type { ThreeMFAssembly, ThreeMFMaterial, ThreeMFModel } from "../types";

/**
 * Generate the [Content_Types].xml for a 3MF archive.
 */
export function generateContentTypes(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />',
    '  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />',
    '</Types>',
  ].join("\n");
}

/**
 * Generate the _rels/.rels relationships file.
 */
export function generateRelationships(): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />',
    '</Relationships>',
  ].join("\n");
}

/**
 * Generate the 3D/3dmodel.model XML with geometry and material assignments.
 *
 * @param assembly - The assembly containing materials and models
 * @param unit - Measurement unit (default: millimeter)
 */
export function generateModelXML(assembly: ThreeMFAssembly, unit: string = "millimeter"): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(`<model unit="${unit}" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">`);

  // Resources section
  lines.push('  <resources>');

  // Base material group for multi-material
  if (assembly.materials.length > 0) {
    lines.push('    <m:basematerialgroup id="1">');
    for (const mat of assembly.materials) {
      const color = normalizeColor(mat.color);
      lines.push(`      <m:base name="${escapeXml(mat.name)}" displaycolor="${color}" />`);
    }
    lines.push('    </m:basematerialgroup>');
  }

  // Object definitions (one per model)
  for (let i = 0; i < assembly.models.length; i++) {
    const model = assembly.models[i];
    const objectId = i + 2; // IDs start at 2 (1 is basematerialgroup)

    lines.push(`    <object id="${objectId}" type="model" pid="1" pindex="${model.materialIndex}">`);
    lines.push('      <mesh>');

    // Vertices
    lines.push('        <vertices>');
    for (let v = 0; v < model.vertices.length; v += 3) {
      lines.push(`          <vertex x="${model.vertices[v]}" y="${model.vertices[v + 1]}" z="${model.vertices[v + 2]}" />`);
    }
    lines.push('        </vertices>');

    // Triangles
    lines.push('        <triangles>');
    for (let t = 0; t < model.triangles.length; t += 3) {
      lines.push(`          <triangle v1="${model.triangles[t]}" v2="${model.triangles[t + 1]}" v3="${model.triangles[t + 2]}" pid="1" p1="${model.materialIndex}" />`);
    }
    lines.push('        </triangles>');

    lines.push('      </mesh>');
    lines.push('    </object>');
  }

  lines.push('  </resources>');

  // Build section — references each object
  lines.push('  <build>');
  for (let i = 0; i < assembly.models.length; i++) {
    const objectId = i + 2;
    lines.push(`    <item objectid="${objectId}" />`);
  }
  lines.push('  </build>');

  lines.push('</model>');

  return lines.join("\n");
}

/**
 * Generate all files needed for a 3MF archive.
 * Returns a map of file paths to their content strings.
 * The caller is responsible for packing these into a ZIP file.
 */
export function generateThreeMFFiles(assembly: ThreeMFAssembly): Map<string, string> {
  const files = new Map<string, string>();
  files.set("[Content_Types].xml", generateContentTypes());
  files.set("_rels/.rels", generateRelationships());
  files.set("3D/3dmodel.model", generateModelXML(assembly));
  return files;
}

/**
 * Normalize a color string to #RRGGBBAA format for 3MF.
 */
function normalizeColor(color: string): string {
  // Already in correct format
  if (/^#[0-9A-Fa-f]{8}$/.test(color)) return color.toUpperCase();
  // #RRGGBB -> add FF alpha
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return color.toUpperCase() + "FF";
  // #RGB -> expand
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    const r = color[1], g = color[2], b = color[3];
    return `#${r}${r}${g}${g}${b}${b}FF`.toUpperCase();
  }
  // Default gray
  return "#808080FF";
}

/**
 * Escape special XML characters.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
