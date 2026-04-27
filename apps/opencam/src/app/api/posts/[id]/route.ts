export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { resolveUser } from "@/lib/internal-user";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { PostPatchBody } from "@/lib/api-contracts";

type RouteCtx = { params: Promise<{ id: string }> };

function serializePost(row: typeof schema.opencamPosts.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    dialect: row.dialect,
    templateGcode: row.templateGcode,
    builtIn: row.builtIn,
  };
}

/* PATCH /api/posts/[id] */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;
  const { id } = await ctx.params;

  const [existing] = await db
    .select()
    .from(schema.opencamPosts)
    .where(eq(schema.opencamPosts.id, id))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.builtIn) {
    return NextResponse.json({ error: "cannot modify built-in post" }, { status: 403 });
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = PostPatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = {};
  for (const k of ["name", "dialect", "templateGcode"] as const) {
    const v = parsed.data[k];
    if (v !== undefined) patch[k] = v;
  }

  const [updated] = await db
    .update(schema.opencamPosts)
    .set(patch)
    .where(
      and(
        eq(schema.opencamPosts.id, id),
        eq(schema.opencamPosts.userId, userId),
      ),
    )
    .returning();

  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(serializePost(updated));
}

/* DELETE /api/posts/[id] */
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;
  const { id } = await ctx.params;

  const [existing] = await db
    .select()
    .from(schema.opencamPosts)
    .where(eq(schema.opencamPosts.id, id))
    .limit(1);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.builtIn) {
    return NextResponse.json({ error: "cannot modify built-in post" }, { status: 403 });
  }
  if (existing.userId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await db
    .delete(schema.opencamPosts)
    .where(
      and(
        eq(schema.opencamPosts.id, id),
        eq(schema.opencamPosts.userId, userId),
      ),
    );

  return NextResponse.json({ ok: true });
}
