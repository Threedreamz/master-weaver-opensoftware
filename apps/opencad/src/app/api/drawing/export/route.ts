export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/drawing/export
 *
 * Produces a printable engineering drawing sheet (SVG or PDF) for a
 * project's evaluated geometry. Mirrors the subject-selection model of
 * `/api/drawing/project`: one subject feature, four standard views laid
 * out on a titled sheet with user-authored dimensions composited on top.
 *
 * Layout: the four projections are tiled in a 2×2 grid with a uniform
 * gutter so the title-block (drawn by the exporter) and the sheet border
 * don't overlap them. Each tile is scaled uniformly — we do NOT normalize
 * view bboxes independently (that would break 1:1 measurements across
 * views, which defeats the purpose of an orthographic drawing).
 *
 * Auth: session. 401 if missing, 404 if project / feature not owned.
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { evaluateTree } from "@/lib/feature-timeline";
import { deserializeGeometry } from "@/lib/cad-kernel";
import { getCachedGeometry } from "@/lib/geometry-cache";
import {
  projectSolid,
  type ProjectionResult,
  type StandardView,
} from "@/lib/drawing/projection";
import {
  exportDrawingSVG,
  exportDrawingPDF,
  type DimensionLite,
  type ProjectionViewLite,
  type Sheet,
} from "@/lib/drawing/export";

/* ---------------------------------------------------------- zod schema */

const Point2Schema = z.object({ x: z.number(), y: z.number() });
const Line2Schema = z.object({ p0: Point2Schema, p1: Point2Schema });

const DimensionLiteSchema = z.object({
  id: z.string().min(1),
  viewId: z.string().optional(),
  extensionLines: z.array(Line2Schema),
  dimLine: Line2Schema,
  arrows: z.array(
    z.object({ position: Point2Schema, direction: Point2Schema }),
  ),
  label: z.object({
    position: Point2Schema,
    text: z.string(),
    anchor: z.enum(["start", "middle", "end"]),
  }),
});

const SheetSchema = z.object({
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  title: z.string().min(1),
  author: z.string().optional(),
  scale: z.number().positive().optional(),
  revision: z.string().optional(),
});

const DrawingExportBody = z.object({
  projectId: z.string().min(1),
  featureId: z.string().min(1).optional(),
  format: z.enum(["svg", "pdf"]),
  sheet: SheetSchema,
  dimensions: z.array(DimensionLiteSchema).optional(),
});

type DrawingExportBody = z.infer<typeof DrawingExportBody>;

/* ---------------------------------------------------------- layout */

/**
 * Place up to four projections in a 2×2 grid inside the sheet's drawable
 * region. Leaves a fixed margin for the sheet border and title block,
 * then distributes tiles by integer quadrant. `ProjectionViewLite` expects
 * a `position` (top-left in mm) and a scale factor — we keep scale = the
 * caller's sheet.scale (default 1) so dimensions stay dimensionally true.
 */
function layoutViews(
  projections: ProjectionResult[],
  sheet: Sheet,
): ProjectionViewLite[] {
  const scale = sheet.scale ?? 1;
  const margin = 10; // mm — leaves room for the sheet border.
  const titleBlockReserveX = 90; // mm — width of the reserved title-block strip.
  const titleBlockReserveY = 40; // mm — height reserved along the bottom.
  const drawableW = Math.max(
    10,
    sheet.widthMm - margin * 2 - titleBlockReserveX,
  );
  const drawableH = Math.max(
    10,
    sheet.heightMm - margin * 2 - titleBlockReserveY,
  );
  const tileW = drawableW / 2;
  const tileH = drawableH / 2;

  return projections.map((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    // Anchor each tile at its own bbox.min so the projection's local origin
    // lands inside the allotted cell (projections can have negative coords).
    const offsetX = margin + col * tileW - p.bbox2d.min.x * scale;
    const offsetY = margin + row * tileH - p.bbox2d.min.y * scale;
    const view: ProjectionViewLite = {
      view: p.view,
      visibleEdges: p.visibleEdges,
      hiddenEdges: p.hiddenEdges,
      bbox2d: p.bbox2d,
      position: { x: offsetX, y: offsetY },
      scale,
    };
    // Bind the tile dimensions into scope so TS notices the values exist
    // — helpful when adjusting the layout later.
    void tileW;
    void tileH;
    return view;
  });
}

