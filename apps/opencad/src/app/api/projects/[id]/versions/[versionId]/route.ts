export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { db, schema } from "@/db";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { resolveUser } from "@/lib/internal-user";

type RouteCtx = { params: Promise<{ id: string; versionId: string }> };

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

type VersionRow = typeof schema.opencadProjectVersions.$inferSelect;

async function loadVersion(projectId: string, versionId: string): Promise<VersionRow | null> {
  const [row] = await db
    .select()
    .from(schema.opencadProjectVersions)
    .where(
      and(
        eq(schema.opencadProjectVersions.id, versionId),
        eq(schema.opencadProjectVersions.projectId, projectId),
        isNull(schema.opencadProjectVersions.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

function serializeVersion(v: VersionRow, userId: string) {
  const raw = JSON.stringify(v.featureTreeJson ?? {});
  const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return {
    id: v.id,
    projectId: v.projectId,
    version: v.version,
    label: v.label ?? `v${v.version}`,
    createdAt: new Date(v.createdAt).toISOString(),
    createdBy: userId,
    parentVersionId: v.parentVersionId ?? null,
    featureTreeHash: hash,
    sizeBytes: Buffer.byteLength(raw, "utf8"),
    featureTreeJson: v.featureTreeJson ?? {},
  };
}

/* GET /api/projects/[id]/versions/[versionId] — fetch single version */
export async function GET(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;
  const { id, versionId } = await ctx.params;

  if (!(await assertProjectOwned(id, userId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const v = await loadVersion(id, versionId);
  if (!v) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(serializeVersion(v, userId));
}

/* POST /api/projects/[id]/versions/[versionId] — action=revert */
export async function POST(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;
  const { id, versionId } = await ctx.params;

  if (!(await assertProjectOwned(id, userId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const json = (await req.json().catch(() => null)) as { action?: string } | null;
  if (!json || json.action !== "revert") {
    return NextResponse.json(
      { error: "invalid_body", details: { action: "expected 'revert'" } },
      { status: 400 },
    );
  }

  const target = await loadVersion(id, versionId);
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const tree = (target.featureTreeJson ?? {}) as { features?: Array<Record<string, unknown>> };
  const snapshotFeatures = Array.isArray(tree.features) ? tree.features : [];

  // Fetch current head version number to auto-label the revert snapshot.
  const [head] = await db
    .select()
    .from(schema.opencadProjectVersions)
    .where(eq(schema.opencadProjectVersions.projectId, id))
    .orderBy(desc(schema.opencadProjectVersions.version))
    .limit(1);
  const nextVersion = (head?.version ?? 0) + 1;

  // Snapshot the CURRENT live features first so the revert is reversible.
  const currentFeatures = await db
    .select()
    .from(schema.opencadFeatures)
    .where(eq(schema.opencadFeatures.projectId, id))
    .orderBy(asc(schema.opencadFeatures.order));

  const [revertSnapshot] = await db
    .insert(schema.opencadProjectVersions)
    .values({
      projectId: id,
      version: nextVersion,
      parentVersionId: head?.id ?? null,
      label: `Revert from v${target.version}`,
      featureTreeJson: { features: currentFeatures },
    })
    .returning();

  // Replace live features with the target snapshot's features. Do it as a
  // transaction so a mid-flight failure leaves the DB consistent.
  db.transaction((tx) => {
    tx.delete(schema.opencadFeatures)
      .where(eq(schema.opencadFeatures.projectId, id))
      .run();

    for (const [idx, f] of snapshotFeatures.entries()) {
      const row = f as Record<string, unknown>;
      tx.insert(schema.opencadFeatures)
        .values({
          // Regenerate id so reverting doesn't collide with a still-live row
          // (even though we just deleted, keeping ids stable would tie history
          // references to rows that may now hold different params).
          projectId: id,
          kind: (row.kind ?? "box") as typeof schema.opencadFeatures.$inferInsert.kind,
          paramsJson:
            (row.paramsJson as Record<string, unknown> | undefined) ??
            (row.params_json as Record<string, unknown> | undefined) ??
            {},
          parentIds:
            (row.parentIds as string[] | undefined) ??
            (row.parent_ids as string[] | undefined) ??
            [],
          order: typeof row.order === "number" ? row.order : idx,
          outputGeometryHash:
            (row.outputGeometryHash as string | null | undefined) ??
            (row.output_geometry_hash as string | null | undefined) ??
            null,
        })
        .run();
    }
  });

  await db
    .update(schema.opencadProjects)
    .set({ updatedAt: new Date() })
    .where(eq(schema.opencadProjects.id, id));

  return NextResponse.json({
    ok: true,
    newVersionId: revertSnapshot.id,
    revertedFromVersionId: target.id,
    revertedFromVersion: target.version,
    featureCount: snapshotFeatures.length,
  });
}

/* DELETE /api/projects/[id]/versions/[versionId] — soft delete */
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;
  const { id, versionId } = await ctx.params;

  if (!(await assertProjectOwned(id, userId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = await db
    .update(schema.opencadProjectVersions)
    .set({ deletedAt: sql`(unixepoch())` as unknown as Date })
    .where(
      and(
        eq(schema.opencadProjectVersions.id, versionId),
        eq(schema.opencadProjectVersions.projectId, id),
        isNull(schema.opencadProjectVersions.deletedAt),
      ),
    )
    .returning({ id: schema.opencadProjectVersions.id });

  if (result.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: versionId });
}
