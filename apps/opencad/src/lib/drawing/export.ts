/**
 * Engineering drawing sheet exporter.
 *
 * Composes ProjectionResults + Dimensions onto a titled sheet.
 * - SVG: always available, pure string output (mm-based viewBox).
 * - PDF: best-effort via `jspdf` + `svg2pdf.js`. Falls back to SVG bytes
 *   tagged `format: 'svg-fallback'` when either dep is missing.
 *
 * Local type copies (ProjectionViewLite, DimensionLite) intentionally
 * mirror — not import — shapes from `./projection.ts` to stay decoupled.
 */

export interface Point2 {
  x: number;
  y: number;
}

export interface Line2 {
  p0: Point2;
  p1: Point2;
}

export interface ProjectionViewLite {
  view: string;
  visibleEdges: Line2[];
  hiddenEdges: Line2[];
  bbox2d: { min: Point2; max: Point2 };
  /** top-left corner of this view on the sheet, in mm */
  position: Point2;
  /** 1 = 1:1, 0.5 = 1:2 */
  scale: number;
}

export interface DimensionLite {
  id: string;
  /** attaches to a specific view (optional) */
  viewId?: string;
  extensionLines: Line2[];
  dimLine: Line2;
  arrows: { position: Point2; direction: Point2 }[];
  label: { position: Point2; text: string; anchor: "start" | "middle" | "end" };
}

export interface Sheet {
  widthMm: number;
  heightMm: number;
  title: string;
  author?: string;
  /** default 1 */
  scale?: number;
  revision?: string;
}

export interface PDFResult {
  bytes: Uint8Array;
  format: "pdf" | "svg-fallback";
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeXml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  // Trim trailing zeros, keep precision reasonable for mm drawings.
  return Number(n.toFixed(4)).toString();
}

function edgesToPath(edges: Line2[]): string {
  if (!edges || edges.length === 0) return "";
  const parts: string[] = [];
  for (const e of edges) {
    parts.push(`M ${fmt(e.p0.x)} ${fmt(e.p0.y)} L ${fmt(e.p1.x)} ${fmt(e.p1.y)}`);
  }
  return parts.join(" ");
}

/** Render a small filled triangle at `position` pointing along `direction`. */
function arrowPolygon(
  position: Point2,
  direction: Point2,
  sizeMm = 2.5,
): string {
  const dx = direction.x;
  const dy = direction.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // perpendicular
  const px = -uy;
  const py = ux;
  const tipX = position.x;
  const tipY = position.y;
  const baseX = tipX - ux * sizeMm;
  const baseY = tipY - uy * sizeMm;
  const half = sizeMm * 0.35;
  const b1x = baseX + px * half;
  const b1y = baseY + py * half;
  const b2x = baseX - px * half;
  const b2y = baseY - py * half;
  return `${fmt(tipX)},${fmt(tipY)} ${fmt(b1x)},${fmt(b1y)} ${fmt(b2x)},${fmt(b2y)}`;
}

function renderView(v: ProjectionViewLite): string {
  const tx = fmt(v.position.x);
  const ty = fmt(v.position.y);
  const s = fmt(v.scale);
  const parts: string[] = [];
  parts.push(
    `<g class="view" data-view="${escapeXml(v.view)}" transform="translate(${tx} ${ty}) scale(${s})">`,
  );
  const visD = edgesToPath(v.visibleEdges);
  if (visD) {
    parts.push(
      `<path class="visible" d="${visD}" fill="none" stroke="black" stroke-width="0.35" />`,
    );
  }
  const hidD = edgesToPath(v.hiddenEdges);
  if (hidD) {
    parts.push(
      `<path class="hidden" d="${hidD}" fill="none" stroke="black" stroke-width="0.25" stroke-dasharray="3 2" />`,
    );
  }
  parts.push(`</g>`);
  return parts.join("");
}

function renderDimension(d: DimensionLite): string {
  const parts: string[] = [];
  parts.push(`<g class="dim" data-dim="${escapeXml(d.id)}">`);
  // extension lines
  for (const ex of d.extensionLines) {
    parts.push(
      `<line x1="${fmt(ex.p0.x)}" y1="${fmt(ex.p0.y)}" x2="${fmt(ex.p1.x)}" y2="${fmt(ex.p1.y)}" stroke="black" stroke-width="0.2" />`,
    );
  }
  // dim line
  parts.push(
    `<line class="dim-line" x1="${fmt(d.dimLine.p0.x)}" y1="${fmt(d.dimLine.p0.y)}" x2="${fmt(d.dimLine.p1.x)}" y2="${fmt(d.dimLine.p1.y)}" stroke="black" stroke-width="0.25" />`,
  );
  // arrows
  for (const a of d.arrows) {
    parts.push(
      `<polygon class="arrow" points="${arrowPolygon(a.position, a.direction)}" fill="black" />`,
    );
  }
  // label
  parts.push(
    `<text x="${fmt(d.label.position.x)}" y="${fmt(d.label.position.y)}" text-anchor="${d.label.anchor}" font-size="3" font-family="sans-serif" fill="black">${escapeXml(d.label.text)}</text>`,
  );
  parts.push(`</g>`);
  return parts.join("");
}

