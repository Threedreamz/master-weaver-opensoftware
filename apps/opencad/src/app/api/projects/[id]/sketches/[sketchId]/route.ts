export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { and, eq, isNull } from "drizzle-orm";
import { PatchSketchBody } from "@/lib/api-contracts";
import { resolveUser } from "@/lib/internal-user";

type RouteCtx = { params: Promise<{ id: string; sketchId: string }> };

async function loadOwnedSketch(projectId: string, sketchId: string, userId: string) {
  const [row] = await db
    .select({ sketch: schema.opencadSketches })
    .from(schema.opencadSketches)
    .innerJoin(schema.opencadProjects, eq(schema.opencadSketches.projectId, schema.opencadProjects.id))
    .where(
      and(
        eq(schema.opencadSketches.id, sketchId),
        eq(schema.opencadSketches.projectId, projectId),
        eq(schema.opencadProjects.userId, userId),
        isNull(schema.opencadProjects.deletedAt),
      ),
    )
    .limit(1);
  return row?.sketch ?? null;
}

function serializeSketch(row: typeof schema.opencadSketches.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    planeRef: row.planeRef,
    entitiesJson: row.entitiesJson ?? [],
    constraintsJson: row.constraintsJson ?? [],
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

/* PATCH /api/projects/[id]/sketches/[sketchId] */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const { id: projectId, sketchId } = await ctx.params;

  const existing = await loadOwnedSketch(projectId, sketchId, u.id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = PatchSketchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.planeRef !== undefined) patch.planeRef = parsed.data.planeRef;
  if (parsed.data.entitiesJson !== undefined) patch.entitiesJson = parsed.data.entitiesJson;
  if (parsed.data.constraintsJson !== undefined) patch.constraintsJson = parsed.data.constraintsJson;

  const [updated] = await db
    .update(schema.opencadSketches)
    .set(patch)
    .where(eq(schema.opencadSketches.id, sketchId))
    .returning();

  await db
    .update(schema.opencadProjects)
    .set({ updatedAt: new Date() })
    .where(eq(schema.opencadProjects.id, projectId));

  return NextResponse.json(serializeSketch(updated));
}

/* DELETE /api/projects/[id]/sketches/[sketchId] */
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const { id: projectId, sketchId } = await ctx.params;

  const existing = await loadOwnedSketch(projectId, sketchId, u.id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.delete(schema.opencadSketches).where(eq(schema.opencadSketches.id, sketchId));

  await db
    .update(schema.opencadProjects)
    .set({ updatedAt: new Date() })
    .where(eq(schema.opencadProjects.id, projectId));

  return NextResponse.json({ ok: true, id: sketchId });
}
