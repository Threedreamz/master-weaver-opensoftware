export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { and, eq, isNull } from "drizzle-orm";
import { PatchFeatureBody } from "@/lib/api-contracts";
import { resolveUser } from "@/lib/internal-user";

type RouteCtx = { params: Promise<{ id: string; featureId: string }> };

async function loadOwnedFeature(projectId: string, featureId: string, userId: string) {
  const [row] = await db
    .select({
      feature: schema.opencadFeatures,
    })
    .from(schema.opencadFeatures)
    .innerJoin(schema.opencadProjects, eq(schema.opencadFeatures.projectId, schema.opencadProjects.id))
    .where(
      and(
        eq(schema.opencadFeatures.id, featureId),
        eq(schema.opencadFeatures.projectId, projectId),
        eq(schema.opencadProjects.userId, userId),
        isNull(schema.opencadProjects.deletedAt),
      ),
    )
    .limit(1);
  return row?.feature ?? null;
}

function serializeFeature(row: typeof schema.opencadFeatures.$inferSelect) {
  return {
    id: row.id,
    projectId: row.projectId,
    kind: row.kind,
    paramsJson: row.paramsJson ?? {},
    parentIds: row.parentIds ?? [],
    order: row.order,
    outputGeometryHash: row.outputGeometryHash ?? null,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

/* PATCH /api/projects/[id]/features/[featureId] */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const { id: projectId, featureId } = await ctx.params;

  const existing = await loadOwnedFeature(projectId, featureId, u.id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = PatchFeatureBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.paramsJson !== undefined) patch.paramsJson = parsed.data.paramsJson;
  if (parsed.data.parentIds !== undefined) patch.parentIds = parsed.data.parentIds;
  if (parsed.data.order !== undefined) patch.order = parsed.data.order;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(serializeFeature(existing));
  }

  // Only invalidate the cached geometry hash when the inputs that actually
  // drive the kernel change — `paramsJson` or `parentIds`. Pure `order`
  // reorderings don't alter the solid, so keep the cache intact and avoid
  // an unnecessary re-evaluation on the next read.
  if (
    parsed.data.paramsJson !== undefined ||
    parsed.data.parentIds !== undefined
  ) {
    patch.outputGeometryHash = null;
  }

  const [updated] = await db
    .update(schema.opencadFeatures)
    .set(patch)
    .where(eq(schema.opencadFeatures.id, featureId))
    .returning();

  await db
    .update(schema.opencadProjects)
    .set({ updatedAt: new Date() })
    .where(eq(schema.opencadProjects.id, projectId));

  return NextResponse.json(serializeFeature(updated));
}

/* DELETE /api/projects/[id]/features/[featureId] */
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const { id: projectId, featureId } = await ctx.params;

  const existing = await loadOwnedFeature(projectId, featureId, u.id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.delete(schema.opencadFeatures).where(eq(schema.opencadFeatures.id, featureId));

  await db
    .update(schema.opencadProjects)
    .set({ updatedAt: new Date() })
    .where(eq(schema.opencadProjects.id, projectId));

  return NextResponse.json({ ok: true, id: featureId });
}