function renderTitleBlock(sheet: Sheet): string {
  const blockW = 80;
  const blockH = 30;
  const x = sheet.widthMm - blockW - 5;
  const y = sheet.heightMm - blockH - 5;
  const title = escapeXml(sheet.title);
  const author = sheet.author ? escapeXml(sheet.author) : "";
  const rev = sheet.revision ? escapeXml(sheet.revision) : "";
  const scale = sheet.scale ?? 1;
  const parts: string[] = [];
  parts.push(`<g class="title-block">`);
  parts.push(
    `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(blockW)}" height="${fmt(blockH)}" fill="none" stroke="black" stroke-width="0.4" />`,
  );
  parts.push(
    `<line x1="${fmt(x)}" y1="${fmt(y + 10)}" x2="${fmt(x + blockW)}" y2="${fmt(y + 10)}" stroke="black" stroke-width="0.25" />`,
  );
  parts.push(
    `<text class="sheet-title" x="${fmt(x + 3)}" y="${fmt(y + 7)}" font-size="4" font-family="sans-serif" fill="black">${title}</text>`,
  );
  parts.push(
    `<text x="${fmt(x + 3)}" y="${fmt(y + 17)}" font-size="2.5" font-family="sans-serif" fill="black">Author: ${author}</text>`,
  );
  parts.push(
    `<text x="${fmt(x + 3)}" y="${fmt(y + 22)}" font-size="2.5" font-family="sans-serif" fill="black">Scale: 1:${fmt(1 / (scale || 1))}</text>`,
  );
  parts.push(
    `<text x="${fmt(x + 3)}" y="${fmt(y + 27)}" font-size="2.5" font-family="sans-serif" fill="black">Rev: ${rev}</text>`,
  );
  parts.push(`</g>`);
  return parts.join("");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function exportDrawingSVG(
  views: ProjectionViewLite[],
  dimensions: DimensionLite[],
  sheet: Sheet,
): string {
  const W = sheet.widthMm;
  const H = sheet.heightMm;
  const parts: string[] = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(W)}mm" height="${fmt(H)}mm" viewBox="0 0 ${fmt(W)} ${fmt(H)}">`,
  );
  // Sheet border
  parts.push(
    `<rect class="sheet-border" x="0" y="0" width="${fmt(W)}" height="${fmt(H)}" fill="white" stroke="black" stroke-width="0.5" />`,
  );
  // Views
  for (const v of views) {
    parts.push(renderView(v));
  }
  // Dimensions
  for (const d of dimensions) {
    parts.push(renderDimension(d));
  }
  // Title block
  parts.push(renderTitleBlock(sheet));
  parts.push(`</svg>`);
  return parts.join("\n");
}

function utf8Encode(str: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  // Fallback for environments without TextEncoder.
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

export async function exportDrawingPDF(
  views: ProjectionViewLite[],
  dimensions: DimensionLite[],
  sheet: Sheet,
): Promise<PDFResult> {
  const svg = exportDrawingSVG(views, dimensions, sheet);
  const warnings: string[] = [];

  let jspdfMod: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // @ts-expect-error — jspdf is an optional dep; module missing at typecheck is fine.
    jspdfMod = await import("jspdf");
  } catch {
    warnings.push("jspdf not installed");
    return {
      bytes: utf8Encode(svg),
      format: "svg-fallback",
      warnings,
    };
  }

  const JsPDF: any = jspdfMod?.jsPDF ?? jspdfMod?.default ?? jspdfMod;
  if (typeof JsPDF !== "function") {
    warnings.push("jspdf not installed");
    return {
      bytes: utf8Encode(svg),
      format: "svg-fallback",
      warnings,
    };
  }

  // svg2pdf.js companion — required for doc.svg() support.
  try {
    // @ts-expect-error — svg2pdf.js is an optional dep; module missing at typecheck is fine.
    await import("svg2pdf.js");
  } catch {
    warnings.push("svg2pdf.js not installed");
    return {
      bytes: utf8Encode(svg),
      format: "svg-fallback",
      warnings,
    };
  }

  let doc: any;
  try {
    doc = new JsPDF({
      orientation: sheet.widthMm >= sheet.heightMm ? "landscape" : "portrait",
      unit: "mm",
      format: [sheet.widthMm, sheet.heightMm],
    });
  } catch (err) {
    warnings.push(
      `jspdf constructor failed: ${(err as Error)?.message ?? "unknown"}`,
    );
    return {
      bytes: utf8Encode(svg),
      format: "svg-fallback",
      warnings,
    };
  }

  try {
    if (typeof doc.svg !== "function") {
      warnings.push("doc.svg not available (svg2pdf.js not wired)");
      return {
        bytes: utf8Encode(svg),
        format: "svg-fallback",
        warnings,
      };
    }
    // doc.svg expects a DOM element; parse if DOMParser is available.
    let svgNode: any = svg;
    if (typeof DOMParser !== "undefined") {
      svgNode = new DOMParser().parseFromString(svg, "image/svg+xml")
        .documentElement;
    }
    await doc.svg(svgNode, {
      x: 0,
      y: 0,
      width: sheet.widthMm,
      height: sheet.heightMm,
    });
    const arrayBuffer: ArrayBuffer = doc.output("arraybuffer");
    return {
      bytes: new Uint8Array(arrayBuffer),
      format: "pdf",
      warnings,
    };
  } catch (err) {
    warnings.push(
      `pdf render failed: ${(err as Error)?.message ?? "unknown"}`,
    );
    return {
      bytes: utf8Encode(svg),
      format: "svg-fallback",
      warnings,
    };
  }
}
