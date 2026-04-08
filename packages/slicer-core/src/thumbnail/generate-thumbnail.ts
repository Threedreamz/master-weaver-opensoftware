/**
 * G-code thumbnail generator for OpenSlicer.
 *
 * Produces a 300x300 SVG thumbnail from mesh triangle data using an isometric
 * projection, then base64-encodes it as a "data:image/svg+xml" PNG-equivalent
 * block that Bambu/Prusa/Orca G-code viewers can display.
 *
 * Zero external dependencies -- pure SVG string generation.
 */

import type { Triangle, MeshData } from "../mesh-analyzer";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ThumbnailOptions {
  /** Pixel width of the thumbnail. Default: 300 */
  width?: number;
  /** Pixel height of the thumbnail. Default: 300 */
  height?: number;
  /** Background color. Default: "#1a1a2e" */
  bgColor?: string;
  /** Model fill color. Default: "#4cc9f0" */
  fillColor?: string;
  /** Model stroke color. Default: "#3a86a8" */
  strokeColor?: string;
  /** Grid/axis color. Default: "#333355" */
  gridColor?: string;
}

/**
 * Generate a thumbnail SVG string from mesh data.
 *
 * Projects the model triangles onto a 2D isometric view and renders a
 * triptych-style preview (front silhouette, top silhouette, right silhouette)
 * plus an isometric wireframe in the center.
 */
export function generateThumbnailSvg(
  meshData: MeshData,
  options: ThumbnailOptions = {},
): string {
  const w = options.width ?? 300;
  const h = options.height ?? 300;
  const bgColor = options.bgColor ?? "#1a1a2e";
  const fillColor = options.fillColor ?? "#4cc9f0";
  const strokeColor = options.strokeColor ?? "#3a86a8";
  const gridColor = options.gridColor ?? "#333355";

  const bb = meshData.boundingBox;
  const dims = {
    x: bb.max[0] - bb.min[0],
    y: bb.max[1] - bb.min[1],
    z: bb.max[2] - bb.min[2],
  };

  // Collect projected 2D points for each view
  const frontPts = projectFront(meshData.triangles, bb, w, h);
  const topPts = projectTop(meshData.triangles, bb, w, h);
  const isoPts = projectIsometric(meshData.triangles, bb, w, h);

  // Build SVG
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
    `<rect width="${w}" height="${h}" fill="${bgColor}"/>`,

    // Grid lines
    ...generateGrid(w, h, gridColor),

    // Isometric projection of triangles (main view)
    `<g opacity="0.85">`,
    ...renderTriangles(isoPts, fillColor, strokeColor),
    `</g>`,

    // Mini front view (bottom-left inset)
    `<g transform="translate(8, ${h - 78}) scale(0.25)">`,
    `<rect width="${w}" height="${h}" fill="${bgColor}" opacity="0.7" rx="8"/>`,
    `<text x="${w / 2}" y="18" text-anchor="middle" fill="#888" font-size="14" font-family="monospace">FRONT</text>`,
    ...renderSilhouette(frontPts, fillColor, "0.6"),
    `</g>`,

    // Mini top view (bottom-right inset)
    `<g transform="translate(${w - 83}, ${h - 78}) scale(0.25)">`,
    `<rect width="${w}" height="${h}" fill="${bgColor}" opacity="0.7" rx="8"/>`,
    `<text x="${w / 2}" y="18" text-anchor="middle" fill="#888" font-size="14" font-family="monospace">TOP</text>`,
    ...renderSilhouette(topPts, fillColor, "0.6"),
    `</g>`,

    // Dimensions label
    `<text x="${w / 2}" y="${h - 6}" text-anchor="middle" fill="#888" font-size="10" font-family="monospace">`,
    `${dims.x.toFixed(1)} x ${dims.y.toFixed(1)} x ${dims.z.toFixed(1)} mm`,
    `</text>`,

    // OpenSlicer branding
    `<text x="${w / 2}" y="14" text-anchor="middle" fill="#666" font-size="10" font-family="monospace">OpenSlicer</text>`,

    `</svg>`,
  ];

  return svg.join("\n");
}

/**
 * Generate the full G-code thumbnail block in Bambu/Prusa/Orca format:
 *
 * ```
 * ; thumbnail begin 300x300 <bytecount>
 * ; <base64 line ~78 chars>
 * ; ...
 * ; thumbnail end
 * ```
 */
