export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { resolveUser } from "@/lib/internal-user";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { ToolPatchBody } from "@/lib/api-contracts";

type RouteCtx = { params: Promise<{ id: string }> };

function serializeTool(row: typeof schema.opencamTools.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    diameterMm: row.diameterMm,
    fluteCount: row.fluteCount,
    lengthMm: row.lengthMm,
    material: row.material ?? undefined,
    shopId: row.shopId ?? undefined,
  };
}

/* PATCH /api/tools/[id] */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;
  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = ToolPatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) patch[k] = v;
  }

  const [updated] = await db
    .update(schema.opencamTools)
    .set(patch)
    .where(
      and(
        eq(schema.opencamTools.id, id),
        eq(schema.opencamTools.userId, userId),
      ),
    )
    .returning();

  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(serializeTool(updated));
}

/* DELETE /api/tools/[id] */
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;
  const { id } = await ctx.params;

  const deleted = await db
    .delete(schema.opencamTools)
    .where(
      and(
        eq(schema.opencamTools.id, id),
        eq(schema.opencamTools.userId, userId),
      ),
    )
    .returning({ id: schema.opencamTools.id });

  if (deleted.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
