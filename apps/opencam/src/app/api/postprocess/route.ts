export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { PostprocessBody } from "@/lib/api-contracts";
import type { BBox3, ToolpathResult } from "@/lib/cam-kernel";
import { mergeBBox3 } from "@/lib/cam-kernel";
import { renderGrbl } from "@/lib/post-processors/grbl";
import { renderMarlin } from "@/lib/post-processors/marlin";
import { renderFanuc } from "@/lib/post-processors/fanuc";
import { renderLinuxcnc } from "@/lib/post-processors/linuxcnc";
import { renderHaas } from "@/lib/post-processors/haas";
import { generatePocketToolpath } from "@/lib/ops/pocket";
import { generateContourToolpath } from "@/lib/ops/contour";
import { generateFaceToolpath } from "@/lib/ops/face";
import { generateDrillToolpath } from "@/lib/ops/drill";
import type { PostRenderInput, PostRenderResult } from "@/lib/post-processor";

// Dialect -> renderer. M1 ships grbl/marlin/fanuc/linuxcnc/haas. mach3 defers to M2.
const renderers: Record<string, ((input: PostRenderInput) => PostRenderResult) | undefined> = {
  grbl: renderGrbl,
  marlin: renderMarlin,
  fanuc: renderFanuc,
  linuxcnc: renderLinuxcnc,
  haas: renderHaas,
  // mach3 ships in M2
};

/** Recompute toolpath for an op missing its cache. Returns null on unsupported kinds. */
async function regenerateToolpath(
  op: typeof schema.opencamOperations.$inferSelect,
  project: typeof schema.opencamProjects.$inferSelect,
): Promise<ToolpathResult | null> {
  const [tool] = op.toolId
    ? await db
        .select()
        .from(schema.opencamTools)
        .where(eq(schema.opencamTools.id, op.toolId))
        .limit(1)
    : [null];
  if (!tool) return null;

  const params = (op.paramsJson ?? {}) as Record<string, unknown>;
  const stock = project.stockBboxJson ?? null;
  const stockTopZMm = stock ? stock.max.z : 0;
  const safeZMm = Number(params.safeZMm ?? stockTopZMm + 5);

  const base = {
    toolDiameterMm: tool.diameterMm,
    feedMmMin: op.feedMmMin,
    spindleRpm: op.spindleRpm,
    safeZMm,
    stockTopZMm,
    stepoverRatio: params.stepoverRatio as number | undefined,
    stepdownMm: op.stepdownMm ?? undefined,
    targetDepthMm: Number(params.targetDepthMm ?? 0),
  };

  if (op.kind === "pocket") {
    const r = await generatePocketToolpath({
      ...base,
      outline: params.outline as Array<{ x: number; y: number }>,
      islands: params.islands as Array<Array<{ x: number; y: number }>> | undefined,
    });
    if (r.notImplemented) return null;
    return { polylines: r.polylines, estimatedDurationSec: r.estimatedDurationSec, bbox: r.bbox };
  }
  if (op.kind === "contour") {
    const r = await generateContourToolpath({
      ...base,
      outline: params.outline as Array<{ x: number; y: number }>,
      side: (params.side as "inside" | "outside" | "on") ?? "on",
      closed: (params.closed as boolean) ?? true,
    });
    return { polylines: r.polylines, estimatedDurationSec: r.estimatedDurationSec, bbox: r.bbox };
  }
  if (op.kind === "face" && stock) {
    const r = await generateFaceToolpath({
      ...base,
      bounds: (params.bounds as BBox3) ?? stock,
      direction: (params.direction as "x" | "y") ?? "x",
    });
    return { polylines: r.polylines, estimatedDurationSec: r.estimatedDurationSec, bbox: r.bbox };
  }
  if (op.kind === "drill") {
    const r = generateDrillToolpath({
      holes: params.holes as Array<{ x: number; y: number; topZMm: number; depthMm: number; diameterMm?: number }>,
      toolDiameterMm: tool.diameterMm,
      feedMmMin: op.feedMmMin,
      spindleRpm: op.spindleRpm,
      safeZMm,
      peckDepthMm: params.peckDepthMm as number | undefined,
      dwellSec: params.dwellSec as number | undefined,
      optimizeOrder: (params.optimizeOrder as "none" | "nearest-neighbor") ?? "nearest-neighbor",
    });
    return { polylines: r.polylines, estimatedDurationSec: r.estimatedDurationSec, bbox: r.bbox };
  }
  return null;
}

