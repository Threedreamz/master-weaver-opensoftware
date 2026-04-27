export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { resolveUser } from "@/lib/internal-user";
import { db, schema } from "@/db";
import { and, eq, isNull } from "drizzle-orm";
import { PatchOperationBody } from "@/lib/api-contracts";

type RouteCtx = { params: Promise<{ id: string }> };

function serializeOperation(row: typeof schema.opencamOperations.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    kind: row.kind,
    toolId: row.toolId ?? "",
    feedMmMin: row.feedMmMin,
    spindleRpm: row.spindleRpm,
    stepoverMm: row.stepoverMm ?? undefined,
    stepdownMm: row.stepdownMm ?? undefined,
    paramsJson: (row.paramsJson ?? {}) as Record<string, unknown>,
    sortOrder: row.sortOrder,
  };
}

async function loadOwnedOperation(opId: string, userId: string) {
  const [joined] = await db
    .select({ op: schema.opencamOperations, project: schema.opencamProjects })
    .from(schema.opencamOperations)
    .innerJoin(
      schema.opencamProjects,
      eq(schema.opencamProjects.id, schema.opencamOperations.projectId),
    )
    .where(
      and(
        eq(schema.opencamOperations.id, opId),
        eq(schema.opencamProjects.userId, userId),
        isNull(schema.opencamProjects.deletedAt),
      ),
    )
    .limit(1);
  return joined ?? null;
}

/* PATCH /api/operations/[id] */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;
  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = PatchOperationBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const owned = await loadOwnedOperation(id, userId);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.kind !== undefined) patch.kind = parsed.data.kind;
  if (parsed.data.toolId !== undefined) patch.toolId = parsed.data.toolId;
  if (parsed.data.feedMmMin !== undefined) patch.feedMmMin = parsed.data.feedMmMin;
  if (parsed.data.spindleRpm !== undefined) patch.spindleRpm = parsed.data.spindleRpm;
  if (parsed.data.stepoverMm !== undefined) patch.stepoverMm = parsed.data.stepoverMm;
  if (parsed.data.stepdownMm !== undefined) patch.stepdownMm = parsed.data.stepdownMm;
  if (parsed.data.paramsJson !== undefined) {
    patch.paramsJson = parsed.data.paramsJson;
    patch.toolpathJson = null; // invalidate cached toolpath on param change
  }

  const [updated] = await db
    .update(schema.opencamOperations)
    .set(patch)
    .where(eq(schema.opencamOperations.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(serializeOperation(updated));
}

/* DELETE /api/operations/[id] */
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;
  const { id } = await ctx.params;

  const owned = await loadOwnedOperation(id, userId);
  if (!owned) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db
    .delete(schema.opencamOperations)
    .where(eq(schema.opencamOperations.id, id));

  return NextResponse.json({ ok: true });
}
