export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { CreateVersionBody } from "@/lib/api-contracts";

type RouteCtx = { params: Promise<{ id: string }> };

async function assertProjectOwned(projectId: string, userId: string) {
  const [row] = await db
    .select({ id: schema.opencadProjects.id })
    .from(schema.opencadProjects)
    .where(
      and(
        eq(schema.opencadProjects.id, projectId),
        eq(schema.opencadProjects.userId, userId),
        isNull(schema.opencadProjects.deletedAt),
      ),
    )
    .limit(1);
  return !!row;
}

function toSummary(v: typeof schema.opencadProjectVersions.$inferSelect, userId: string, sizeBytes: number) {
  const raw = JSON.stringify(v.featureTreeJson ?? {});
  const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return {
    id: v.id,
    projectId: v.projectId,
    label: v.label ?? `v${v.version}`,
    createdAt: new Date(v.createdAt).toISOString(),
    createdBy: userId,
    parentVersionId: v.parentVersionId ?? null,
    featureTreeHash: hash,
    sizeBytes,
  };
}

/* GET /api/projects/[id]/versions — list all versions ordered ASC */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  if (!(await assertProjectOwned(id, userId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(schema.opencadProjectVersions)
    .where(eq(schema.opencadProjectVersions.projectId, id))
    .orderBy(asc(schema.opencadProjectVersions.version));

  const items = rows.map((r) => {
    const raw = JSON.stringify(r.featureTreeJson ?? {});
    return toSummary(r, userId, Buffer.byteLength(raw, "utf8"));
  });

  return NextResponse.json({ items });
}

/* POST /api/projects/[id]/versions — snapshot current feature tree as new version */
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id } = await ctx.params;

  if (!(await assertProjectOwned(id, userId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = CreateVersionBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { label } = parsed.data;

  // Current head version (max version)
  const [head] = await db
    .select()
    .from(schema.opencadProjectVersions)
    .where(eq(schema.opencadProjectVersions.projectId, id))
    .orderBy(desc(schema.opencadProjectVersions.version))
    .limit(1);

  const nextVersion = (head?.version ?? 0) + 1;

  // Snapshot current features
  const features = await db
    .select()
    .from(schema.opencadFeatures)
    .where(eq(schema.opencadFeatures.projectId, id))
    .orderBy(asc(schema.opencadFeatures.order));

  const featureTreeJson = { features };

  const [inserted] = await db
    .insert(schema.opencadProjectVersions)
    .values({
      projectId: id,
      version: nextVersion,
      parentVersionId: head?.id ?? null,
      label,
      featureTreeJson,
    })
    .returning();

  const sizeBytes = Buffer.byteLength(JSON.stringify(featureTreeJson), "utf8");
  return NextResponse.json(toSummary(inserted, userId, sizeBytes), { status: 201 });
}
