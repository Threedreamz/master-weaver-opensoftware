export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { PatchProjectBody } from "@/lib/api-contracts";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadProjectDetail(projectId: string, userId: string) {
  const [row] = await db
    .select()
    .from(schema.opencadProjects)
    .where(
      and(
        eq(schema.opencadProjects.id, projectId),
        eq(schema.opencadProjects.userId, userId),
        isNull(schema.opencadProjects.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return null;

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.opencadFeatures)
    .where(eq(schema.opencadFeatures.projectId, projectId));

  const [latest] = await db
    .select({ id: schema.opencadProjectVersions.id, thumb: schema.opencadProjectVersions.thumbnailUrl })
    .from(schema.opencadProjectVersions)
    .where(eq(schema.opencadProjectVersions.projectId, projectId))
    .orderBy(desc(schema.opencadProjectVersions.version))
    .limit(1);

  return {
    id: row.id,
    name: row.name,
    ownerId: row.userId,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    thumbnailUrl: latest?.thumb ?? null,
    currentVersionId: latest?.id ?? null,
    featureCount: Number(count ?? 0),
    description: row.description ?? null,
    units: "mm" as const,
    featureTreeRootId: latest?.id ?? "root",
    bbox: null,
  };
}

/* GET /api/projects/[id] */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const detail = await loadProjectDetail(id, userId);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(detail);
}

/* PATCH /api/projects/[id] */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = PatchProjectBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;

  const result = await db
    .update(schema.opencadProjects)
    .set(patch)
    .where(
      and(
        eq(schema.opencadProjects.id, id),
        eq(schema.opencadProjects.userId, userId),
        isNull(schema.opencadProjects.deletedAt),
      ),
    )
    .returning({ id: schema.opencadProjects.id });

  if (result.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const detail = await loadProjectDetail(id, userId);
  if (!detail) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(detail);
}

/* DELETE /api/projects/[id] — soft delete */
export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  const result = await db
    .update(schema.opencadProjects)
    .set({ deletedAt: sql`(unixepoch())` as unknown as Date })
    .where(
      and(
        eq(schema.opencadProjects.id, id),
        eq(schema.opencadProjects.userId, userId),
        isNull(schema.opencadProjects.deletedAt),
      ),
    )
    .returning({ id: schema.opencadProjects.id });

  if (result.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, id });
}