/* ---------------------------------------------------------- handler */

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const json = await req.json().catch(() => null);
  const parsed = DrawingExportBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const project = await db.query.opencadProjects.findFirst({
    where: and(
      eq(schema.opencadProjects.id, body.projectId),
      eq(schema.opencadProjects.userId, userId),
      isNull(schema.opencadProjects.deletedAt),
    ),
  });
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await evaluateTree(body.projectId);

    let targetFeature;
    if (body.featureId) {
      targetFeature = await db.query.opencadFeatures.findFirst({
        where: and(
          eq(schema.opencadFeatures.id, body.featureId),
          eq(schema.opencadFeatures.projectId, body.projectId),
        ),
      });
      if (!targetFeature) {
        return NextResponse.json(
          { error: "not_found", details: "featureId not in project" },
          { status: 404 },
        );
      }
    } else {
      const rows = await db
        .select()
        .from(schema.opencadFeatures)
        .where(eq(schema.opencadFeatures.projectId, body.projectId))
        .orderBy(desc(schema.opencadFeatures.order))
        .limit(1);
      targetFeature = rows[0];
      if (!targetFeature) {
        return NextResponse.json(
          { error: "not_found", details: "project has no features" },
          { status: 404 },
        );
      }
    }

    const hash = targetFeature.outputGeometryHash ?? null;
    if (!hash) {
      return NextResponse.json(
        {
          error: "not_evaluated",
          details: "target feature has no cached geometry — evaluateTree failed",
        },
        { status: 500 },
      );
    }
    const cached = getCachedGeometry(hash);
    if (!cached) {
      return NextResponse.json(
        {
          error: "cache_miss",
          details:
            "geometry cache entry missing for feature — re-evaluate the project",
        },
        { status: 500 },
      );
    }
    const geom = deserializeGeometry(cached);

    const viewsToProject: StandardView[] = ["front", "top", "right", "iso"];
    const projections = viewsToProject.map((v) =>
      projectSolid(geom, v, { hiddenLine: true }),
    );
    geom.dispose();

    const sheet: Sheet = {
      widthMm: body.sheet.widthMm,
      heightMm: body.sheet.heightMm,
      title: body.sheet.title,
      author: body.sheet.author,
      scale: body.sheet.scale,
      revision: body.sheet.revision,
    };
    const layout = layoutViews(projections, sheet);
    const dimensions: DimensionLite[] = body.dimensions ?? [];

    if (body.format === "svg") {
      const svg = exportDrawingSVG(layout, dimensions, sheet);
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Content-Disposition": `inline; filename="${body.sheet.title.replace(/[^a-z0-9_-]+/gi, "_")}.svg"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // PDF path — may silently degrade to SVG when optional deps are missing.
    const pdf = await exportDrawingPDF(layout, dimensions, sheet);
    const contentType =
      pdf.format === "pdf" ? "application/pdf" : "image/svg+xml; charset=utf-8";
    const ext = pdf.format === "pdf" ? "pdf" : "svg";
    const baseName = body.sheet.title.replace(/[^a-z0-9_-]+/gi, "_");
    const bytes: Uint8Array = pdf.bytes;
    // Slice into a plain ArrayBuffer so the Response body type is
    // unambiguous across Node/Edge runtimes.
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${baseName}.${ext}"`,
      "Cache-Control": "no-store",
      "X-Export-Format": pdf.format,
    };
    if (pdf.warnings.length > 0) {
      headers["X-Export-Warnings"] = encodeURIComponent(
        pdf.warnings.join("; "),
      );
    }
    return new NextResponse(buffer, { status: 200, headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[opencad] drawing export failed:", msg);
    return NextResponse.json({ error: "internal", details: msg }, { status: 500 });
  }
}
