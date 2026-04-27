export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { resolveUser } from "@/lib/internal-user";
import { db, schema } from "@/db";
import { and, eq, isNull } from "drizzle-orm";
import { generatePocketToolpath } from "@/lib/ops/pocket";
import { generateContourToolpath } from "@/lib/ops/contour";
import { generateFaceToolpath } from "@/lib/ops/face";
import { generateDrillToolpath } from "@/lib/ops/drill";
import type { BBox3 } from "@/lib/cam-kernel";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * POST /api/operations/[id]/generate
 *
 * Compute the toolpath for the operation, cache it in opencamOperations.toolpathJson,
 * and return the canonical GenerateToolpathResponse shape.
 */
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;
  const { id } = await ctx.params;

  // Load op + owning project (ownership gate).
  const [joined] = await db
    .select({ op: schema.opencamOperations, project: schema.opencamProjects })
    .from(schema.opencamOperations)
    .innerJoin(
      schema.opencamProjects,
      eq(schema.opencamProjects.id, schema.opencamOperations.projectId),
    )
    .where(
      and(
        eq(schema.opencamOperations.id, id),
        eq(schema.opencamProjects.userId, userId),
        isNull(schema.opencamProjects.deletedAt),
      ),
    )
    .limit(1);

  if (!joined) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { op, project } = joined;

  // Load the tool for kinematics.
  if (!op.toolId) {
    return NextResponse.json({ error: "operation missing toolId" }, { status: 400 });
  }
  const [tool] = await db
    .select()
    .from(schema.opencamTools)
    .where(eq(schema.opencamTools.id, op.toolId))
    .limit(1);
  if (!tool) return NextResponse.json({ error: "tool not found" }, { status: 400 });

  const params = (op.paramsJson ?? {}) as Record<string, unknown>;
  const stock = project.stockBboxJson ?? null;

  // Reject obviously incomplete stock setups for kinds that need it.
  const needsStock = op.kind === "face" || op.kind === "pocket" || op.kind === "contour";
  if (needsStock && !stock) {
    return NextResponse.json(
      { error: "project.stockBboxJson required for this operation kind" },
      { status: 400 },
    );
  }
  const stockTopZMm = stock ? stock.max.z : 0;
  const safeZMm = Number(params.safeZMm ?? (stockTopZMm + 5));

  // Branch on kind.
  if (op.kind === "adaptive" || op.kind === "3d-parallel") {
    return NextResponse.json(
      {
        error: "feature_deferred",
        milestone: "M2",
        feature: op.kind,
        supported: ["face", "contour", "pocket", "drill"],
        message: `Operation kind "${op.kind}" is not yet implemented — ships in the M2 milestone. Supported kinds in M1: face, contour, pocket, drill.`,
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

  try {
    let result: {
      polylines: Array<Array<{ x: number; y: number; z: number }>>;
      estimatedDurationSec: number;
      bbox: BBox3;
      notImplemented?: boolean;
      warnings: string[];
    };

    if (op.kind === "pocket") {
      const outline = params.outline as Array<{ x: number; y: number }> | undefined;
      if (!Array.isArray(outline) || outline.length < 3) {
        return NextResponse.json(
          { error: "pocket: paramsJson.outline (>=3 points) required" },
          { status: 400 },
        );
      }
      const targetDepthMm = Number(params.targetDepthMm);
      if (!Number.isFinite(targetDepthMm) || targetDepthMm <= 0) {
        return NextResponse.json(
          { error: "pocket: paramsJson.targetDepthMm must be positive" },
          { status: 400 },
        );
      }
      result = await generatePocketToolpath({
        toolDiameterMm: tool.diameterMm,
        feedMmMin: op.feedMmMin,
        spindleRpm: op.spindleRpm,
        safeZMm,
        stockTopZMm,
        stepoverRatio: params.stepoverRatio as number | undefined,
        stepdownMm: op.stepdownMm ?? undefined,
        targetDepthMm,
        outline,
        islands: params.islands as Array<Array<{ x: number; y: number }>> | undefined,
      });
      if (result.notImplemented) {
        return NextResponse.json(
          { error: "jscut not installed — pocket requires optional dep" },
          { status: 501 },
        );
      }
    } else if (op.kind === "contour") {
      const outline = params.outline as Array<{ x: number; y: number }> | undefined;
      if (!Array.isArray(outline) || outline.length < 2) {
        return NextResponse.json(
          { error: "contour: paramsJson.outline (>=2 points) required" },
          { status: 400 },
        );
      }
      const targetDepthMm = Number(params.targetDepthMm);
      if (!Number.isFinite(targetDepthMm) || targetDepthMm <= 0) {
        return NextResponse.json(
          { error: "contour: paramsJson.targetDepthMm must be positive" },
          { status: 400 },
        );
      }
      result = await generateContourToolpath({
        toolDiameterMm: tool.diameterMm,
        feedMmMin: op.feedMmMin,
        spindleRpm: op.spindleRpm,
        safeZMm,
        stockTopZMm,
        stepoverRatio: params.stepoverRatio as number | undefined,
        stepdownMm: op.stepdownMm ?? undefined,
        targetDepthMm,
        outline,
        side: (params.side as "inside" | "outside" | "on") ?? "on",
        closed: (params.closed as boolean) ?? true,
      });
    } else if (op.kind === "face") {
      const bounds = (params.bounds as BBox3 | undefined) ?? stock!;
      const targetDepthMm = Number(params.targetDepthMm);
      if (!Number.isFinite(targetDepthMm) || targetDepthMm <= 0) {
        return NextResponse.json(
          { error: "face: paramsJson.targetDepthMm must be positive" },
          { status: 400 },
        );
      }
      result = await generateFaceToolpath({
        toolDiameterMm: tool.diameterMm,
        feedMmMin: op.feedMmMin,
        spindleRpm: op.spindleRpm,
        safeZMm,
        stockTopZMm,
        stepoverRatio: params.stepoverRatio as number | undefined,
        stepdownMm: op.stepdownMm ?? undefined,
        targetDepthMm,
        bounds,
        direction: (params.direction as "x" | "y") ?? "x",
      });
    } else if (op.kind === "drill") {
      const holes = params.holes as Array<{
        x: number;
        y: number;
        topZMm: number;
        depthMm: number;
        diameterMm?: number;
      }> | undefined;
      if (!Array.isArray(holes) || holes.length === 0) {
        return NextResponse.json(
          { error: "drill: paramsJson.holes (>=1) required" },
          { status: 400 },
        );
      }
      const drillResult = generateDrillToolpath({
        holes,
        toolDiameterMm: tool.diameterMm,
        feedMmMin: op.feedMmMin,
        spindleRpm: op.spindleRpm,
        safeZMm,
        peckDepthMm: params.peckDepthMm as number | undefined,
        dwellSec: params.dwellSec as number | undefined,
        optimizeOrder: (params.optimizeOrder as "none" | "nearest-neighbor") ?? "nearest-neighbor",
      });
      result = {
        polylines: drillResult.polylines,
        estimatedDurationSec: drillResult.estimatedDurationSec,
        bbox: drillResult.bbox,
        warnings: drillResult.warnings,
      };
    } else {
      return NextResponse.json(
        { error: `unknown operation kind: ${op.kind}` },
        { status: 400 },
      );
    }

    // Cache result on the operation.
    const cached = {
      polylines: result.polylines,
      estimatedDurationSec: result.estimatedDurationSec,
      bbox: result.bbox,
    };
    await db
      .update(schema.opencamOperations)
      .set({ toolpathJson: cached, updatedAt: new Date() })
      .where(eq(schema.opencamOperations.id, op.id));

    return NextResponse.json({
      operationId: op.id,
      polylines: result.polylines,
      estimatedDurationSec: result.estimatedDurationSec,
      bbox: result.bbox,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "toolpath generation failed", details: (err as Error).message },
      { status: 500 },
    );
  }
}