export function generateGcodeThumbnailBlock(
  meshData: MeshData,
  options: ThumbnailOptions = {},
): string {
  const w = options.width ?? 300;
  const h = options.height ?? 300;

  const svg = generateThumbnailSvg(meshData, options);
  const base64 = svgToBase64(svg);
  const byteCount = base64.length;

  const lines: string[] = [];
  lines.push(`; thumbnail begin ${w}x${h} ${byteCount}`);

  // Split base64 into ~78-char lines, each prefixed with "; "
  const lineWidth = 78;
  for (let i = 0; i < base64.length; i += lineWidth) {
    lines.push(`; ${base64.slice(i, i + lineWidth)}`);
  }

  lines.push(`; thumbnail end`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Projection helpers
// ---------------------------------------------------------------------------

type Point2D = [number, number];

interface ProjectedTriangle {
  pts: [Point2D, Point2D, Point2D];
  depth: number; // for painter's algorithm sorting
}

/** Project triangles onto XZ plane (front view: X horizontal, Z vertical). */
function projectFront(
  triangles: Triangle[],
  bb: MeshData["boundingBox"],
  w: number,
  h: number,
): ProjectedTriangle[] {
  const margin = 30;
  const vw = w - margin * 2;
  const vh = h - margin * 2;
  const dx = bb.max[0] - bb.min[0] || 1;
  const dz = bb.max[2] - bb.min[2] || 1;
  const scale = Math.min(vw / dx, vh / dz);

  return triangles.map((t) => {
    const pts: [Point2D, Point2D, Point2D] = [
      [margin + (t.v0[0] - bb.min[0]) * scale, h - margin - (t.v0[2] - bb.min[2]) * scale],
      [margin + (t.v1[0] - bb.min[0]) * scale, h - margin - (t.v1[2] - bb.min[2]) * scale],
      [margin + (t.v2[0] - bb.min[0]) * scale, h - margin - (t.v2[2] - bb.min[2]) * scale],
    ];
    const depth = (t.v0[1] + t.v1[1] + t.v2[1]) / 3;
    return { pts, depth };
  });
}

/** Project triangles onto XY plane (top view: X horizontal, Y vertical). */
function projectTop(
  triangles: Triangle[],
  bb: MeshData["boundingBox"],
  w: number,
  h: number,
): ProjectedTriangle[] {
  const margin = 30;
  const vw = w - margin * 2;
  const vh = h - margin * 2;
  const dx = bb.max[0] - bb.min[0] || 1;
  const dy = bb.max[1] - bb.min[1] || 1;
  const scale = Math.min(vw / dx, vh / dy);

  return triangles.map((t) => {
    const pts: [Point2D, Point2D, Point2D] = [
      [margin + (t.v0[0] - bb.min[0]) * scale, h - margin - (t.v0[1] - bb.min[1]) * scale],
      [margin + (t.v1[0] - bb.min[0]) * scale, h - margin - (t.v1[1] - bb.min[1]) * scale],
      [margin + (t.v2[0] - bb.min[0]) * scale, h - margin - (t.v2[1] - bb.min[1]) * scale],
    ];
    const depth = (t.v0[2] + t.v1[2] + t.v2[2]) / 3;
    return { pts, depth };
  });
}

/** Project triangles using isometric projection (30-degree oblique). */
function projectIsometric(
  triangles: Triangle[],
  bb: MeshData["boundingBox"],
  w: number,
  h: number,
): ProjectedTriangle[] {
  const margin = 40;
  const vw = w - margin * 2;
  const vh = h - margin * 2;

  // Isometric angles
  const cosA = Math.cos(Math.PI / 6); // cos(30)
  const sinA = Math.sin(Math.PI / 6); // sin(30)

  // Center the model
  const cx = (bb.min[0] + bb.max[0]) / 2;
  const cy = (bb.min[1] + bb.max[1]) / 2;
  const cz = (bb.min[2] + bb.max[2]) / 2;

  // Find the projected extent for scaling
  const projectPoint = (v: [number, number, number]): [number, number, number] => {
    const x = v[0] - cx;
    const y = v[1] - cy;
    const z = v[2] - cz;
    // Isometric: px = (x - y) * cos(30), py = -(x + y) * sin(30) - z
    const px = (x - y) * cosA;
    const py = -((x + y) * sinA + z);
    const depth = x + y; // depth for sorting
    return [px, py, depth];
  };

  // First pass: find bounds of projected space
  let minPx = Infinity, maxPx = -Infinity;
  let minPy = Infinity, maxPy = -Infinity;
  for (const t of triangles) {
    for (const v of [t.v0, t.v1, t.v2]) {
      const [px, py] = projectPoint(v);
      if (px < minPx) minPx = px;
      if (px > maxPx) maxPx = px;
      if (py < minPy) minPy = py;
      if (py > maxPy) maxPy = py;
    }
  }

  const projW = maxPx - minPx || 1;
  const projH = maxPy - minPy || 1;
  const scale = Math.min(vw / projW, vh / projH);

  const offsetX = w / 2 - ((minPx + maxPx) / 2) * scale;
  const offsetY = h / 2 - ((minPy + maxPy) / 2) * scale;

  return triangles.map((t) => {
    const [px0, py0, d0] = projectPoint(t.v0);
    const [px1, py1, d1] = projectPoint(t.v1);
    const [px2, py2, d2] = projectPoint(t.v2);

    const pts: [Point2D, Point2D, Point2D] = [
      [px0 * scale + offsetX, py0 * scale + offsetY],
      [px1 * scale + offsetX, py1 * scale + offsetY],
      [px2 * scale + offsetX, py2 * scale + offsetY],
    ];

    return { pts, depth: (d0 + d1 + d2) / 3 };
  });
}

// ---------------------------------------------------------------------------
// SVG rendering helpers
// ---------------------------------------------------------------------------

function generateGrid(w: number, h: number, color: string): string[] {
  const lines: string[] = [];
  const step = 30;
  for (let x = step; x < w; x += step) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${color}" stroke-width="0.5"/>`);
  }
  for (let y = step; y < h; y += step) {
    lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${color}" stroke-width="0.5"/>`);
  }
  return lines;
}

/** Render projected triangles with painter's algorithm (back-to-front). */
function renderTriangles(
  projected: ProjectedTriangle[],
  fillColor: string,
  strokeColor: string,
): string[] {
  // Sort back-to-front (larger depth = further away, draw first)
  const sorted = [...projected].sort((a, b) => a.depth - b.depth);

  // For large meshes, sample triangles to keep SVG size reasonable
  const maxTriangles = 2000;
  const step = sorted.length > maxTriangles ? Math.ceil(sorted.length / maxTriangles) : 1;

  const svgLines: string[] = [];
  for (let i = 0; i < sorted.length; i += step) {
    const t = sorted[i];
    const [[x0, y0], [x1, y1], [x2, y2]] = t.pts;

    // Compute face normal for simple shading (lighter = facing camera)
    const ax = x1 - x0, ay = y1 - y0;
    const bx = x2 - x0, by = y2 - y0;
    const cross = ax * by - ay * bx;
    // Skip back-facing triangles (cross < 0 in screen space)
    if (cross < 0) continue;

    // Simple shading: brightness based on face orientation
    const shade = Math.min(1, 0.3 + 0.7 * (cross / (Math.abs(cross) + 50)));
    const opacity = (0.4 + shade * 0.6).toFixed(2);

    svgLines.push(
      `<polygon points="${x0.toFixed(1)},${y0.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" ` +
      `fill="${fillColor}" fill-opacity="${opacity}" stroke="${strokeColor}" stroke-width="0.3"/>`,
    );
  }
  return svgLines;
}

/** Render a filled silhouette from projected triangles. */
function renderSilhouette(
  projected: ProjectedTriangle[],
  fillColor: string,
  opacity: string,
): string[] {
  // For silhouettes, just draw all triangle outlines filled
  const maxTriangles = 500;
  const step = projected.length > maxTriangles ? Math.ceil(projected.length / maxTriangles) : 1;

  const svgLines: string[] = [];
  for (let i = 0; i < projected.length; i += step) {
    const t = projected[i];
    const [[x0, y0], [x1, y1], [x2, y2]] = t.pts;
    svgLines.push(
      `<polygon points="${x0.toFixed(1)},${y0.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" ` +
      `fill="${fillColor}" fill-opacity="${opacity}" stroke="none"/>`,
    );
  }
  return svgLines;
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

/** Convert SVG string to base64. Works in Node.js (Buffer) and edge runtimes. */
function svgToBase64(svg: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(svg, "utf-8").toString("base64");
  }
  // Fallback for edge runtimes
  return btoa(unescape(encodeURIComponent(svg)));
}