/**
 * POST /api/postprocess
 *
 * Render G-Code for a sequence of operations through a selected post-processor.
 * For each op without a cached toolpath, regenerate and cache. Concatenate all
 * renders with a blank line between them. Persist to opencam_gcode.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const json = await req.json().catch(() => null);
  const parsed = PostprocessBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { projectId, operationIds, postId } = parsed.data;

  // Load + ownership-check project.
  const [project] = await db
    .select()
    .from(schema.opencamProjects)
    .where(
      and(
        eq(schema.opencamProjects.id, projectId),
        eq(schema.opencamProjects.userId, userId),
        isNull(schema.opencamProjects.deletedAt),
      ),
    )
    .limit(1);
  if (!project) return NextResponse.json({ error: "project_not_found" }, { status: 404 });

  // Load the post — must be built-in or owned.
  const [post] = await db
    .select()
    .from(schema.opencamPosts)
    .where(
      and(
        eq(schema.opencamPosts.id, postId),
        or(
          isNull(schema.opencamPosts.userId),
          eq(schema.opencamPosts.userId, userId),
        ),
      ),
    )
    .limit(1);
  if (!post) return NextResponse.json({ error: "post_not_found" }, { status: 404 });

  const renderer = renderers[post.dialect];
  if (!renderer) {
    return NextResponse.json(
      {
        error: "feature_deferred",
        milestone: "M2",
        feature: `${post.dialect}-dialect`,
        supported: ["grbl", "marlin", "fanuc", "linuxcnc", "haas"],
        message: `G-code dialect "${post.dialect}" is not yet implemented — ships in the M2 milestone. Supported dialects in M1: grbl, marlin, fanuc, linuxcnc, haas.`,
      },
      {
        status: 422,
        headers: {
          "X-Feature-Status": "deferred-m2",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  // Load operations, preserving the caller-supplied order.
  const opRows = await db
    .select()
    .from(schema.opencamOperations)
    .where(
      and(
        eq(schema.opencamOperations.projectId, projectId),
        inArray(schema.opencamOperations.id, operationIds),
      ),
    );
  if (opRows.length !== operationIds.length) {
    return NextResponse.json({ error: "one or more operations not found" }, { status: 404 });
  }
  const byId = new Map(opRows.map((r) => [r.id, r]));
  const ordered = operationIds.map((id) => byId.get(id)!).filter(Boolean);

  const warnings: string[] = [];
  const gcodeChunks: string[] = [];
  const bboxes: BBox3[] = [];
  let lineCount = 0;
  let estimatedDurationSec = 0;

  const stock = project.stockBboxJson ?? {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 0, y: 0, z: 0 },
  };

  for (const op of ordered) {
    let toolpath: ToolpathResult | null = op.toolpathJson
      ? {
          polylines: op.toolpathJson.polylines,
          estimatedDurationSec: op.toolpathJson.estimatedDurationSec,
          bbox: op.toolpathJson.bbox,
        }
      : null;

    if (!toolpath) {
      toolpath = await regenerateToolpath(op, project);
      if (!toolpath) {
        warnings.push(`op ${op.id} (${op.kind}): could not generate toolpath — skipped`);
        continue;
      }
      await db
        .update(schema.opencamOperations)
        .set({ toolpathJson: toolpath, updatedAt: new Date() })
        .where(eq(schema.opencamOperations.id, op.id));
    }

    // Load the tool for rendering metadata.
    if (!op.toolId) {
      warnings.push(`op ${op.id}: missing toolId — skipped`);
      continue;
    }
    const [tool] = await db
      .select()
      .from(schema.opencamTools)
      .where(eq(schema.opencamTools.id, op.toolId))
      .limit(1);
    if (!tool) {
      warnings.push(`op ${op.id}: tool not found — skipped`);
      continue;
    }

    const render = renderer({
      toolpath,
      tool: { id: tool.id, name: tool.name, diameterMm: tool.diameterMm },
      op: { kind: op.kind, feedMmMin: op.feedMmMin, spindleRpm: op.spindleRpm },
      stock,
    });
    gcodeChunks.push(render.gcode);
    lineCount += render.lineCount;
    estimatedDurationSec += render.estimatedDurationSec;
    bboxes.push(render.bbox);
    warnings.push(...render.warnings);
  }

  const gcodeText = gcodeChunks.join("\n\n");
  const finalBbox = bboxes.length > 0 ? mergeBBox3(...bboxes) : stock;

  const [gcodeRow] = await db
    .insert(schema.opencamGcode)
    .values({
      projectId,
      postId,
      lineCount,
      estimatedDurationSec,
      gcodeText,
      storageKey: null,
    })
    .returning();

  return NextResponse.json(
    {
      gcodeId: gcodeRow.id,
      lineCount,
      estimatedDurationSec,
      bbox: finalBbox,
      warnings,
    },
    { status: 201 },
  );
}
