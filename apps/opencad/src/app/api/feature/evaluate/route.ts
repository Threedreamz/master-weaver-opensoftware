export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/feature/evaluate
 *
 * Stateful re-evaluation of a project's feature tree. Ownership is verified
 * before `evaluateTree` touches the kernel — the kernel happily evaluates
 * anything the DB hands it, so the HTTP layer is the only place we can
 * enforce "caller owns this projectId".
 *
 * Auth: session. 401 if missing, 404 if project is not owned / soft-deleted.
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { FeatureEvaluateBody } from "@/lib/api-contracts";
import { evaluateTree } from "@/lib/feature-timeline";
import { resolveUser } from "@/lib/internal-user";

export async function POST(req: NextRequest) {
  const u = await resolveUser(req);
  if (u instanceof NextResponse) return u;
  const userId = u.id;

  const json = await req.json().catch(() => null);
  const parsed = FeatureEvaluateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const project = await db.query.opencadProjects.findFirst({
    where: and(
      eq(schema.opencadProjects.id, body.projectId),
      eq(schema.opencadProjects.userId, userId),
      isNull(schema.opencadProjects.deletedAt),
    ),
  });
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const result = await evaluateTree(body.projectId, {
      fromFeatureId: body.fromFeatureId,
      parameterOverrides: body.parameterOverrides,
      dryRun: body.dryRun,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[opencad] feature evaluate failed:", msg);
    return NextResponse.json({ error: "internal", details: msg }, { status: 500 });
  }
}
